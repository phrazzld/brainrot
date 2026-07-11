import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const webRoot = join(process.cwd(), 'apps', 'web');
const productionRoots = [
  join(webRoot, 'utils', 'simple-blob.ts'),
  join(webRoot, 'app', 'api', 'download'),
  join(webRoot, 'translations', 'books'),
  join(webRoot, 'next.config.ts'),
];

function readProductionSources(path: string): string {
  if (!path.endsWith('.ts') && !path.endsWith('.tsx')) {
    return readdirSync(path, { withFileTypes: true })
      .map((entry) => readProductionSources(join(path, entry.name)))
      .join('\n');
  }
  return readFileSync(path, 'utf8');
}

describe('DigitalOcean Spaces asset authority', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds reader text URLs from NEXT_PUBLIC_SPACES_BASE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SPACES_BASE_URL', 'https://assets.example.test/root/');
    const { getBlobUrl } = await import('./simple-blob');

    expect(getBlobUrl('the-iliad', 'book-01.txt')).toBe(
      'https://assets.example.test/root/books/the-iliad/text/book-01.txt',
    );
  });

  it('contains no retired-provider production read authority', () => {
    const productionSource = productionRoots.map(readProductionSources).join('\n');

    expect(productionSource).not.toContain('vercel-storage.com');
    expect(productionSource).not.toContain('NEXT_PUBLIC_BLOB_BASE_URL');
  });
});
