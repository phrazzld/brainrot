/**
 * BlobPathService - Path generation for blob storage
 * 
 * Generates standardized paths for different types of assets in the blob storage.
 * This is a simplified version focused on the core blob storage needs.
 */

export type AssetType = 'text' | 'images' | 'audio' | 'epub' | 'pdf';

export class BlobPathService {
  /**
   * Get the base path for a book's assets
   */
  public getBookBasePath(bookSlug: string): string {
    return `books/${bookSlug}`;
  }

  /**
   * Generate a path for text files
   * @param bookSlug Book identifier
   * @param filename Text file name (e.g., "brainrot-chapter-1.txt")
   */
  public getTextPath(bookSlug: string, filename: string): string {
    return `${this.getBookBasePath(bookSlug)}/text/${filename}`;
  }

  /**
   * Generate a path for brainrot text files
   * @param bookSlug Book identifier
   * @param chapter Chapter identifier (number, "introduction", or "fulltext")
   */
  public getBrainrotTextPath(bookSlug: string, chapter: string | number): string {
    if (chapter === 'fulltext') {
      return this.getTextPath(bookSlug, 'brainrot-fulltext.txt');
    }
    
    const chapterName = typeof chapter === 'number' 
      ? `chapter-${chapter}`
      : chapter.toLowerCase().replace(/\s+/g, '-');
    
    return this.getTextPath(bookSlug, `brainrot-${chapterName}.txt`);
  }

  /**
   * Generate a path for source text files
   * @param bookSlug Book identifier
   * @param filename Source text file name
   */
  public getSourceTextPath(bookSlug: string, filename: string): string {
    return this.getTextPath(bookSlug, filename);
  }

  /**
   * Generate a path for book images
   * @param bookSlug Book identifier
   * @param filename Image file name
   */
  public getImagePath(bookSlug: string, filename: string): string {
    return `${this.getBookBasePath(bookSlug)}/images/${filename}`;
  }

  /**
   * Generate a path for book covers
   * @param bookSlug Book identifier
   * @param format Cover format (e.g., "paperback", "hardcover", "ebook")
   */
  public getCoverPath(bookSlug: string, format: string = 'ebook'): string {
    return this.getImagePath(bookSlug, `cover-${format}.jpg`);
  }

  /**
   * Generate a path for audio files
   * @param bookSlug Book identifier
   * @param chapter Chapter number or "full" for full audiobook
   */
  public getAudioPath(bookSlug: string, chapter: string | number): string {
    const filename = chapter === 'full' 
      ? 'full-audiobook.mp3'
      : `chapter-${chapter}.mp3`;
    
    return `${this.getBookBasePath(bookSlug)}/audio/${filename}`;
  }

  /**
   * Generate a path for EPUB files
   * @param bookSlug Book identifier
   * @param variant Optional variant (e.g., "brainrot", "original")
   */
  public getEpubPath(bookSlug: string, variant: string = 'brainrot'): string {
    return `${this.getBookBasePath(bookSlug)}/epub/${bookSlug}-${variant}.epub`;
  }

  /**
   * Generate a path for PDF files
   * @param bookSlug Book identifier
   * @param format PDF format (e.g., "paperback", "hardcover", "digital")
   */
  public getPdfPath(bookSlug: string, format: string = 'digital'): string {
    return `${this.getBookBasePath(bookSlug)}/pdf/${bookSlug}-${format}.pdf`;
  }

  /**
   * Generate a path for shared images (not book-specific)
   * @param filename Image file name
   */
  public getSharedImagePath(filename: string): string {
    return `images/${filename}`;
  }

  /**
   * Generate a path for site assets
   * @param filename Asset file name
   */
  public getSiteAssetPath(filename: string): string {
    return `site-assets/${filename}`;
  }

  /**
   * Get the book slug from a blob path
   * @param path The blob storage path
   * @returns The book slug or null if not a book path
   */
  public getBookSlugFromPath(path: string): string | null {
    const match = path.match(/^books\/([^/]+)\//);
    return match ? match[1] : null;
  }

  /**
   * Get the asset type from a blob path
   * @param path The blob storage path
   * @returns The asset type or null
   */
  public getAssetTypeFromPath(path: string): AssetType | null {
    const match = path.match(/^books\/[^/]+\/([^/]+)\//);
    if (!match) return null;
    
    const type = match[1];
    if (['text', 'images', 'audio', 'epub', 'pdf'].includes(type)) {
      return type as AssetType;
    }
    
    return null;
  }

  /**
   * Normalize a path to ensure consistency
   * @param path The path to normalize
   * @returns Normalized path without leading/trailing slashes
   */
  public normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  /**
   * Check if a path is for a book asset
   * @param path The path to check
   * @returns True if the path is for a book asset
   */
  public isBookAssetPath(path: string): boolean {
    return path.startsWith('books/');
  }

  /**
   * Check if a path is for a shared asset
   * @param path The path to check
   * @returns True if the path is for a shared asset
   */
  public isSharedAssetPath(path: string): boolean {
    return path.startsWith('images/') || path.startsWith('site-assets/');
  }
}

// Export a singleton instance
export const blobPathService = new BlobPathService();