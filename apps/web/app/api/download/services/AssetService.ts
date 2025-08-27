import { Logger } from '@/utils/logger';
import { AssetType } from '@/types/assets';
import { AssetNotFoundError, AssetUrlResolver } from '@/types/dependencies';

/**
 * Asset resolution result
 */
export interface AssetResolutionResult {
  success: boolean;
  url?: string;
  type?: AssetType;
  metadata?: AssetMetadata;
  error?: string;
}

/**
 * Asset metadata
 */
export interface AssetMetadata {
  size?: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
}

/**
 * Asset request parameters
 */
export interface AssetRequest {
  slug: string;
  type: 'full' | 'chapter';
  chapter?: number;
}

/**
 * Configuration for AssetService
 */
export interface AssetServiceConfig {
  logger?: Logger;
  urlResolver?: AssetUrlResolver;
  blobBaseUrl?: string;
  cacheTtl?: number;
  fallbackEnabled?: boolean;
}

/**
 * Simple in-memory cache for asset URLs
 */
interface CacheEntry {
  url: string;
  metadata: AssetMetadata;
  timestamp: number;
}

const assetCache = new Map<string, CacheEntry>();

/**
 * Generates cache key for asset request
 */
function getCacheKey(request: AssetRequest): string {
  if (request.type === 'chapter' && request.chapter) {
    return `${request.slug}:chapter:${request.chapter}`;
  }
  return `${request.slug}:full`;
}

/**
 * Gets asset type based on request
 */
function getAssetType(request: AssetRequest): AssetType {
  return request.type === 'chapter' ? AssetType.CHAPTER_AUDIOBOOK : AssetType.FULL_AUDIOBOOK;
}

/**
 * Resolves asset URL for download request
 */
export async function resolveAssetUrl(
  request: AssetRequest,
  config: AssetServiceConfig = {}
): Promise<AssetResolutionResult> {
  const {
    logger = console,
    urlResolver,
    blobBaseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL,
    cacheTtl = 300000, // 5 minutes default
    fallbackEnabled = true
  } = config;

  const cacheKey = getCacheKey(request);
  const assetType = getAssetType(request);

  // Check cache first
  const cached = assetCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < cacheTtl)) {
    logger.debug?.({
      msg: 'Asset URL resolved from cache',
      slug: request.slug,
      type: request.type,
      chapter: request.chapter
    });
    
    return {
      success: true,
      url: cached.url,
      type: assetType,
      metadata: cached.metadata
    };
  }

  try {
    // Use URL resolver if available
    if (urlResolver) {
      const url = await urlResolver.getAssetUrl({
        bookSlug: request.slug,
        assetType,
        chapter: request.chapter?.toString()
      });

      // Cache the result
      const metadata: AssetMetadata = {
        contentType: 'audio/mpeg',
        lastModified: new Date()
      };
      
      assetCache.set(cacheKey, {
        url,
        metadata,
        timestamp: Date.now()
      });

      logger.info?.({
        msg: 'Asset URL resolved successfully',
        slug: request.slug,
        type: request.type,
        chapter: request.chapter
      });

      return {
        success: true,
        url,
        type: assetType,
        metadata
      };
    }

    // Fallback to constructing URL directly
    if (fallbackEnabled && blobBaseUrl) {
      const url = constructBlobUrl(request, blobBaseUrl);
      
      const metadata: AssetMetadata = {
        contentType: 'audio/mpeg'
      };

      logger.info?.({
        msg: 'Asset URL constructed using fallback',
        slug: request.slug,
        type: request.type,
        chapter: request.chapter
      });

      return {
        success: true,
        url,
        type: assetType,
        metadata
      };
    }

    throw new Error('No URL resolver available and fallback disabled');

  } catch (error) {
    logger.error?.({
      msg: 'Failed to resolve asset URL',
      error: error instanceof Error ? error.message : String(error),
      slug: request.slug,
      type: request.type,
      chapter: request.chapter
    });

    if (error instanceof AssetNotFoundError) {
      return {
        success: false,
        error: `Asset not found: ${request.slug}`
      };
    }

    return {
      success: false,
      error: 'Failed to resolve asset URL'
    };
  }
}

/**
 * Constructs blob storage URL for asset
 */
function constructBlobUrl(request: AssetRequest, baseUrl: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  if (request.type === 'chapter' && request.chapter) {
    const paddedChapter = String(request.chapter).padStart(2, '0');
    return `${base}/assets/audio/${request.slug}/chapter-${paddedChapter}.mp3`;
  }
  
  return `${base}/assets/audio/${request.slug}/full-audiobook.mp3`;
}

/**
 * Validates if asset exists (placeholder for actual validation)
 */
export async function validateAssetExists(
  url: string,
  config: AssetServiceConfig = {}
): Promise<boolean> {
  const { logger = console } = config;
  
  try {
    // In production, this would make a HEAD request to check if the asset exists
    // For now, we assume all properly formatted URLs are valid
    logger.debug?.({
      msg: 'Validating asset existence',
      url
    });
    
    return true;
  } catch (error) {
    logger.error?.({
      msg: 'Asset validation failed',
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    
    return false;
  }
}

/**
 * Clears asset cache
 */
export function clearAssetCache(): void {
  assetCache.clear();
}

/**
 * Generates asset name based on download type and chapter
 */
export function generateAssetName(
  type: 'full' | 'chapter',
  chapter?: string | number,
  config: AssetServiceConfig = {}
): { assetName: string; error?: string } {
  const { logger = console } = config;
  
  if (type === 'full') {
    logger.debug?.({ msg: 'Generated asset name for full audiobook' });
    return { assetName: 'full-audiobook.mp3' };
  }

  if (!chapter) {
    logger.warn?.({ msg: 'Chapter required for chapter type download' });
    return { 
      assetName: '', 
      error: 'Chapter parameter is required when type is "chapter"' 
    };
  }

  // Format chapter with leading zeros
  const chapterNum = typeof chapter === 'string' ? parseInt(chapter, 10) : chapter;
  const paddedChapter = String(chapterNum).padStart(2, '0');
  const assetName = `chapter-${paddedChapter}.mp3`;
  
  logger.debug?.({ msg: 'Generated asset name for chapter', chapter: chapterNum, assetName });
  return { assetName };
}

/**
 * Gets download URL for an asset
 */
export async function getDownloadUrl(
  request: AssetRequest,
  config: AssetServiceConfig = {}
): Promise<{ url: string; error?: string }> {
  const { logger = console } = config;
  
  logger.info?.({ 
    msg: 'Getting download URL',
    slug: request.slug,
    type: request.type,
    chapter: request.chapter 
  });

  // Use resolveAssetUrl to get the URL
  const result = await resolveAssetUrl(request, config);
  
  if (!result.success || !result.url) {
    return { 
      url: '', 
      error: result.error || 'Failed to resolve asset URL' 
    };
  }

  logger.info?.({ 
    msg: 'Successfully generated download URL',
    slug: request.slug,
    type: request.type,
    chapter: request.chapter
  });

  return { url: result.url };
}

/**
 * Factory function to create AssetService
 */
export function createAssetService(config: AssetServiceConfig = {}) {
  // Set up periodic cache cleanup
  setInterval(() => {
    const now = Date.now();
    const ttl = config.cacheTtl || 300000;
    
    for (const [key, entry] of assetCache.entries()) {
      if (now - entry.timestamp > ttl * 2) {
        assetCache.delete(key);
      }
    }
  }, 60000); // Clean every minute

  return {
    resolveUrl: (request: AssetRequest) => resolveAssetUrl(request, config),
    validateExists: (url: string) => validateAssetExists(url, config),
    clearCache: clearAssetCache,
    generateAssetName: (type: 'full' | 'chapter', chapter?: string | number) => 
      generateAssetName(type, chapter, config),
    getDownloadUrl: (request: AssetRequest) => getDownloadUrl(request, config)
  };
}