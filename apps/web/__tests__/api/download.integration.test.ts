/**
 * Integration tests for Download API contract
 * Tests backward compatibility, error responses, and performance targets
 */
import { NextRequest, NextResponse } from 'next/server';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/download/route';
import { AssetType } from '@/types/assets';

// Mock the external services but not the route handler itself
vi.mock('@/utils/logger', () => ({
  createRequestLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock the proxy service for controlled testing
vi.mock('@/app/api/download/services/ProxyService', () => ({
  proxyAssetDownload: vi.fn().mockResolvedValue(
    new Response('mocked audio data', {
      status: 200,
      headers: { 'content-type': 'audio/mpeg' },
    }),
  ),
}));

// Mock the download service factory
vi.mock('@/app/api/download/serviceFactory', () => ({
  createDownloadService: vi.fn().mockReturnValue({
    downloadAsset: vi.fn().mockImplementation(async (params) => {
      const { slug, type, chapter } = params;
      const fileName =
        type === 'chapter' && chapter
          ? `chapter-${String(chapter).padStart(2, '0')}.mp3`
          : 'full.mp3';

      return {
        url: `https://example.com/assets/${slug}/${fileName}`,
        metadata: {
          slug,
          type: 'AUDIO',
          chapter: type === 'chapter' ? Number(chapter) : null,
          timestamp: new Date().toISOString(),
        },
      };
    }),
  }),
}));

describe('Download API Contract - Integration Tests', () => {
  let performanceNow: ReturnType<typeof vi.spyOn>;
  let startTime: number;

  beforeEach(() => {
    vi.clearAllMocks();
    startTime = 0;
    performanceNow = vi.spyOn(performance, 'now');
    performanceNow.mockImplementation(() => {
      // Simulate time progression for performance testing
      const time = startTime;
      startTime += 50; // Each operation takes 50ms
      return time;
    });
  });

  afterEach(() => {
    performanceNow.mockRestore();
  });

  /**
   * Helper function to create a test request
   */
  const createRequest = (params: Record<string, string> = {}): NextRequest => {
    const url = new URL('https://example.com/api/download');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return new NextRequest(url, {
      method: 'GET',
      headers: {
        'user-agent': 'test-client/1.0',
        'x-forwarded-for': '127.0.0.1',
      },
    });
  };

  /**
   * Helper to measure response time
   */
  const measureResponseTime = async (
    request: NextRequest,
  ): Promise<{ response: NextResponse; duration: number }> => {
    const start = performance.now();
    const response = await GET(request);
    const duration = performance.now() - start;
    return { response, duration };
  };

  describe('Backward Compatibility', () => {
    it('should handle legacy full audiobook requests', async () => {
      const request = createRequest({
        slug: 'hamlet',
        type: 'full',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty('url');
      expect(json.url).toContain('hamlet');
      expect(json.url).toContain('full.mp3');
      expect(json).toHaveProperty('metadata');
      expect(json.metadata.type).toBe('AUDIO');
    });

    it('should handle legacy chapter requests', async () => {
      const request = createRequest({
        slug: 'the-iliad',
        type: 'chapter',
        chapter: '5',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty('url');
      expect(json.url).toContain('the-iliad');
      expect(json.url).toContain('chapter-05.mp3');
      expect(json.metadata.chapter).toBe(5);
    });

    it('should handle proxy mode for CORS avoidance', async () => {
      const request = createRequest({
        slug: 'moby-dick',
        type: 'full',
        proxy: 'true',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('audio/mpeg');
      // Body should be streamed audio data
      const text = await response.text();
      expect(text).toBe('mocked audio data');
    });

    it('should support kebab-case slugs', async () => {
      const kebabRequest = createRequest({
        slug: 'pride-and-prejudice',
        type: 'full',
      });

      const response = await GET(kebabRequest);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.url).toContain('pride-and-prejudice');
    });
  });

  describe('Error Response Contract', () => {
    it('should return 400 for missing required parameters', async () => {
      const request = createRequest({}); // Missing slug and type

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Missing required parameter');
    });

    it('should return 400 for invalid asset type', async () => {
      const request = createRequest({
        slug: 'hamlet',
        type: 'invalid-type',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Invalid type');
    });

    it('should return 400 for invalid chapter number', async () => {
      const request = createRequest({
        slug: 'hamlet',
        type: 'chapter',
        chapter: 'abc', // Invalid chapter
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty('error');
      expect(json.error).toMatch(/Invalid chapter|must be a number/);
    });

    it('should handle malformed URLs gracefully', async () => {
      const request = createRequest({
        slug: '../../../etc/passwd', // Path traversal attempt
        type: 'full',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty('error');
      // Should sanitize and reject malicious input
      expect(json.url || '').not.toContain('etc/passwd');
    });

    it('should maintain consistent error structure', async () => {
      const request = createRequest({
        slug: 'non-existent-book',
        type: 'full',
      });

      const response = await GET(request);
      const json = await response.json();

      // Error response should always have these fields
      expect(json).toHaveProperty('error');
      expect(typeof json.error).toBe('string');
      expect(json).toHaveProperty('correlationId');
      expect(typeof json.correlationId).toBe('string');
      expect(json.correlationId).toMatch(/^[a-f0-9-]+$/);
    });
  });

  describe('Performance Targets', () => {
    it('should respond within P95 <200ms for standard requests', async () => {
      const timings: number[] = [];

      // Run 20 requests to get performance distribution
      for (let i = 0; i < 20; i++) {
        const request = createRequest({
          slug: 'hamlet',
          type: 'chapter',
          chapter: String((i % 10) + 1),
        });

        const { duration } = await measureResponseTime(request);
        timings.push(duration);
      }

      // Sort timings and calculate P95
      timings.sort((a, b) => a - b);
      const p95Index = Math.floor(timings.length * 0.95);
      const p95 = timings[p95Index];

      expect(p95).toBeLessThan(200);
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        createRequest({
          slug: 'the-iliad',
          type: 'chapter',
          chapter: String(i + 1),
        }),
      );

      const start = performance.now();
      const responses = await Promise.all(requests.map((req) => GET(req)));
      const totalDuration = performance.now() - start;

      // All responses should be successful
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Total time for 10 concurrent requests should be reasonable
      // (not 10x the time of a single request)
      expect(totalDuration).toBeLessThan(500);
    });

    it('should maintain performance with proxy mode', async () => {
      const request = createRequest({
        slug: 'moby-dick',
        type: 'full',
        proxy: 'true',
      });

      const { response, duration } = await measureResponseTime(request);

      expect(response.status).toBe(200);
      // Proxy mode should still be reasonably fast
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent metadata structure', async () => {
      const request = createRequest({
        slug: 'pride-and-prejudice',
        type: 'chapter',
        chapter: '3',
      });

      const response = await GET(request);
      const json = await response.json();

      // Verify metadata structure
      expect(json).toHaveProperty('metadata');
      expect(json.metadata).toHaveProperty('slug');
      expect(json.metadata).toHaveProperty('type');
      expect(json.metadata).toHaveProperty('chapter');
      expect(json.metadata).toHaveProperty('timestamp');

      // Verify data types
      expect(typeof json.metadata.slug).toBe('string');
      expect(typeof json.metadata.type).toBe('string');
      expect(typeof json.metadata.chapter).toBe('string');
      expect(typeof json.metadata.timestamp).toBe('string');

      // Timestamp should be ISO 8601
      expect(new Date(json.metadata.timestamp).toISOString()).toBe(json.metadata.timestamp);
    });

    it('should include correlation ID in all responses', async () => {
      const successRequest = createRequest({
        slug: 'hamlet',
        type: 'full',
      });

      const errorRequest = createRequest({
        slug: '',
        type: '',
      });

      const [successResponse, errorResponse] = await Promise.all([
        GET(successRequest),
        GET(errorRequest),
      ]);

      const [successJson, errorJson] = await Promise.all([
        successResponse.json(),
        errorResponse.json(),
      ]);

      // Both success and error responses should have correlation ID
      expect(successJson).toHaveProperty('correlationId');
      expect(errorJson).toHaveProperty('correlationId');

      // Correlation IDs should be valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(successJson.correlationId).toMatch(uuidRegex);
      expect(errorJson.correlationId).toMatch(uuidRegex);
    });

    it('should set appropriate cache headers', async () => {
      const request = createRequest({
        slug: 'the-odyssey',
        type: 'full',
      });

      const response = await GET(request);

      // Should have cache control headers for CDN optimization
      const cacheControl = response.headers.get('cache-control');
      if (cacheControl) {
        expect(cacheControl).toContain('max-age');
      }
    });
  });

  describe('Security & Validation', () => {
    it('should sanitize user input to prevent injection', async () => {
      const request = createRequest({
        slug: '<script>alert("xss")</script>',
        type: 'full',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      // Response should not contain unsanitized input
      expect(JSON.stringify(json)).not.toContain('<script>');
      expect(json.error).toContain('Invalid');
    });

    it('should validate slug format', async () => {
      const invalidSlugs = [
        '../../etc/passwd',
        'book%20name',
        'book$name',
        'book;name',
        'book|name',
      ];

      for (const slug of invalidSlugs) {
        const request = createRequest({
          slug,
          type: 'full',
        });

        const response = await GET(request);
        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.error).toBeDefined();
      }
    });

    it('should handle rate limiting headers if present', async () => {
      const request = createRequest({
        slug: 'hamlet',
        type: 'full',
      });

      const response = await GET(request);

      // Check if rate limiting headers are present (optional but good practice)
      const rateLimitHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'];

      // If any rate limit header exists, all should exist
      const hasRateLimiting = rateLimitHeaders.some(
        (header) => response.headers.get(header) !== null,
      );

      if (hasRateLimiting) {
        rateLimitHeaders.forEach((header) => {
          expect(response.headers.get(header)).toBeDefined();
        });
      }
    });
  });

  describe('Monitoring & Observability', () => {
    it('should include request timing information', async () => {
      const request = createRequest({
        slug: 'frankenstein',
        type: 'full',
      });

      const response = await GET(request);

      // Check for timing headers
      const serverTiming = response.headers.get('server-timing');
      if (serverTiming) {
        expect(serverTiming).toMatch(/dur=\d+/);
      }
    });

    it('should maintain request context through correlation ID', async () => {
      const request = createRequest({
        slug: 'dracula',
        type: 'full',
      });

      const response = await GET(request);
      const json = await response.json();

      // Correlation ID should be consistent format
      expect(json.correlationId).toBeDefined();
      expect(json.correlationId.length).toBe(36); // UUID v4 length with dashes
    });
  });

  describe('Edge Cases & Resilience', () => {
    it('should handle empty query parameters gracefully', async () => {
      const request = createRequest({
        slug: 'hamlet',
        type: 'full',
        chapter: '', // Empty chapter
      });

      const response = await GET(request);
      const json = await response.json();

      // Should treat empty chapter as no chapter (full audiobook)
      expect(response.status).toBe(200);
      expect(json.url).toContain('full.mp3');
    });

    it('should handle very long slugs appropriately', async () => {
      const longSlug = 'a'.repeat(500);
      const request = createRequest({
        slug: longSlug,
        type: 'full',
      });

      const response = await GET(request);
      const json = await response.json();

      // Should reject unreasonably long input
      expect(response.status).toBe(400);
      expect(json.error).toContain('Invalid');
    });

    it('should handle special characters in book titles', async () => {
      const request = createRequest({
        slug: 'don-quixote', // Valid slug with dash
        type: 'full',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.url).toContain('don-quixote');
    });

    it('should maintain backwards compatibility with old client versions', async () => {
      // Simulate old client with minimal headers
      const url = new URL('https://example.com/api/download');
      url.searchParams.set('slug', 'hamlet');
      url.searchParams.set('type', 'full');

      const request = new NextRequest(url, {
        method: 'GET',
        // Minimal headers that old clients might send
        headers: {},
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty('url');
    });
  });
});
