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
  // Handle different path patterns for different books
  // TODO: Standardize all to /books/${bookSlug}/text/${filename}
  
  // Books with content in /assets/${bookSlug}/text/
  if (bookSlug === 'the-iliad' || bookSlug === 'the-odyssey' || bookSlug === 'the-aeneid') {
    return `${BASE_URL}/assets/${bookSlug}/text/${filename}`;
  }
  
  // Books with content in /assets/text/${bookSlug}/brainrot-
  return `${BASE_URL}/assets/text/${bookSlug}/brainrot-${filename}`;
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