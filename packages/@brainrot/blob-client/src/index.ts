/**
 * @brainrot/blob-client - Vercel Blob storage client for Brainrot Publishing House
 * 
 * This package provides utilities for interacting with Vercel Blob storage,
 * including upload, download, path generation, and migration services.
 */

// Export main services
export {
  BlobService,
  blobService,
  type BlobAccess,
  type UploadOptions,
  type UploadProgress,
  type ListOptions,
  type BlobUploadResult,
} from './BlobService';

export {
  BlobPathService,
  blobPathService,
  type AssetType,
} from './BlobPathService';

export {
  BlobBatchUploader,
  blobBatchUploader,
  type BatchUploadOptions,
  type BatchUploadResult,
  type BookAssetUploadOptions,
} from './BlobBatchUploader';

export {
  BlobMigrationService,
  blobMigrationService,
  type MigrationOptions,
  type MigrationResult,
  type PathMapping,
} from './BlobMigrationService';

// Import singleton instances for re-export
import { blobService } from './BlobService';
import { blobPathService } from './BlobPathService';
import { blobBatchUploader } from './BlobBatchUploader';
import { blobMigrationService } from './BlobMigrationService';

// Re-export commonly used functions for convenience
export const uploadText = (content: string, path: string, options?: any) =>
  blobService.uploadText(content, path, options);

export const uploadTextFile = (filePath: string, remotePath: string, options?: any) =>
  blobService.uploadTextFile(filePath, remotePath, options);

export const uploadBookAssets = (localDir: string, options: any) =>
  blobBatchUploader.uploadBookAssets(localDir, options);

export const getBrainrotTextPath = (bookSlug: string, chapter: string | number) =>
  blobPathService.getBrainrotTextPath(bookSlug, chapter);

export const getTextPath = (bookSlug: string, filename: string) =>
  blobPathService.getTextPath(bookSlug, filename);

export const migrateGreatGatsbyToText = (markdownDir: string, options?: any) =>
  blobMigrationService.migrateGreatGatsbyToText(markdownDir, options);