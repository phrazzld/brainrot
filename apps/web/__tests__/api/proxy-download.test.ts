import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest';

import { createSuccessResponse } from '@/__mocks__/MockResponse';
import { proxyAssetDownload } from '@/app/api/download/proxyService';
import { AssetError, AssetErrorType, AssetService, AssetType } from '@/types/assets';
import { createRequestLogger } from '@/utils/logger';

// Define the mock NextResponse
const __mockNextResponse = {
  json: (data: Record<string, unknown>, options?: { status?: number; headers?: Headers }) => ({
    status: options?.status || 200,
    json: async () => data,
    headers: options?.headers || {},
  }),
};

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createRequestLogger: vi.fn().mockImplementation(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  })),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock the TimeoutError class
vi.mock('node-fetch', () => {
  class MockTimeoutError extends Error {
    constructor(url: string, timeoutMs: number) {
      super(`Request to ${url} timed out after ${timeoutMs}ms`);
      this.name = 'TimeoutError';
    }
  }
  return { TimeoutError: MockTimeoutError };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortController
global.AbortController = class MockAbortController {
  signal: AbortSignal = {
    aborted: false,
    reason: undefined,
    onabort: null,
    throwIfAborted: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  } as unknown as AbortSignal;

  abort = vi.fn(() => {
    // Use type assertion with a more specific type
    (this.signal as unknown as { aborted: boolean }).aborted = true;
    (this.signal as unknown as { reason: Error }).reason = new DOMException(
      'The operation was aborted',
      'AbortError',
    );
  });
} as unknown as typeof AbortController;

// Mock setTimeout
vi.spyOn(global, 'setTimeout').mockImplementation((_fn) => {
  // Don't actually call the timeout function to avoid unexpected aborts
  return 123 as unknown as NodeJS.Timeout;
});

// Mock clearTimeout
vi.spyOn(global, 'clearTimeout').mockImplementation(() => {});

// Mock response creation helper function
const createMockResponseObject = (status = 200, statusText = 'OK', headers = {}) =>
  createSuccessResponse('', {
    status,
    statusText,
    headers,
  });

// Mock NextResponse
vi.mock('next/server', () => {
  // Create a function that meets the requirements of NextResponse
  const mockResponseFunction = jest
    .fn()
    .mockImplementation((body: ReadableStream | null, init?: ResponseInit) => ({
      ...createMockResponseObject(init?.status, init?.statusText, init?.headers),
      body,
    }));

  // Add the required static json method to the function object
  const jsonMethod = vi.fn().mockImplementation((data: unknown, options?: ResponseInit) => ({
    ...createMockResponseObject(options?.status, options?.statusText, options?.headers),
    json: async () => data,
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    body: null,
  }));

  // Create the NextResponse object with both function behavior and json method
  const NextResponse = Object.assign(mockResponseFunction, { json: jsonMethod });

  return { NextResponse };
});

// Helper to create mock headers
function createMockHeaders(headersObj: Record<string, string> = {}): Headers {
  const headers = new Headers();
  Object.entries(headersObj).forEach(([key, value]) => {
    headers.append(key, value);
  });
  return headers;
}

// Helper to create mock readable stream
function createMockStream(): ReadableStream {
  const mockReader = {
    read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
    releaseLock: vi.fn(),
    closed: Promise.resolve(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  };

  // Create initial stream properties with proper typing
  const mockStream: Partial<ReadableStream> & {
    getReader: ReturnType<typeof vi.fn>;
    pipeTo: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    pipeThrough?: ReturnType<typeof vi.fn>;
    tee?: ReturnType<typeof vi.fn>;
    locked: boolean;
  } = {
    getReader: vi.fn().mockReturnValue(mockReader),
    pipeTo: vi.fn().mockReturnValue(Promise.resolve()),
    cancel: vi.fn().mockReturnValue(Promise.resolve()),
    locked: false,
  };

  // Add methods that reference the mockStream itself
  mockStream.pipeThrough = vi.fn().mockReturnValue(mockStream);
  mockStream.tee = vi.fn().mockReturnValue([mockStream, mockStream]);

  return mockStream as unknown as ReadableStream;
}

// Mock AssetService implementation
class MockAssetService implements AssetService {
  private shouldFail: boolean;
  private errorType: AssetErrorType;

  constructor(options: { shouldFail?: boolean; errorType?: AssetErrorType } = {}) {
    this.shouldFail = options.shouldFail || false;
    this.errorType = options.errorType || AssetErrorType.NOT_FOUND;
  }

  async getAssetUrl(assetType: AssetType, bookSlug: string, assetName: string): Promise<string> {
    if (this.shouldFail) {
      throw new AssetError('Failed to get asset URL', this.errorType, 'getAssetUrl', {
        assetPath: `assets/${assetType}/${bookSlug}/${assetName}`,
      });
    }
    return `https://public.blob.vercel-storage.com/assets/${assetType}/${bookSlug}/${assetName}`;
  }

  // Implement other required methods but with no-op functionality
  assetExists = vi.fn().mockResolvedValue(true);
  fetchAsset = vi.fn();
  fetchTextAsset = vi.fn();
  uploadAsset = vi.fn();
  deleteAsset = vi.fn();
  listAssets = vi.fn();
}

describe('Proxy Download Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fetch mock to a default success response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createMockHeaders({
        'content-type': 'audio/mpeg',
        'content-length': '1000000',
      }),
      body: createMockStream(),
    });
  });

  // Helper functions for test setup and assertions
  function createDownloadConfig(
    overrides: {
      assetServiceOptions?: { shouldFail?: boolean; errorType?: AssetErrorType };
      filename?: string;
      [key: string]: unknown;
    } = {},
  ) {
    const logger = createRequestLogger('test-correlation-id');
    const assetService = new MockAssetService(overrides.assetServiceOptions);

    return {
      assetType: AssetType.AUDIO,
      bookSlug: 'test-book',
      assetName: 'chapter-01.mp3',
      filename: 'test-book-chapter-01.mp3',
      log: logger,
      assetService,
      requestParams: { test: 'param' },
      ...overrides,
    };
  }

  function mockSuccessfulFetch(
    options: { headers?: Record<string, string>; extraProps?: Record<string, unknown> } = {},
  ) {
    const mockResponse = createSuccessResponse('', {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'audio/mpeg',
        'content-length': '1000000',
        ...(options.headers || {}),
      },
    });

    // Add a custom body if provided
    if (options.extraProps?.body) {
      Object.defineProperty(mockResponse, 'body', {
        value: options.extraProps.body,
        writable: false,
      });
    } else {
      Object.defineProperty(mockResponse, 'body', {
        value: createMockStream(),
        writable: false,
      });
    }

    // Add any other custom properties
    if (options.extraProps) {
      Object.entries(options.extraProps)
        .filter(([key]) => key !== 'body')
        .forEach(([key, value]) => {
          Object.defineProperty(mockResponse, key, {
            value,
            writable: false,
          });
        });
    }

    mockFetch.mockResolvedValue(mockResponse);
  }

  function mockFailedFetch(
    status = 403,
    statusText = 'Forbidden',
    contentType = 'application/json',
  ) {
    const errorBody = JSON.stringify({ error: 'Access denied' });
    // Create an error response with the custom content type
    const mockResponse = createSuccessResponse(errorBody, {
      status,
      statusText,
      headers: {
        'content-type': contentType,
      },
    });

    // Add stream body
    Object.defineProperty(mockResponse, 'body', {
      value: createMockStream(),
      writable: false,
    });

    mockFetch.mockResolvedValue(mockResponse);
  }

  describe('proxyAssetDownload', () => {
    it('should successfully proxy an asset download', async () => {
      // Setup test conditions
      mockSuccessfulFetch();
      const config = createDownloadConfig();

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify the response
      expect(response).toBeDefined();
      expect(response.status).toBe(200);

      // Verify that fetch was called properly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://public.blob.vercel-storage.com/assets/audio/test-book/chapter-01.mp3',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: '*/*',
          }),
          signal: expect.anything(),
        }),
      );
    });

    it('should handle AssetService errors', async () => {
      // Setup test with failing asset service
      const config = createDownloadConfig({
        assetServiceOptions: {
          shouldFail: true,
          errorType: AssetErrorType.NOT_FOUND,
        },
      });

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify 404 response
      expect(response).toBeDefined();
      expect(response.status).toBe(404);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle unauthorized access errors from AssetService', async () => {
      // Setup test with unauthorized error
      const config = createDownloadConfig({
        assetServiceOptions: {
          shouldFail: true,
          errorType: AssetErrorType.UNAUTHORIZED,
        },
      });

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify 401 response
      expect(response).toBeDefined();
      expect(response.status).toBe(401);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      // Setup test with network error
      mockFetch.mockRejectedValue(new Error('Network error'));
      const config = createDownloadConfig();

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify 502 response
      expect(response).toBeDefined();
      expect(response.status).toBe(502);
    });

    it('should handle non-OK fetch responses', async () => {
      // Setup test with error response
      mockFailedFetch();
      const config = createDownloadConfig();

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify error response
      expect(response).toBeDefined();
      expect(response.status).toBe(502); // Bad Gateway
    });

    it('should set proper download headers', async () => {
      // Setup NextResponse mock specifically for this test
      const mockNextResponse = require('next/server').NextResponse;
      mockNextResponse.mockImplementationOnce(
        (body: ReadableStream | null, init: ResponseInit) => ({
          status: init?.status || 200,
          headers: init?.headers || {},
          body,
        }),
      );

      // Setup successful fetch with specific headers
      mockSuccessfulFetch({
        headers: {
          'content-type': 'audio/mpeg',
          'content-length': '5000000',
        },
      });

      // Use a custom filename
      const config = createDownloadConfig({ filename: 'custom-download-name.mp3' });

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify response
      expect(response).toBeDefined();
      expect(response.status).toBe(200);

      // Verify NextResponse was called correctly
      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 200,
          headers: expect.any(Object),
        }),
      );
    });
  });
});
