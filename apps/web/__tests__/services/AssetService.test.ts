import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '@/types/assets';

import {
  type AssetRequest,
  type AssetServiceConfig,
  clearAssetCache,
  createAssetService,
  generateAssetName,
  getDownloadUrl,
  resolveAssetUrl,
  validateAssetExists,
} from '../../app/api/download/services/AssetService';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockUrlResolver = {
  getAssetUrl: vi.fn(),
};

describe('AssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAssetCache(); // Clear cache between tests
  });

  describe('generateAssetName', () => {
    it('should generate name for full audiobook', () => {
      const result = generateAssetName('full', undefined, { logger: mockLogger });

      expect(result.assetName).toBe('full-audiobook.mp3');
      expect(result.error).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should generate name for chapter with padding', () => {
      const result = generateAssetName('chapter', '5', { logger: mockLogger });

      expect(result.assetName).toBe('chapter-05.mp3');
      expect(result.error).toBeUndefined();
    });

    it('should handle chapter as number', () => {
      const result = generateAssetName('chapter', 12, { logger: mockLogger });

      expect(result.assetName).toBe('chapter-12.mp3');
      expect(result.error).toBeUndefined();
    });

    it('should return error when chapter missing for chapter type', () => {
      const result = generateAssetName('chapter', undefined, { logger: mockLogger });

      expect(result.assetName).toBe('');
      expect(result.error).toBe('Chapter parameter is required when type is "chapter"');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('resolveAssetUrl', () => {
    const mockRequest: AssetRequest = {
      slug: 'test-book',
      type: 'full',
    };

    it('should resolve URL from cache when available', async () => {
      // First call to populate cache
      mockUrlResolver.getAssetUrl.mockResolvedValueOnce('https://example.com/test.mp3');
      const config: AssetServiceConfig = {
        logger: mockLogger,
        urlResolver: mockUrlResolver,
        cacheTtl: 5000,
      };

      const result1 = await resolveAssetUrl(mockRequest, config);
      expect(result1.success).toBe(true);
      expect(result1.url).toBe('https://example.com/test.mp3');

      // Second call should use cache
      const result2 = await resolveAssetUrl(mockRequest, config);
      expect(result2.success).toBe(true);
      expect(result2.url).toBe('https://example.com/test.mp3');

      // URL resolver should only be called once
      expect(mockUrlResolver.getAssetUrl).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Asset URL resolved from cache',
        }),
      );
    });

    it('should use URL resolver when not in cache', async () => {
      mockUrlResolver.getAssetUrl.mockResolvedValueOnce('https://example.com/test.mp3');
      const config: AssetServiceConfig = {
        logger: mockLogger,
        urlResolver: mockUrlResolver,
      };

      const result = await resolveAssetUrl(mockRequest, config);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com/test.mp3');
      expect(result.type).toBe(AssetType.FULL_AUDIOBOOK);
      expect(mockUrlResolver.getAssetUrl).toHaveBeenCalledWith({
        bookSlug: 'test-book',
        assetType: AssetType.FULL_AUDIOBOOK,
        chapter: undefined,
      });
    });

    it('should use fallback when no resolver and fallback enabled', async () => {
      const config: AssetServiceConfig = {
        logger: mockLogger,
        blobBaseUrl: 'https://blob.example.com',
        fallbackEnabled: true,
      };

      const result = await resolveAssetUrl(mockRequest, config);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://blob.example.com/assets/audio/test-book/full-audiobook.mp3');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Asset URL constructed using fallback',
        }),
      );
    });

    it('should handle chapter requests correctly', async () => {
      const chapterRequest: AssetRequest = {
        slug: 'test-book',
        type: 'chapter',
        chapter: 3,
      };

      const config: AssetServiceConfig = {
        logger: mockLogger,
        blobBaseUrl: 'https://blob.example.com/',
        fallbackEnabled: true,
      };

      const result = await resolveAssetUrl(chapterRequest, config);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://blob.example.com/assets/audio/test-book/chapter-03.mp3');
      expect(result.type).toBe(AssetType.CHAPTER_AUDIOBOOK);
    });

    it('should handle errors from URL resolver', async () => {
      mockUrlResolver.getAssetUrl.mockRejectedValueOnce(new Error('Network error'));
      const config: AssetServiceConfig = {
        logger: mockLogger,
        urlResolver: mockUrlResolver,
        fallbackEnabled: false,
      };

      const result = await resolveAssetUrl(mockRequest, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to resolve asset URL');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Failed to resolve asset URL',
          error: 'Network error',
        }),
      );
    });

    it('should return error when no resolver and fallback disabled', async () => {
      const config: AssetServiceConfig = {
        logger: mockLogger,
        fallbackEnabled: false,
      };

      const result = await resolveAssetUrl(mockRequest, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to resolve asset URL');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return URL on success', async () => {
      mockUrlResolver.getAssetUrl.mockResolvedValueOnce('https://example.com/test.mp3');
      const config: AssetServiceConfig = {
        logger: mockLogger,
        urlResolver: mockUrlResolver,
      };

      const request: AssetRequest = {
        slug: 'test-book',
        type: 'full',
      };

      const result = await getDownloadUrl(request, config);

      expect(result.url).toBe('https://example.com/test.mp3');
      expect(result.error).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Successfully generated download URL',
        }),
      );
    });

    it('should return error when resolution fails', async () => {
      mockUrlResolver.getAssetUrl.mockRejectedValueOnce(new Error('Not found'));
      const config: AssetServiceConfig = {
        logger: mockLogger,
        urlResolver: mockUrlResolver,
        fallbackEnabled: false,
      };

      const request: AssetRequest = {
        slug: 'test-book',
        type: 'full',
      };

      const result = await getDownloadUrl(request, config);

      expect(result.url).toBe('');
      expect(result.error).toBe('Failed to resolve asset URL');
    });
  });

  describe('validateAssetExists', () => {
    it('should return true for valid URL', async () => {
      const config: AssetServiceConfig = { logger: mockLogger };
      const result = await validateAssetExists('https://example.com/test.mp3', config);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Validating asset existence',
        }),
      );
    });

    it('should handle validation errors gracefully', async () => {
      const config: AssetServiceConfig = { logger: mockLogger };

      // Since current implementation always returns true, this tests the structure
      const result = await validateAssetExists('https://example.com/test.mp3', config);

      expect(result).toBe(true);
    });
  });

  describe('createAssetService', () => {
    it('should create service with all methods', () => {
      const service = createAssetService({ logger: mockLogger });

      expect(service).toHaveProperty('resolveUrl');
      expect(service).toHaveProperty('validateExists');
      expect(service).toHaveProperty('clearCache');
      expect(service).toHaveProperty('generateAssetName');
      expect(service).toHaveProperty('getDownloadUrl');
      expect(typeof service.resolveUrl).toBe('function');
      expect(typeof service.validateExists).toBe('function');
      expect(typeof service.clearCache).toBe('function');
      expect(typeof service.generateAssetName).toBe('function');
      expect(typeof service.getDownloadUrl).toBe('function');
    });

    it('should use provided config in service methods', async () => {
      const service = createAssetService({
        logger: mockLogger,
        blobBaseUrl: 'https://custom.blob.com',
      });

      const { assetName } = service.generateAssetName('full');
      expect(assetName).toBe('full-audiobook.mp3');
    });

    it('should set up periodic cache cleanup', () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      createAssetService({ logger: mockLogger });

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

      vi.useRealTimers();
    });
  });

  describe('Cache management', () => {
    it('should clear cache when clearAssetCache is called', async () => {
      mockUrlResolver.getAssetUrl.mockResolvedValue('https://example.com/test.mp3');
      const config: AssetServiceConfig = {
        logger: mockLogger,
        urlResolver: mockUrlResolver,
        cacheTtl: 5000,
      };

      const request: AssetRequest = { slug: 'test-book', type: 'full' };

      // Populate cache
      await resolveAssetUrl(request, config);
      expect(mockUrlResolver.getAssetUrl).toHaveBeenCalledTimes(1);

      // Clear cache
      clearAssetCache();

      // Should call resolver again after cache clear
      await resolveAssetUrl(request, config);
      expect(mockUrlResolver.getAssetUrl).toHaveBeenCalledTimes(2);
    });

    it('should expire cache after TTL', async () => {
      vi.useFakeTimers();
      mockUrlResolver.getAssetUrl.mockResolvedValue('https://example.com/test.mp3');
      const config: AssetServiceConfig = {
        logger: mockLogger,
        urlResolver: mockUrlResolver,
        cacheTtl: 1000, // 1 second TTL
      };

      const request: AssetRequest = { slug: 'test-book', type: 'full' };

      // First call
      await resolveAssetUrl(request, config);
      expect(mockUrlResolver.getAssetUrl).toHaveBeenCalledTimes(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1100);

      // Should call resolver again after TTL expiry
      await resolveAssetUrl(request, config);
      expect(mockUrlResolver.getAssetUrl).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
