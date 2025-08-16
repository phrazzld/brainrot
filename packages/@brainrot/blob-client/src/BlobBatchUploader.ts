import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { promisify } from 'util';
import { BlobService, UploadOptions } from './BlobService';
import { BlobPathService } from './BlobPathService';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

export interface BatchUploadOptions extends Omit<UploadOptions, 'pathname' | 'filename'> {
  concurrency?: number;
  skipUnchanged?: boolean;
  onFileProgress?: (file: string, progress: number) => void;
  onTotalProgress?: (completed: number, total: number) => void;
}

export interface BatchUploadResult {
  uploaded: string[];
  skipped: string[];
  failed: Array<{ file: string; error: string }>;
  totalSize: number;
  duration: number;
}

export interface BookAssetUploadOptions extends BatchUploadOptions {
  bookSlug: string;
  assetTypes?: Array<'text' | 'images' | 'audio' | 'epub' | 'pdf'>;
}

/**
 * BlobBatchUploader handles bulk uploads of files to blob storage
 */
export class BlobBatchUploader {
  private readonly blobService: BlobService;
  private readonly pathService: BlobPathService;

  constructor(blobService?: BlobService, pathService?: BlobPathService) {
    this.blobService = blobService || new BlobService();
    this.pathService = pathService || new BlobPathService();
  }

  /**
   * Upload all assets for a book
   * @param localDir Local directory containing book assets
   * @param options Upload options
   */
  public async uploadBookAssets(
    localDir: string,
    options: BookAssetUploadOptions
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();
    const result: BatchUploadResult = {
      uploaded: [],
      skipped: [],
      failed: [],
      totalSize: 0,
      duration: 0,
    };

    const { bookSlug, assetTypes = ['text', 'images', 'audio', 'epub', 'pdf'] } = options;

    try {
      // Collect all files to upload
      const filesToUpload: Array<{ localPath: string; remotePath: string }> = [];

      for (const assetType of assetTypes) {
        const assetDir = path.join(localDir, assetType);
        
        // Check if directory exists
        try {
          const dirStat = await stat(assetDir);
          if (!dirStat.isDirectory()) continue;
        } catch {
          continue; // Directory doesn't exist, skip
        }

        // Read all files in the directory
        const files = await readdir(assetDir);
        
        for (const file of files) {
          const localPath = path.join(assetDir, file);
          const fileStat = await stat(localPath);
          
          if (fileStat.isFile()) {
            let remotePath: string;
            
            // Generate appropriate remote path based on asset type
            switch (assetType) {
              case 'text':
                remotePath = this.pathService.getTextPath(bookSlug, file);
                break;
              case 'images':
                remotePath = this.pathService.getImagePath(bookSlug, file);
                break;
              case 'audio':
                remotePath = this.pathService.getAudioPath(
                  bookSlug,
                  file.includes('full') ? 'full' : file.match(/\d+/)?.[0] || '1'
                );
                break;
              case 'epub':
                remotePath = this.pathService.getEpubPath(bookSlug);
                break;
              case 'pdf':
                const format = file.includes('paperback') ? 'paperback' :
                               file.includes('hardcover') ? 'hardcover' : 'digital';
                remotePath = this.pathService.getPdfPath(bookSlug, format);
                break;
              default:
                remotePath = `${this.pathService.getBookBasePath(bookSlug)}/${assetType}/${file}`;
            }
            
            filesToUpload.push({ localPath, remotePath });
            result.totalSize += fileStat.size;
          }
        }
      }

      // Upload files with concurrency limit
      const limit = pLimit(options.concurrency || 5);
      const uploadPromises = filesToUpload.map((file) =>
        limit(async () => {
          try {
            // Check if we should skip unchanged files
            if (options.skipUnchanged) {
              const content = await readFile(file.localPath);
              const needsUpload = await this.blobService.needsUpload(
                this.blobService.getUrlForPath(file.remotePath),
                content
              );
              
              if (!needsUpload) {
                result.skipped.push(file.remotePath);
                if (options.onFileProgress) {
                  options.onFileProgress(file.localPath, 100);
                }
                if (options.onTotalProgress) {
                  options.onTotalProgress(
                    result.uploaded.length + result.skipped.length,
                    filesToUpload.length
                  );
                }
                return;
              }
            }

            // Upload the file
            await this.blobService.uploadTextFile(file.localPath, file.remotePath, {
              ...options,
              onProgress: (progress) => {
                if (options.onFileProgress) {
                  options.onFileProgress(file.localPath, progress.percent);
                }
              },
            });
            
            result.uploaded.push(file.remotePath);
            
            if (options.onTotalProgress) {
              options.onTotalProgress(
                result.uploaded.length + result.skipped.length,
                filesToUpload.length
              );
            }
          } catch (error) {
            result.failed.push({
              file: file.localPath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error in batch upload:', error);
      throw error;
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Upload multiple text files in batch
   * @param files Array of file paths and their remote destinations
   * @param options Upload options
   */
  public async uploadTextFiles(
    files: Array<{ localPath: string; remotePath: string }>,
    options: BatchUploadOptions = {}
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();
    const result: BatchUploadResult = {
      uploaded: [],
      skipped: [],
      failed: [],
      totalSize: 0,
      duration: 0,
    };

    const limit = pLimit(options.concurrency || 5);
    
    const uploadPromises = files.map((file) =>
      limit(async () => {
        try {
          const fileStat = await stat(file.localPath);
          result.totalSize += fileStat.size;
          
          // Check if we should skip unchanged files
          if (options.skipUnchanged) {
            const content = await readFile(file.localPath, 'utf8');
            const needsUpload = await this.blobService.needsUpload(
              this.blobService.getUrlForPath(file.remotePath),
              content
            );
            
            if (!needsUpload) {
              result.skipped.push(file.remotePath);
              if (options.onTotalProgress) {
                options.onTotalProgress(
                  result.uploaded.length + result.skipped.length,
                  files.length
                );
              }
              return;
            }
          }

          await this.blobService.uploadTextFile(file.localPath, file.remotePath, options);
          result.uploaded.push(file.remotePath);
          
          if (options.onTotalProgress) {
            options.onTotalProgress(
              result.uploaded.length + result.skipped.length,
              files.length
            );
          }
        } catch (error) {
          result.failed.push({
            file: file.localPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    await Promise.all(uploadPromises);
    result.duration = Date.now() - startTime;
    
    return result;
  }

  /**
   * Delete old/deprecated assets from blob storage
   * @param prefix Prefix to search for files to delete
   * @param options Options for deletion
   */
  public async deleteOldAssets(
    prefix: string,
    options: {
      dryRun?: boolean;
      exclude?: RegExp[];
      olderThan?: Date;
    } = {}
  ): Promise<{ deleted: string[]; kept: string[] }> {
    const result = { deleted: [] as string[], kept: [] as string[] };
    
    try {
      // List all files with the given prefix
      let cursor: string | undefined;
      const allBlobs: string[] = [];
      
      do {
        const response = await this.blobService.listFiles({ prefix, cursor, limit: 1000 });
        response.blobs.forEach(blob => allBlobs.push(blob.url));
        cursor = response.cursor;
      } while (cursor);

      // Filter files based on criteria
      for (const url of allBlobs) {
        let shouldDelete = true;
        
        // Check exclusion patterns
        if (options.exclude) {
          for (const pattern of options.exclude) {
            if (pattern.test(url)) {
              shouldDelete = false;
              break;
            }
          }
        }
        
        // Check age if specified
        if (shouldDelete && options.olderThan) {
          try {
            const fileInfo = await this.blobService.getFileInfo(url);
            const uploadedAt = new Date(fileInfo.uploadedAt);
            if (uploadedAt > options.olderThan) {
              shouldDelete = false;
            }
          } catch {
            // Couldn't get file info, skip
            shouldDelete = false;
          }
        }
        
        if (shouldDelete) {
          result.deleted.push(url);
          if (!options.dryRun) {
            await this.blobService.deleteFile(url);
          }
        } else {
          result.kept.push(url);
        }
      }
    } catch (error) {
      console.error('Error deleting old assets:', error);
      throw error;
    }
    
    return result;
  }
}

// Export a singleton instance
export const blobBatchUploader = new BlobBatchUploader();