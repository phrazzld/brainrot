import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createRequestService,
  createRequestMetadata,
  createScopedLogger,
  sanitizeUrlForLogging,
  generateOperationId,
  extractClientInfo,
  determineBrowser,
  analyzeClientInfo,
  type RequestServiceConfig
} from '../../app/api/download/services/RequestService';

// Mock NextRequest
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
}));

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('RequestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequestMetadata', () => {
    it('should extract metadata from request', () => {
      const mockRequest = {
        url: 'https://example.com/api/download?slug=test&type=full&proxy=true',
        method: 'GET',
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'user-agent': 'Mozilla/5.0',
              'referer': 'https://referrer.com',
              'origin': 'https://origin.com',
              'host': 'example.com',
            };
            return headers[key] || null;
          }),
        },
      } as unknown as NextRequest;

      const config: RequestServiceConfig = {
        logger: mockLogger,
        generateId: () => 'test-correlation-id',
        environment: 'test',
      };

      const metadata = createRequestMetadata(mockRequest, config);

      expect(metadata.correlationId).toBe('test-correlation-id');
      expect(metadata.method).toBe('GET');
      expect(metadata.pathname).toBe('/api/download');
      expect(metadata.params.slug).toBe('test');
      expect(metadata.params.type).toBe('full');
      expect(metadata.params.proxy).toBe('true');
      expect(metadata.isProxyRequest).toBe(true);
      expect(metadata.userAgent).toBe('Mozilla/5.0');
      expect(metadata.referer).toBe('https://referrer.com');
      expect(metadata.origin).toBe('https://origin.com');
      expect(metadata.host).toBe('example.com');
      expect(metadata.environment).toBe('test');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Download API request received',
          correlationId: 'test-correlation-id',
        })
      );
    });

    it('should handle missing headers gracefully', () => {
      const mockRequest = {
        url: 'https://example.com/api/download',
        method: 'GET',
        headers: {
          get: vi.fn(() => null),
        },
      } as unknown as NextRequest;

      const metadata = createRequestMetadata(mockRequest, { logger: mockLogger });

      expect(metadata.userAgent).toBeNull();
      expect(metadata.referer).toBeNull();
      expect(metadata.origin).toBeNull();
      expect(metadata.host).toBeNull();
      expect(metadata.isProxyRequest).toBe(false);
    });

    it('should use default config values', () => {
      const mockRequest = {
        url: 'https://example.com/api/download',
        method: 'POST',
        headers: {
          get: vi.fn(() => null),
        },
      } as unknown as NextRequest;

      const metadata = createRequestMetadata(mockRequest);

      expect(metadata.correlationId).toMatch(/^[0-9a-f-]+$/); // UUID pattern
      expect(metadata.method).toBe('POST');
      expect(metadata.environment).toBe(process.env.NODE_ENV || 'development');
    });
  });

  describe('createScopedLogger', () => {
    it('should create logger with correlation ID', () => {
      const logger = createScopedLogger('test-correlation-id', mockLogger);

      logger.info({ msg: 'Test message' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          msg: 'Test message',
        })
      );

      logger.error({ msg: 'Error message' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          msg: 'Error message',
        })
      );
    });

    it('should use console as default logger', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logger = createScopedLogger('test-correlation-id');

      logger.info({ msg: 'Test message' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          msg: 'Test message',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sanitizeUrlForLogging', () => {
    it('should redact sensitive parameters', () => {
      const url = 'https://example.com/api?token=secret&key=apikey&data=safe';
      const sanitized = sanitizeUrlForLogging(url);

      expect(decodeURIComponent(sanitized)).toBe('https://example.com/api?token=[REDACTED]&key=[REDACTED]&data=safe');
    });

    it('should handle multiple sensitive params', () => {
      const url = 'https://example.com/api?password=pass123&auth=bearer&secret=xyz&user=john';
      const sanitized = sanitizeUrlForLogging(url);

      expect(decodeURIComponent(sanitized)).toBe('https://example.com/api?password=[REDACTED]&auth=[REDACTED]&secret=[REDACTED]&user=john');
    });

    it('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-valid-url';
      const sanitized = sanitizeUrlForLogging(invalidUrl);

      expect(sanitized).toBe('[INVALID_URL]');
    });

    it('should preserve non-sensitive parameters', () => {
      const url = 'https://example.com/api?slug=test&type=full&proxy=true';
      const sanitized = sanitizeUrlForLogging(url);

      expect(sanitized).toBe('https://example.com/api?slug=test&type=full&proxy=true');
    });
  });

  describe('generateOperationId', () => {
    it('should generate unique operation IDs', () => {
      const id1 = generateOperationId();
      const id2 = generateOperationId();

      expect(id1).toMatch(/^px-[a-z0-9]+-[a-z0-9]{3}$/);
      expect(id2).toMatch(/^px-[a-z0-9]+-[a-z0-9]{3}$/);
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp component', () => {
      const before = Date.now();
      const id = generateOperationId();
      const after = Date.now();

      const timestampPart = id.split('-')[1];
      const timestamp = parseInt(timestampPart, 36);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('extractClientInfo', () => {
    it('should extract info from Headers object', () => {
      const headers = new Headers();
      headers.set('user-agent', 'Mozilla/5.0');
      headers.set('referer', 'https://referrer.com');
      headers.set('origin', 'https://origin.com');
      headers.set('accept', 'text/html');
      headers.set('accept-encoding', 'gzip, deflate');
      headers.set('accept-language', 'en-US');

      const clientInfo = extractClientInfo(headers);

      expect(clientInfo.userAgent).toBe('Mozilla/5.0');
      expect(clientInfo.referer).toBe('https://referrer.com');
      expect(clientInfo.origin).toBe('https://origin.com');
      expect(clientInfo.accept).toBe('text/html');
      expect(clientInfo.acceptEncoding).toBe('gzip, deflate');
      expect(clientInfo.acceptLanguage).toBe('en-US');
    });

    it('should extract info from plain object', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0',
        'referer': 'https://referrer.com',
        'origin': 'https://origin.com',
        'accept': 'application/json',
        'accept-encoding': 'gzip',
        'accept-language': 'en',
      };

      const clientInfo = extractClientInfo(headers);

      expect(clientInfo.userAgent).toBe('Mozilla/5.0');
      expect(clientInfo.referer).toBe('https://referrer.com');
      expect(clientInfo.origin).toBe('https://origin.com');
      expect(clientInfo.accept).toBe('application/json');
      expect(clientInfo.acceptEncoding).toBe('gzip');
      expect(clientInfo.acceptLanguage).toBe('en');
    });

    it('should handle missing headers with empty strings', () => {
      const headers = {};
      const clientInfo = extractClientInfo(headers);

      expect(clientInfo.userAgent).toBe('');
      expect(clientInfo.referer).toBe('');
      expect(clientInfo.origin).toBe('');
      expect(clientInfo.accept).toBe('');
      expect(clientInfo.acceptEncoding).toBe('');
      expect(clientInfo.acceptLanguage).toBe('');
    });
  });

  describe('determineBrowser', () => {
    it('should identify Chrome', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      expect(determineBrowser(userAgent)).toBe('Chrome');
    });

    it('should identify Safari', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      expect(determineBrowser(userAgent)).toBe('Safari');
    });

    it('should identify Firefox', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      expect(determineBrowser(userAgent)).toBe('Firefox');
    });

    it('should identify Edge', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      expect(determineBrowser(userAgent)).toBe('Edge');
    });

    it('should return Other for unknown browsers', () => {
      const userAgent = 'Unknown Browser 1.0';
      expect(determineBrowser(userAgent)).toBe('Other');
    });
  });

  describe('analyzeClientInfo', () => {
    it('should detect mobile iOS device', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
      };

      const { clientInfo, clientClassification } = analyzeClientInfo(headers);

      expect(clientClassification.isMobile).toBe(true);
      expect(clientClassification.isIOS).toBe(true);
      expect(clientClassification.isAndroid).toBe(false);
      expect(clientClassification.browser).toBe('Safari');
    });

    it('should detect mobile Android device', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      };

      const { clientInfo, clientClassification } = analyzeClientInfo(headers);

      expect(clientClassification.isMobile).toBe(true);
      expect(clientClassification.isIOS).toBe(false);
      expect(clientClassification.isAndroid).toBe(true);
      expect(clientClassification.browser).toBe('Chrome');
    });

    it('should detect desktop device', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };

      const { clientInfo, clientClassification } = analyzeClientInfo(headers);

      expect(clientClassification.isMobile).toBe(false);
      expect(clientClassification.isIOS).toBe(false);
      expect(clientClassification.isAndroid).toBe(false);
      expect(clientClassification.browser).toBe('Chrome');
    });

    it('should detect iPad as iOS', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      };

      const { clientClassification } = analyzeClientInfo(headers);

      expect(clientClassification.isIOS).toBe(true);
      expect(clientClassification.isMobile).toBe(false);
    });
  });

  describe('createRequestService', () => {
    it('should create service with all methods', () => {
      const service = createRequestService({ logger: mockLogger });

      expect(service).toHaveProperty('createMetadata');
      expect(service).toHaveProperty('createLogger');
      expect(service).toHaveProperty('sanitizeUrl');
      expect(service).toHaveProperty('generateOperationId');
      expect(service).toHaveProperty('extractClientInfo');
      expect(service).toHaveProperty('analyzeClientInfo');
      expect(typeof service.createMetadata).toBe('function');
      expect(typeof service.createLogger).toBe('function');
      expect(typeof service.sanitizeUrl).toBe('function');
      expect(typeof service.generateOperationId).toBe('function');
      expect(typeof service.extractClientInfo).toBe('function');
      expect(typeof service.analyzeClientInfo).toBe('function');
    });

    it('should use provided config in service methods', () => {
      const mockGenerateId = vi.fn(() => 'custom-id');
      const service = createRequestService({ 
        logger: mockLogger,
        generateId: mockGenerateId,
        environment: 'production'
      });

      const mockRequest = {
        url: 'https://example.com/api/download',
        method: 'GET',
        headers: {
          get: vi.fn(() => null),
        },
      } as unknown as NextRequest;

      const metadata = service.createMetadata(mockRequest);
      
      expect(metadata.correlationId).toBe('custom-id');
      expect(metadata.environment).toBe('production');
      expect(mockGenerateId).toHaveBeenCalled();
    });

    it('should properly bind functions to config', () => {
      const service = createRequestService({ logger: mockLogger });
      
      const logger = service.createLogger('test-id');
      logger.info({ msg: 'Test' });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-id',
          msg: 'Test'
        })
      );
    });
  });
});