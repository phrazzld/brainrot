import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '@/types/assets';
import { logger } from '@/utils/logger';

import { proxyAssetDownload } from './ProxyService';

describe('proxyAssetDownload Spaces boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects a resolver outside Spaces before fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxyAssetDownload({
      assetType: AssetType.AUDIO,
      bookSlug: 'the-iliad',
      assetName: 'chapter-01.mp3',
      filename: 'the-iliad-chapter-1.mp3',
      log: logger,
      assetService: {
        getAssetUrl: async () => 'https://example.test/private',
      },
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
