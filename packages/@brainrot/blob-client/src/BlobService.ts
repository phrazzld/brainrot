import {
  HeadBlobResult,
  ListBlobResultBlob,
  PutBlobResult,
  del,
  head,
  list,
  put,
} from '@vercel/blob';
import * as crypto from 'crypto';
import * as fs from 'fs';
import pRetry from 'p-retry';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export type BlobAccess = 'public';

export interface UploadOptions {
  pathname?: string;
  filename?: string;
  access?: BlobAccess;
  addRandomSuffix?: boolean;
  contentType?: string;
  retries?: number;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface BlobUploadResult extends PutBlobResult {
  checksum?: string;
}

/**
 * BlobService provides a unified API for interacting with Vercel Blob storage.
 * Enhanced with retry logic, checksum verification, and progress reporting.
 */
export class BlobService {
  private readonly defaultRetries = 3;
  private readonly checksumCache = new Map<string, string>();

  /**
   * Calculate MD5 checksum for a file or string
   */
  private async calculateChecksum(content: string | Buffer | File): Promise<string> {
    const hash = crypto.createHash('md5');
    
    if (content instanceof File) {
      const buffer = await content.arrayBuffer();
      hash.update(Buffer.from(buffer));
    } else if (typeof content === 'string') {
      hash.update(content, 'utf8');
    } else {
      hash.update(content);
    }
    
    return hash.digest('hex');
  }

  /**
   * Check if a file needs to be uploaded based on checksum
   */
  public async needsUpload(url: string, content: string | Buffer | File): Promise<boolean> {
    try {
      const newChecksum = await this.calculateChecksum(content);
      const cachedChecksum = this.checksumCache.get(url);
      
      if (cachedChecksum && cachedChecksum === newChecksum) {
        return false;
      }

      // Try to get existing file metadata
      const existingFile = await this.getFileInfo(url);
      if (existingFile && existingFile.size > 0) {
        // If checksums match, no need to upload
        const existingChecksum = existingFile.contentDisposition?.match(/checksum=([a-f0-9]+)/)?.[1];
        if (existingChecksum === newChecksum) {
          this.checksumCache.set(url, newChecksum);
          return false;
        }
      }
    } catch (error) {
      // File doesn't exist, needs upload
      return true;
    }
    
    return true;
  }

  /**
   * Upload a file to Blob storage with retry logic
   * @param file The file to upload
   * @param options Upload options
   * @returns Promise resolving to the uploaded blob information
   */
  public async uploadFile(file: File, options: UploadOptions = {}): Promise<BlobUploadResult> {
    const retries = options.retries ?? this.defaultRetries;
    
    return pRetry(
      async () => {
        try {
          const filename = options.filename || file.name;
          const pathname = options.pathname || '';

          // Create full path
          const fullPath = pathname ? `${pathname.replace(/\/+$/, '')}/${filename}` : filename;

          // Calculate checksum
          const checksum = await this.calculateChecksum(file);

          // Upload to Vercel Blob
          const result = await put(fullPath, file, {
            access: options.access || 'public',
            addRandomSuffix: options.addRandomSuffix,
            contentType: options.contentType,
          });

          // Cache the checksum
          this.checksumCache.set(result.url, checksum);

          // Report progress if callback provided
          if (options.onProgress) {
            options.onProgress({
              loaded: file.size,
              total: file.size,
              percent: 100,
            });
          }

          return { ...result, checksum };
        } catch (error: unknown) {
          console.error('Error uploading file to Blob storage:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to upload file: ${errorMessage}`);
        }
      },
      {
        retries,
        onFailedAttempt: (error) => {
          console.log(`Upload attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        },
      }
    );
  }

  /**
   * Upload text content to Blob storage with retry logic
   * @param content The text content to upload
   * @param path The path where to store the content
   * @param options Upload options
   * @returns Promise resolving to the uploaded blob information
   */
  public async uploadText(
    content: string,
    path: string,
    options: Omit<UploadOptions, 'pathname' | 'filename'> & { skipUnchanged?: boolean } = {},
  ): Promise<BlobUploadResult> {
    const retries = options.retries ?? this.defaultRetries;
    
    return pRetry(
      async () => {
        try {
          // Calculate checksum
          const checksum = await this.calculateChecksum(content);
          
          // Check if upload is needed
          const blobUrl = this.getUrlForPath(path);
          const needsUpload = await this.needsUpload(blobUrl, content);
          
          if (!needsUpload) {
            console.log(`Skipping upload for ${path} - content unchanged`);
            return {
              url: blobUrl,
              pathname: path,
              contentType: options.contentType || 'text/plain',
              contentDisposition: `attachment; filename="${path.split('/').pop()}"; checksum=${checksum}`,
              checksum,
            } as BlobUploadResult;
          }

          // Create a Blob from the text content
          const blob = new Blob([content], {
            type: options.contentType || 'text/plain',
          });

          // Convert to File object
          const file = new File([blob], path.split('/').pop() || 'file.txt', {
            type: options.contentType || 'text/plain',
          });

          // Get the directory path
          const pathname = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

          // Upload the file
          return await this.uploadFile(file, {
            ...options,
            pathname,
            filename: path.split('/').pop(),
          });
        } catch (error: unknown) {
          console.error('Error uploading text to Blob storage:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to upload text: ${errorMessage}`);
        }
      },
      {
        retries,
        onFailedAttempt: (error) => {
          console.log(`Text upload attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        },
      }
    );
  }

  /**
   * Upload a text file from disk with retry logic
   * @param filePath Local file path
   * @param remotePath Remote path in blob storage
   * @param options Upload options
   * @returns Promise resolving to the uploaded blob information
   */
  public async uploadTextFile(
    filePath: string,
    remotePath: string,
    options: Omit<UploadOptions, 'pathname' | 'filename'> = {},
  ): Promise<BlobUploadResult> {
    try {
      const content = await readFile(filePath, 'utf8');
      return await this.uploadText(content, remotePath, options);
    } catch (error: unknown) {
      console.error('Error reading file for upload:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read file ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * List files in Blob storage
   * @param options List options
   * @returns Promise resolving to a list of blobs
   */
  public async listFiles(options: ListOptions = {}): Promise<{
    blobs: ListBlobResultBlob[];
    cursor?: string;
  }> {
    try {
      return await list({
        prefix: options.prefix,
        limit: options.limit,
        cursor: options.cursor,
      });
    } catch (error: unknown) {
      console.error('Error listing files from Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list files: ${errorMessage}`);
    }
  }

  /**
   * Get file information from Blob storage
   * @param url The URL of the file
   * @returns Promise resolving to file information
   */
  public async getFileInfo(url: string): Promise<HeadBlobResult> {
    try {
      return await head(url);
    } catch (error: unknown) {
      console.error('Error getting file info from Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get file info: ${errorMessage}`);
    }
  }

  /**
   * Delete a file from Blob storage
   * @param url The URL of the file to delete
   * @returns Promise that resolves when the file is deleted
   */
  public async deleteFile(url: string): Promise<void> {
    try {
      await del(url);
      // Remove from checksum cache
      this.checksumCache.delete(url);
    } catch (error: unknown) {
      console.error('Error deleting file from Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete file: ${errorMessage}`);
    }
  }

  /**
   * Delete multiple files from Blob storage
   * @param urls Array of URLs to delete
   * @returns Promise that resolves when all files are deleted
   */
  public async deleteFiles(urls: string[]): Promise<void> {
    try {
      await del(urls);
      // Remove from checksum cache
      urls.forEach(url => this.checksumCache.delete(url));
    } catch (error: unknown) {
      console.error('Error deleting files from Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete files: ${errorMessage}`);
    }
  }

  /**
   * Generate a full URL for a blob path within Blob storage
   * This is useful when you need to reference a file that will be uploaded in the future
   * @param path The path of the file
   * @param options Optional configuration for URL generation
   * @returns The full URL to the file (this assumes public access)
   */
  public getUrlForPath(path: string, options?: { baseUrl?: string; noCache?: boolean }): string {
    // Use provided base URL, environment variable, or default
    let hostname =
      options?.baseUrl ||
      process.env.NEXT_PUBLIC_BLOB_BASE_URL ||
      'https://public.blob.vercel-storage.com';

    // Fix for the hostname discrepancy during verification
    // When we have a generic https://public.blob.vercel-storage.com URL, use the correct one from env
    if (
      hostname === 'https://public.blob.vercel-storage.com' &&
      process.env.NEXT_PUBLIC_BLOB_BASE_URL
    ) {
      hostname = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
    }

    // Clean up the path and ensure it doesn't start with a slash
    const cleanPath = path.replace(/^\/+/, '');

    // Generate the URL
    const url = `${hostname}/${cleanPath}`;

    // Add cache busting if requested
    if (options?.noCache) {
      const cacheBuster = `_t=${Date.now()}`;
      return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    }

    return url;
  }

  /**
   * Fetch text content from a Blob URL
   * @param url The URL of the text file to fetch
   * @returns Promise resolving to the text content
   */
  public async fetchText(url: string): Promise<string> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.text();
    } catch (error: unknown) {
      console.error('Error fetching text from Blob URL:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch text: ${errorMessage}`);
    }
  }
}

// Export a singleton instance
export const blobService = new BlobService();