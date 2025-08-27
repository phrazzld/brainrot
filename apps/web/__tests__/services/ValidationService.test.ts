import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  createValidationService,
  validateDownloadParams,
  validateParameter,
  type DownloadParams,
  type ValidationServiceConfig,
  type ValidatedDownloadParams
} from '../../app/api/download/services/ValidationService';

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('ValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateDownloadParams', () => {
    describe('slug validation', () => {
      it('should validate valid slug', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'full',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.slug).toBe('test-book');
        expect(result.errors).toBeUndefined();
      });

      it('should reject missing slug', () => {
        const params: DownloadParams = {
          type: 'full',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'slug',
          message: 'Missing required parameter: slug',
          code: 'MISSING_SLUG',
        });
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            msg: 'Missing required parameter',
            param: 'slug',
          })
        );
      });

      it('should reject invalid slug format', () => {
        const params: DownloadParams = {
          slug: 'invalid slug!',
          type: 'full',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'slug',
          message: 'Invalid slug format',
          code: 'INVALID_SLUG',
          value: 'invalid slug!',
        });
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            msg: 'Invalid slug format',
            param: 'slug',
            value: 'invalid slug!',
          })
        );
      });

      it('should accept custom slug pattern', () => {
        const params: DownloadParams = {
          slug: 'book_123',
          type: 'full',
        };

        const config: ValidationServiceConfig = {
          logger: mockLogger,
          slugPattern: /^[a-zA-Z0-9_]+$/,
        };

        const result = validateDownloadParams(params, config);

        expect(result.success).toBe(true);
        expect(result.data?.slug).toBe('book_123');
      });
    });

    describe('type validation', () => {
      it('should validate valid type "full"', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'full',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.type).toBe('full');
      });

      it('should validate valid type "chapter"', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'chapter',
          chapter: '1',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.type).toBe('chapter');
      });

      it('should reject missing type', () => {
        const params: DownloadParams = {
          slug: 'test-book',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'type',
          message: 'Missing required parameter: type',
          code: 'MISSING_TYPE',
        });
      });

      it('should reject invalid type', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'invalid',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'type',
          message: 'Invalid type. Must be one of: full, chapter',
          code: 'INVALID_TYPE',
          value: 'invalid',
        });
      });

      it('should accept custom valid types', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'preview',
        };

        const config: ValidationServiceConfig = {
          logger: mockLogger,
          validTypes: ['full', 'chapter', 'preview'],
        };

        const result = validateDownloadParams(params, config);

        expect(result.success).toBe(true);
        expect(result.data?.type).toBe('preview' as any);
      });
    });

    describe('chapter validation', () => {
      it('should validate valid chapter number', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'chapter',
          chapter: '5',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.chapter).toBe(5);
      });

      it('should require chapter when type is chapter', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'chapter',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'chapter',
          message: 'Missing required parameter: chapter (required when type is "chapter")',
          code: 'MISSING_CHAPTER',
        });
      });

      it('should reject invalid chapter number', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'chapter',
          chapter: 'abc',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'chapter',
          message: 'Invalid chapter number. Must be between 1 and 999',
          code: 'INVALID_CHAPTER',
          value: 'abc',
        });
      });

      it('should reject chapter number out of range', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'chapter',
          chapter: '0',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'chapter',
          message: 'Invalid chapter number. Must be between 1 and 999',
          code: 'INVALID_CHAPTER',
          value: '0',
        });
      });

      it('should respect custom max chapter', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'chapter',
          chapter: '50',
        };

        const config: ValidationServiceConfig = {
          logger: mockLogger,
          maxChapter: 30,
        };

        const result = validateDownloadParams(params, config);

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'chapter',
          message: 'Invalid chapter number. Must be between 1 and 30',
          code: 'INVALID_CHAPTER',
          value: '50',
        });
      });

      it('should not require chapter for full type', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'full',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.chapter).toBeUndefined();
      });
    });

    describe('proxy parameter', () => {
      it('should handle proxy parameter', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'full',
          proxy: 'true',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.isProxy).toBe(true);
      });

      it('should default proxy to false', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'full',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.isProxy).toBe(false);
      });

      it('should handle proxy as false string', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'full',
          proxy: 'false',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data?.isProxy).toBe(false);
      });
    });

    describe('multiple validation errors', () => {
      it('should return all validation errors', () => {
        const params: DownloadParams = {
          // Missing slug
          type: 'invalid', // Invalid type
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'MISSING_SLUG' })
        );
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'INVALID_TYPE' })
        );
      });
    });

    describe('successful validation', () => {
      it('should return validated params for full download', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'full',
          proxy: 'true',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          slug: 'test-book',
          type: 'full',
          isProxy: true,
        });
        expect(result.errors).toBeUndefined();
      });

      it('should return validated params for chapter download', () => {
        const params: DownloadParams = {
          slug: 'test-book',
          type: 'chapter',
          chapter: '15',
          proxy: 'false',
        };

        const result = validateDownloadParams(params, { logger: mockLogger });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          slug: 'test-book',
          type: 'chapter',
          chapter: 15,
          isProxy: false,
        });
      });
    });
  });

  describe('validateParameter', () => {
    it('should validate parameter successfully', () => {
      const result = validateParameter(
        'email',
        'user@example.com',
        (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        'Invalid email format'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('user@example.com');
      expect(result.errors).toBeUndefined();
    });

    it('should return error for invalid parameter', () => {
      const result = validateParameter(
        'email',
        'invalid-email',
        (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        'Invalid email format'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([{
        field: 'email',
        message: 'Invalid email format',
        value: 'invalid-email',
      }]);
    });

    it('should work with different validators', () => {
      const numberValidator = (val: any) => typeof val === 'number' && val > 0;
      
      const result1 = validateParameter(
        'age',
        25,
        numberValidator,
        'Age must be a positive number'
      );
      expect(result1.success).toBe(true);

      const result2 = validateParameter(
        'age',
        -5,
        numberValidator,
        'Age must be a positive number'
      );
      expect(result2.success).toBe(false);
    });
  });

  describe('createValidationService', () => {
    it('should create service with all methods', () => {
      const service = createValidationService({ logger: mockLogger });

      expect(service).toHaveProperty('validateDownloadParams');
      expect(service).toHaveProperty('validateParameter');
      expect(typeof service.validateDownloadParams).toBe('function');
      expect(typeof service.validateParameter).toBe('function');
    });

    it('should use provided config in validateDownloadParams', () => {
      const config: ValidationServiceConfig = {
        logger: mockLogger,
        validTypes: ['full', 'preview'],
        maxChapter: 50,
        slugPattern: /^[a-z0-9]+$/,
      };

      const service = createValidationService(config);
      
      // Test that config is used
      const result1 = service.validateDownloadParams({
        slug: 'testbook',
        type: 'preview',
      });
      expect(result1.success).toBe(true);

      const result2 = service.validateDownloadParams({
        slug: 'Test-Book', // Has uppercase and dash, should fail with custom pattern
        type: 'full',
      });
      expect(result2.success).toBe(false);

      const result3 = service.validateDownloadParams({
        slug: 'testbook',
        type: 'chapter',
        chapter: '100', // Over custom max of 50
      });
      expect(result3.success).toBe(false);
    });

    it('should bind validateParameter correctly', () => {
      const service = createValidationService({ logger: mockLogger });
      
      const result = service.validateParameter(
        'test',
        'value',
        (val) => val === 'value',
        'Must be "value"'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('value');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty params object', () => {
      const params: DownloadParams = {};
      const result = validateDownloadParams(params, { logger: mockLogger });

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle very long chapter numbers', () => {
      const params: DownloadParams = {
        slug: 'test-book',
        type: 'chapter',
        chapter: '999999999999',
      };

      const result = validateDownloadParams(params, { logger: mockLogger });

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_CHAPTER' })
      );
    });

    it('should handle special characters in slug', () => {
      const params: DownloadParams = {
        slug: 'book-with-123-numbers',
        type: 'full',
      };

      const result = validateDownloadParams(params, { logger: mockLogger });

      expect(result.success).toBe(true);
      expect(result.data?.slug).toBe('book-with-123-numbers');
    });
  });
});