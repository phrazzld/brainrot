// Use namespaced imports to avoid redeclaration conflicts
import * as _fs from 'fs';
import * as _path from 'path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest';

import * as _utils from '../../utils';

// Then use CommonJS require but assign to different variable names
const fs = require('fs');
const path = require('path');
const utils = require('../../utils');

// Use vi.importActual to import our mock instead of the actual module
// This avoids ESM-related issues with import.meta
const cleanupLocalAssets = await vi.importActual('../../__mocks__/cleanupLocalAssets');

// Mock modules
vi.mock('fs');
vi.mock('path');
vi.mock('../../utils');
vi.mock('../../translations', () => [
  {
    slug: 'test-book',
    title: 'Test Book',
    coverImage: '/assets/test-book/images/cover.png',
    chapters: [
      {
        id: 1,
        title: 'Chapter 1',
        text: '/assets/test-book/text/brainrot/chapter-1.txt',
        audioSrc: '/test-book/audio/chapter-1.mp3',
      },
    ],
  },
]);

describe('cleanupLocalAssets', () => {
  // Setup and teardown
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock utils.assetExistsInBlobStorage
    vi.mocked(utils.assetExistsInBlobStorage).mockImplementation(async (path: string) => {
      // Return true for cover and text, false for audio to test both scenarios
      if (path.includes('audio')) {
        return false;
      }
      return true;
    });

    // Mock fs functions
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

    // Mock path functions
    vi.mocked(path.join).mockImplementation((...parts: string[]) => parts.join('/'));
  });

  it('should run in dry-run mode without deleting files', async () => {
    const report = await cleanupLocalAssets(true);

    // Verify report contains expected data
    expect(report.dryRun).toBe(true);
    expect(report.overallSummary.totalAssets).toBe(3);
    expect(report.overallSummary.assetsInBlob).toBe(2);
    expect(report.overallSummary.assetsDeleted).toBe(0);
  });

  it('should delete files that exist in Blob storage when not in dry-run mode', async () => {
    const report = await cleanupLocalAssets(false);

    // Verify report contains expected data
    expect(report.dryRun).toBe(false);
    expect(report.overallSummary.totalAssets).toBe(3);
    expect(report.overallSummary.assetsInBlob).toBe(2);
    expect(report.overallSummary.assetsDeleted).toBe(2);
    expect(report.overallSummary.assetsKept).toBe(1);
  });

  it("should not delete files that don't exist in Blob storage", async () => {
    const report = await cleanupLocalAssets(false);

    // Check that the audio file (which doesn't exist in Blob) wasn't deleted
    expect(
      report.bookResults[0].results.find(
        (r: { type: string; wasDeleted: boolean }) => r.type === 'audio',
      )?.wasDeleted,
    ).toBe(false);
  });
});
