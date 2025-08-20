import { DownloadService } from '@/services/downloadService.js';
// import { AssetService } from '@/types/assets.js';
import { Logger } from '@/utils/logger.js';

// import { createAssetService } from '@/utils/services/AssetServiceFactory.js'; // DELETED - part of complex blob system

import { safeLog } from './errorHandlers.js';

/**
 * Creates an instance of the download service with all required dependencies
 *
 * NOTE: This service is temporarily disabled as it depended on the complex blob system
 * which has been removed. Audio downloads are not currently supported as we have no audio files.
 *
 * @param log - Logger instance for recording service initialization issues
 * @param _correlationId - Optional correlation ID for request tracing (unused)
 * @returns The initialized download service or null if initialization failed
 */
export function createDownloadService(
  log: Logger,
  _correlationId?: string,
): DownloadService | null {
  // Temporarily disabled - audio downloads not supported
  safeLog(log, 'Download service disabled - no audio files available', 'info');
  return null;
  /* Original implementation commented out - depended on deleted services
  try {
    // Create an AssetService instance with proper configuration
    const assetService: AssetService = createAssetService({
      logger: log,
      correlationId,
    });

    // Log environment variables for debugging (without sensitive values)
    safeLog(log, 'debug', {
      msg: 'Download service environment configuration',
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasBlobUrl: !!process.env.NEXT_PUBLIC_BLOB_BASE_URL,
      nodeEnv: process.env.NODE_ENV,
    });

    // Create and return the download service with dependencies
    return new DownloadService(assetService);
  } catch (error) {
    // Log any errors that occur during service initialization
    safeLog(log, 'error', {
      msg: 'Failed to initialize download service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
  */
}
