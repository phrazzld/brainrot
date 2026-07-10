import { NextRequest } from 'next/server';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/download Spaces authority', () => {
  beforeEach(() => {
    vi.stubEnv(
      'NEXT_PUBLIC_SPACES_BASE_URL',
      'https://brainrot-publishing.nyc3.digitaloceanspaces.com',
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns the direct Spaces chapter URL without a legacy service', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest(
        'https://brainrotpublishing.com/api/download?slug=the-iliad&type=chapter&chapter=1',
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      url: 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/assets/audio/the-iliad/chapter-01.mp3',
      shouldProxy: false,
    });
  });

  it('streams a proxied chapter only from Spaces with download headers', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://brainrot-publishing.nyc3.digitaloceanspaces.com/assets/audio/the-iliad/chapter-01.mp3',
      );
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
          'content-length': '3',
        },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest(
        'https://brainrotpublishing.com/api/download?slug=the-iliad&type=chapter&chapter=1&proxy=true',
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="the-iliad-chapter-1.mp3"',
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' });
  });

  it('rejects proxy URLs outside the authoritative Spaces origin', async () => {
    const { assertSpacesAssetUrl } = await import('./asset-origin');

    expect(() => assertSpacesAssetUrl('https://example.test/private')).toThrow(
      'Refusing to proxy an asset outside the authoritative Spaces origin',
    );
  });

  it('rejects a hostile configured proxy origin before fetch', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPACES_BASE_URL', 'https://example.test/private');
    vi.resetModules();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest(
        'https://brainrotpublishing.com/api/download?slug=the-iliad&type=chapter&chapter=1&proxy=true',
      ),
    );

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
