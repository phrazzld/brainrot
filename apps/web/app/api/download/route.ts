import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { AssetType } from '@/types/assets';
import { createRequestLogger } from '@/utils/logger';

import { handleCriticalError, handleDownloadServiceError } from './errorHandlers';
import { safeLog } from './logging/safeLogger';
import { createDownloadService } from './serviceFactory';
import { createAssetService } from './services/AssetService';
import { proxyAssetDownload } from './services/ProxyService';
import { RequestMetadata, createRequestService } from './services/RequestService';
import { createResponseService } from './services/ResponseService';
import { createValidationService } from './services/ValidationService';

/**
 * Download API route handler
 * Processes download requests for audio files (full audiobooks or chapters)
 *
 * This API route follows these principles:
 *
 * 1. URL Generation:
 *    - Uses unified AssetService for consistent URL generation
 *    - Provides standardized path structure via AssetPathService
 *    - Includes robust retry logic and error handling
 *
 * 2. Download Methods:
 *    - Direct client-side download: Returns URL for client to fetch directly
 *    - API proxy: Downloads file server-side and streams to client
 *      (to avoid CORS issues if needed)
 *
 * 3. Response Formats:
 *    - Without proxy: Returns JSON with download URL and metadata
 *    - With proxy: Streams file directly with appropriate headers
 *
 * This approach ensures consistent downloads across all environments
 * without requiring environment-specific credentials or configurations.
 */

/**
 * Type definition for request context to simplify passing around common objects
 */
type RequestContext = {
  correlationId: string;
  log: ReturnType<typeof createRequestLogger>;
  searchParams: URLSearchParams;
  headers: Headers;
  metadata: RequestMetadata;
};

/**
 * Type for validated parameters
 */
type ValidationResult = {
  valid: boolean;
  slug?: string;
  type?: 'full' | 'chapter';
  chapter?: string;
  errorResponse?: NextResponse;
};

// Create service instances
const requestService = createRequestService({
  environment: process.env.NODE_ENV || 'development',
});

const validationService = createValidationService({
  logger: console,
  validTypes: ['full', 'chapter'],
  maxChapter: 999,
});

const assetService = createAssetService({
  logger: console,
  blobBaseUrl: process.env.NEXT_PUBLIC_BLOB_BASE_URL,
});

const responseService = createResponseService({
  logger: console,
  includeStackTrace: process.env.NODE_ENV !== 'production',
});

/**
 * Initialize request processing by setting up logging and correlation ID
 * @param req - The incoming request
 * @returns Request context with correlationId, logger, and searchParams
 */
function initializeRequest(req: NextRequest): RequestContext {
  // Use RequestService to create metadata and logger
  const metadata = requestService.createMetadata(req);
  const log = requestService.createLogger(metadata.correlationId);
  const { searchParams } = new URL(req.url);

  return {
    correlationId: metadata.correlationId,
    log,
    searchParams,
    headers: req.headers,
    metadata,
  };
}

/**
 * Validate request parameters and return early if invalid
 * @param context - Request context
 * @returns Validation result and error response if invalid
 */
function validateRequest(context: RequestContext): ValidationResult {
  const { searchParams, correlationId } = context;

  // Extract parameters from URL search params
  const params = {
    slug: searchParams.get('slug') || undefined,
    type: searchParams.get('type') || undefined,
    chapter: searchParams.get('chapter') || undefined,
    proxy: searchParams.get('proxy') || undefined,
  };

  // Use ValidationService to validate
  const result = validationService.validateDownloadParams(params);

  // Convert ValidationService result to route's expected format
  if (!result.success) {
    const errorMessage = result.errors?.[0]?.message || 'Validation failed';
    const status = result.errors?.[0]?.code?.includes('MISSING') ? 400 : 400;

    return {
      valid: false,
      errorResponse: NextResponse.json({ error: errorMessage, correlationId }, { status }),
    };
  }

  // Return validated parameters
  const validatedData = result.data;
  if (!validatedData) {
    return {
      valid: false,
      errorResponse: NextResponse.json(
        { error: 'Validation failed', correlationId },
        { status: 400 },
      ),
    };
  }
  return {
    valid: true,
    slug: validatedData.slug,
    type: validatedData.type,
    chapter: validatedData.chapter?.toString(),
  };
}

/**
 * Create a direct download response (no proxy)
 * @param url - The download URL
 * @returns NextResponse with URL and metadata
 */
function createDirectDownloadResponse(url: string): NextResponse {
  return NextResponse.json(
    {
      url,
      isCdnUrl: false, // No longer using CDN URLs
      shouldProxy: false, // No need to proxy Vercel Blob URLs
    },
    { status: 200 },
  );
}

/**
 * Create a filename for the download based on the validation parameters
 * @param validatedSlug - The validated slug
 * @param validatedType - The validated type (full or chapter)
 * @param chapter - Optional chapter number
 * @returns Formatted filename
 */
function createDownloadFilename(
  validatedSlug: string,
  validatedType: 'full' | 'chapter',
  chapter?: string,
): string {
  return validatedType === 'full'
    ? `${validatedSlug}.mp3`
    : `${validatedSlug}-chapter-${chapter}.mp3`;
}

/**
 * Type for proxy request context combining all parameters needed
 */
type ProxyRequestContext = {
  url: string;
  filename: string;
  validation: {
    slug: string;
    type: 'full' | 'chapter';
    chapter?: string;
  };
  log: ReturnType<typeof createRequestLogger>;
  correlationId: string;
  searchParams?: URLSearchParams;
  headers?: Record<string, string>;
};

/**
 * Extract and return parameters for logging, filtering sensitive ones
 */
function extractRequestParams(searchParams?: URLSearchParams): Record<string, string | string[]> {
  const requestParams: Record<string, string | string[]> = {};
  const sensitiveParams = ['auth', 'token', 'key', 'secret', 'password', 'apikey', 'api_key'];

  if (searchParams) {
    searchParams.forEach((value, key) => {
      if (!sensitiveParams.includes(key.toLowerCase())) {
        requestParams[key] = value;
      }
    });
  }

  return requestParams;
}

/**
 * Type for proxy logging context
 */
type ProxyLogContext = {
  log: ReturnType<typeof createRequestLogger>;
  correlationId: string;
  operationId: string;
  validation: { slug: string; type: 'full' | 'chapter'; chapter?: string };
  requestDetails: {
    params: Record<string, string | string[]>;
    url: string;
    clientInfo: ClientInfo;
    clientClassification: ClientClassification;
  };
};

/**
 * Log proxy request details
 */
function logProxyRequest(context: ProxyLogContext): void {
  const { log, correlationId, operationId, validation, requestDetails } = context;
  const { params, url, clientInfo, clientClassification } = requestDetails;

  safeLog(log, 'info', {
    msg: 'Proxying download through API',
    correlationId,
    operationId,
    slug: validation.slug,
    type: validation.type,
    chapter: validation.chapter,
    requestOrigin: process.env.VERCEL_URL || 'local',
    requestParams: params,
    requestUrl: url,
    clientInfo,
    clientClassification,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}

// Import AssetService type if needed, or create a placeholder for it
type AssetService = ReturnType<
  NonNullable<ReturnType<typeof createDownloadService>>['getAssetService']
>;

/**
 * Initialize a proxy download service and get asset service
 */
function initializeProxyServices(
  log: ReturnType<typeof createRequestLogger>,
  correlationId: string,
): {
  downloadService: ReturnType<typeof createDownloadService>;
  assetService: AssetService;
} | null {
  const downloadService = createDownloadService(log, correlationId);
  if (!downloadService) {
    return null;
  }

  return {
    downloadService,
    assetService: downloadService.getAssetService(),
  };
}

/**
 * Handle proxy download requests with comprehensive context and error handling
 */
async function handleProxyRequest(context: ProxyRequestContext): Promise<NextResponse> {
  const { url, filename, validation, log, correlationId, searchParams, headers } = context;

  // Generate a unique operation ID for this proxy operation
  const operationId = requestService.generateOperationId();

  // Extract request parameters and client information
  const requestParams = extractRequestParams(searchParams);
  const { clientInfo, clientClassification } = requestService.analyzeClientInfo(headers || {});

  // Log proxy request
  logProxyRequest({
    log,
    correlationId,
    operationId,
    validation,
    requestDetails: {
      params: requestParams,
      url,
      clientInfo,
      clientClassification,
    },
  });

  try {
    // Start timing the operation
    const proxyStartTime = Date.now();

    // Initialize services
    const services = initializeProxyServices(log, correlationId);
    if (!services) {
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Service initialization failed. Please try again later.',
          type: 'SERVICE_ERROR',
          correlationId,
        },
        { status: 500 },
      );
    }

    // Generate asset name based on validation parameters
    const { assetName, error } = assetService.generateAssetName(
      validation.type,
      validation.chapter,
    );
    if (error) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: error,
          correlationId,
        },
        { status: 400 },
      );
    }

    // Use the proxyAssetDownload function with the config object
    const response = await proxyAssetDownload({
      assetType: AssetType.AUDIO,
      bookSlug: validation.slug,
      assetName,
      filename,
      log,
      assetService: services.assetService,
      requestParams,
    });

    // Log successful proxy completion with timing
    const proxyDuration = Date.now() - proxyStartTime;
    safeLog(log, 'info', {
      msg: 'Proxy download completed successfully',
      correlationId,
      operationId,
      slug: validation.slug,
      type: validation.type,
      chapter: validation.chapter,
      durationMs: proxyDuration,
      timestamp: new Date().toISOString(),
    });

    return response;
  } catch (proxyError) {
    // Enhanced error logging with detailed context
    safeLog(log, 'error', {
      msg: 'Error while proxying file',
      correlationId,
      operationId,
      slug: validation.slug,
      type: validation.type,
      chapter: validation.chapter,
      error: proxyError instanceof Error ? proxyError.message : String(proxyError),
      stack: proxyError instanceof Error ? proxyError.stack : undefined,
      errorType: proxyError instanceof Error ? proxyError.constructor.name : typeof proxyError,
      requestParams,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });

    // Return environment-aware structured error response
    const errorResponse = responseService.formatProxyError(proxyError, correlationId, operationId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Processes a valid download request
 *
 * @param validation - The validated request parameters
 * @param context - Request context with search params, headers, etc.
 * @returns Response with the download URL or proxied file
 */
async function processDownloadRequest(
  validation: { valid: boolean; slug?: string; type?: 'full' | 'chapter'; chapter?: string },
  context: RequestContext,
): Promise<NextResponse> {
  const { searchParams, correlationId, log, headers } = context;

  // Create the download service with the correlation ID
  const downloadService = createDownloadService(log, correlationId);
  if (!downloadService) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Service initialization failed. Please try again later.',
        type: 'SERVICE_ERROR',
        correlationId,
      },
      { status: 500 },
    );
  }

  try {
    // At this point we've validated that slug and type exist
    // TypeScript doesn't know this, so we'll use non-null assertion alternatives
    const validatedSlug = validation.slug || '';
    const validatedType = validation.type || 'full';

    // Get download URL using AssetService
    const { url, error: urlError } = await assetService.getDownloadUrl({
      slug: validatedSlug,
      type: validatedType,
      chapter: validation.chapter ? parseInt(validation.chapter, 10) : undefined,
    });

    if (urlError) {
      return NextResponse.json(
        {
          error: 'Asset resolution failed',
          message: urlError,
          correlationId,
        },
        { status: 404 },
      );
    }

    // Create filename for download
    const filename = createDownloadFilename(validatedSlug, validatedType, validation.chapter);

    // Determine if the fetch request has a 'proxy' parameter
    // If present, we'll stream the file directly from our API
    const proxyRequested = searchParams.get('proxy') === 'true';

    if (proxyRequested) {
      // Extract headers for additional context
      const requestHeaders: Record<string, string> = {};
      ['user-agent', 'referer', 'origin', 'accept', 'accept-encoding', 'accept-language'].forEach(
        (header) => {
          const value = headers.get(header);
          if (value) {
            requestHeaders[header] = value;
          }
        },
      );

      return handleProxyRequest({
        url,
        filename,
        validation: {
          slug: validatedSlug,
          type: validatedType,
          chapter: validation.chapter,
        },
        log,
        correlationId,
        searchParams,
        headers: requestHeaders,
      });
    }

    // If no proxy requested, respond with the URL for client-side download
    return createDirectDownloadResponse(url);
  } catch (error) {
    // Map service errors to appropriate responses
    const validatedSlug = validation.slug || '';
    const validatedType = validation.type || 'full';

    return handleDownloadServiceError(
      error,
      {
        slug: validatedSlug,
        type: validatedType,
        chapter: validation.chapter,
        correlationId,
      },
      log,
    );
  }
}

/**
 * Main API route handler for the download endpoint
 */
export async function GET(req: NextRequest) {
  try {
    // Initialize request handling with logging and correlation ID
    const context = initializeRequest(req);

    // Validate request parameters
    const validation = validateRequest(context);

    // Return error response if validation fails
    if (!validation.valid || !validation.slug || !validation.type) {
      return (
        validation.errorResponse || NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      );
    }

    // Process the download request
    return processDownloadRequest(validation, context);
  } catch (error) {
    // For critical errors, create a correlation ID if we don't have one yet
    // Define a type for errors that might contain a correlationId
    type ErrorWithCorrelation = { correlationId?: string };

    // Try to extract correlationId from the error or generate a new one
    const correlationId =
      typeof error === 'object' &&
      error !== null &&
      'correlationId' in (error as ErrorWithCorrelation)
        ? (error as ErrorWithCorrelation).correlationId || randomUUID()
        : randomUUID();

    const log = createRequestLogger(correlationId);

    // Handle critical errors that occur during request processing
    return handleCriticalError(error, correlationId, log);
  }
}
