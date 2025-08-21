/**
 * Simple blob storage client
 * Replaces 1000+ lines of complexity with 30 lines
 * No fallbacks, no caching, no legacy paths - just works
 */

const BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL || 
  'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';

/**
 * Generate blob URL for a book's text file
 */
export function getBlobUrl(bookSlug: string, filename: string): string {
  // All text content is stored at /books/${bookSlug}/text/${filename}
  // This matches where sync-translations.ts uploads the files
  return `${BASE_URL}/books/${bookSlug}/text/${filename}`;
}

/**
 * Fetch text content from blob storage
 */
export async function fetchBookText(bookSlug: string, filename: string): Promise<string> {
  const url = getBlobUrl(bookSlug, filename);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to load ${bookSlug}/${filename}: ${response.status}`);
  }
  
  return response.text();
}