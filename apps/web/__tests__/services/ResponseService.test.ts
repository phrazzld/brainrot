import { NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ErrorDetails,
  HttpStatus,
  type ResponseMetadata,
  type ResponseServiceConfig,
  createErrorResponse,
  createRedirectResponse,
  createResponseService,
  createStreamResponse,
  createSuccessResponse,
  formatProxyError,
  getCacheHeaders,
} from '../../app/api/download/services/ResponseService';

// Mock NextResponse
class MockNextResponse {
  constructor(
    public body: any,
    public init: any,
  ) {
    this.type = 'stream';
  }
  type: string;
  static json = vi.fn((body, init) => ({ body, init, type: 'json' }));
  static redirect = vi.fn((url, init) => ({ url, init, type: 'redirect' }));
}

vi.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}));

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('ResponseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { url: 'https://example.com/test.mp3' };
      const metadata: Partial<ResponseMetadata> = {
        correlationId: 'test-id',
        processingTimeMs: 100,
      };
      const config: ResponseServiceConfig = { logger: mockLogger };

      const response = createSuccessResponse(data, metadata, config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data,
          metadata: expect.objectContaining({
            correlationId: 'test-id',
            processingTimeMs: 100,
            timestamp: expect.any(String),
          }),
        }),
        expect.objectContaining({
          status: 200,
          headers: {},
        }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Creating success response',
          correlationId: 'test-id',
        }),
      );
    });

    it('should include CORS headers when origin provided', () => {
      const config: ResponseServiceConfig = {
        logger: mockLogger,
        corsOrigin: 'https://allowed-origin.com',
      };

      createSuccessResponse({ test: 'data' }, {}, config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'Access-Control-Allow-Origin': 'https://allowed-origin.com',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        }),
      );
    });

    it('should merge default headers', () => {
      const config: ResponseServiceConfig = {
        logger: mockLogger,
        defaultHeaders: {
          'X-Custom-Header': 'value',
          'X-API-Version': 'v1',
        },
      };

      createSuccessResponse({ test: 'data' }, {}, config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'X-Custom-Header': 'value',
            'X-API-Version': 'v1',
          },
        }),
      );
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from string', () => {
      const config: ResponseServiceConfig = { logger: mockLogger };

      const response = createErrorResponse('Something went wrong', 400, 'test-id', config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            message: 'Something went wrong',
            correlationId: 'test-id',
          },
          metadata: expect.objectContaining({
            correlationId: 'test-id',
          }),
        }),
        expect.objectContaining({
          status: 400,
        }),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Creating error response',
          status: 400,
          error: 'Something went wrong',
        }),
      );
    });

    it('should create error response from Error object', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const config: ResponseServiceConfig = {
        logger: mockLogger,
        includeStackTrace: true,
      };

      createErrorResponse(error, 500, 'test-id', config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            message: 'Test error',
            details: 'Error stack trace',
            correlationId: 'test-id',
          },
        }),
        expect.objectContaining({
          status: 500,
        }),
      );
    });

    it('should exclude stack trace in production', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const config: ResponseServiceConfig = {
        logger: mockLogger,
        includeStackTrace: false,
      };

      createErrorResponse(error, 500, undefined, config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.not.objectContaining({
            details: 'Error stack trace',
          }),
        }),
        expect.any(Object),
      );
    });

    it('should handle ErrorDetails object', () => {
      const errorDetails: ErrorDetails = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'invalid' },
      };
      const config: ResponseServiceConfig = { logger: mockLogger };

      createErrorResponse(errorDetails, 422, 'test-id', config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            ...errorDetails,
            correlationId: 'test-id',
          },
        }),
        expect.objectContaining({
          status: 422,
        }),
      );
    });

    it('should use default status code', () => {
      const config: ResponseServiceConfig = { logger: mockLogger };

      createErrorResponse('Server error', undefined, undefined, config);

      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          status: 500,
        }),
      );
    });
  });

  describe('createRedirectResponse', () => {
    it('should create temporary redirect by default', () => {
      const config: ResponseServiceConfig = { logger: mockLogger };

      createRedirectResponse('https://example.com', false, config);

      expect(MockNextResponse.redirect).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          status: 302,
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Creating redirect response',
          url: 'https://example.com',
          permanent: false,
        }),
      );
    });

    it('should create permanent redirect when specified', () => {
      const config: ResponseServiceConfig = { logger: mockLogger };

      createRedirectResponse('https://example.com', true, config);

      expect(MockNextResponse.redirect).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          status: 301,
        }),
      );
    });

    it('should include headers', () => {
      const config: ResponseServiceConfig = {
        logger: mockLogger,
        defaultHeaders: { 'X-Redirect-Reason': 'moved' },
        corsOrigin: 'https://allowed.com',
      };

      createRedirectResponse('https://example.com', false, config);

      expect(MockNextResponse.redirect).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Redirect-Reason': 'moved',
            'Access-Control-Allow-Origin': 'https://allowed.com',
          }),
        }),
      );
    });
  });

  describe('createStreamResponse', () => {
    it('should create stream response with content type', () => {
      const mockStream = new ReadableStream();
      const config: ResponseServiceConfig = { logger: mockLogger };

      const response = createStreamResponse(
        mockStream,
        'audio/mpeg',
        { 'Content-Disposition': 'attachment; filename="test.mp3"' },
        config,
      );

      expect(response).toBeDefined();
      expect(response.type).toBe('stream');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Creating stream response',
          contentType: 'audio/mpeg',
          hasMetadata: true,
        }),
      );
    });

    it('should use default content type', () => {
      const mockStream = new ReadableStream();
      const config: ResponseServiceConfig = { logger: mockLogger };

      const response = createStreamResponse(mockStream, undefined, undefined, config);

      expect(response).toBeDefined();
      expect(response.type).toBe('stream');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'application/octet-stream',
        }),
      );
    });
  });

  describe('formatProxyError', () => {
    it('should format error with all details in non-production', () => {
      const error = new Error('Proxy failed');
      error.stack = 'Stack trace';
      const config: ResponseServiceConfig = { includeStackTrace: true };

      const formatted = formatProxyError(error, 'corr-id', 'op-id', config);

      expect(formatted).toEqual({
        error: 'Proxy error',
        message: 'Failed to proxy download through API',
        correlationId: 'corr-id',
        operationId: 'op-id',
        details: 'Proxy failed',
        errorType: 'Error',
        stack: 'Stack trace',
        timestamp: expect.any(String),
      });
    });

    it('should exclude details in production', () => {
      const error = new Error('Proxy failed');
      const config: ResponseServiceConfig = { includeStackTrace: false };

      const formatted = formatProxyError(error, 'corr-id', 'op-id', config);

      expect(formatted).toEqual({
        error: 'Proxy error',
        message: 'Failed to proxy download through API',
        correlationId: 'corr-id',
        operationId: 'op-id',
      });
      expect(formatted).not.toHaveProperty('details');
      expect(formatted).not.toHaveProperty('stack');
    });

    it('should handle non-Error objects', () => {
      const error = { code: 'NETWORK_ERROR', message: 'Connection failed' };
      const config: ResponseServiceConfig = { includeStackTrace: true };

      const formatted = formatProxyError(error, 'corr-id', undefined, config);

      expect(formatted).toMatchObject({
        error: 'Proxy error',
        message: 'Failed to proxy download through API',
        correlationId: 'corr-id',
        errorType: 'object',
        timestamp: expect.any(String),
      });
      expect(formatted.details).toBe(JSON.stringify(error));
      expect(formatted).not.toHaveProperty('operationId');
    });

    it('should handle string errors', () => {
      const config: ResponseServiceConfig = { includeStackTrace: true };

      const formatted = formatProxyError('Simple error', 'corr-id', 'op-id', config);

      expect(formatted.details).toBe('Simple error');
      expect(formatted.errorType).toBe('string');
    });
  });

  describe('getCacheHeaders', () => {
    it('should create basic cache headers', () => {
      const headers = getCacheHeaders();

      expect(headers).toEqual({
        'Cache-Control': 'max-age=3600',
      });
    });

    it('should include s-maxage when provided', () => {
      const headers = getCacheHeaders(7200, 3600);

      expect(headers).toEqual({
        'Cache-Control': 'max-age=7200, s-maxage=3600',
      });
    });

    it('should include must-revalidate directive', () => {
      const headers = getCacheHeaders(3600, undefined, true);

      expect(headers).toEqual({
        'Cache-Control': 'max-age=3600, must-revalidate',
      });
    });

    it('should combine all directives', () => {
      const headers = getCacheHeaders(7200, 3600, true);

      expect(headers).toEqual({
        'Cache-Control': 'max-age=7200, s-maxage=3600, must-revalidate',
      });
    });
  });

  describe('createResponseService', () => {
    it('should create service with all methods', () => {
      const service = createResponseService({ logger: mockLogger });

      expect(service).toHaveProperty('success');
      expect(service).toHaveProperty('error');
      expect(service).toHaveProperty('redirect');
      expect(service).toHaveProperty('stream');
      expect(service).toHaveProperty('formatProxyError');
      expect(service).toHaveProperty('getCacheHeaders');
      expect(service).toHaveProperty('HttpStatus');
      expect(typeof service.success).toBe('function');
      expect(typeof service.error).toBe('function');
      expect(typeof service.redirect).toBe('function');
      expect(typeof service.stream).toBe('function');
      expect(typeof service.formatProxyError).toBe('function');
      expect(typeof service.getCacheHeaders).toBe('function');
      expect(service.HttpStatus).toBe(HttpStatus);
    });

    it('should use config in all methods', () => {
      const config: ResponseServiceConfig = {
        logger: mockLogger,
        includeStackTrace: true,
        defaultHeaders: { 'X-API': 'v1' },
        corsOrigin: 'https://app.com',
      };

      const service = createResponseService(config);

      // Test success method uses config
      service.success({ data: 'test' });
      expect(MockNextResponse.json).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API': 'v1',
          }),
        }),
      );

      vi.clearAllMocks();

      // Test error method uses config
      service.error(new Error('test'), 400, 'id');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('HttpStatus constants', () => {
    it('should have correct status codes', () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.CREATED).toBe(201);
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.UNAUTHORIZED).toBe(401);
      expect(HttpStatus.FORBIDDEN).toBe(403);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HttpStatus.BAD_GATEWAY).toBe(502);
      expect(HttpStatus.SERVICE_UNAVAILABLE).toBe(503);
    });
  });
});
