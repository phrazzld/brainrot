import { NextResponse } from 'next/server';

import { Logger } from '@/utils/logger';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  metadata?: ResponseMetadata;
}

/**
 * Error details for responses
 */
export interface ErrorDetails {
  message: string;
  code?: string;
  details?: unknown;
  correlationId?: string;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: string;
  correlationId: string;
  cached?: boolean;
  processingTimeMs?: number;
}

/**
 * Configuration for ResponseService
 */
export interface ResponseServiceConfig {
  logger?: Logger;
  includeStackTrace?: boolean;
  defaultHeaders?: Record<string, string>;
  corsOrigin?: string;
}

/**
 * HTTP status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Creates a success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: Partial<ResponseMetadata>,
  config: ResponseServiceConfig = {},
): NextResponse {
  const { logger = console, defaultHeaders = {} } = config;

  const response: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId: metadata?.correlationId || 'unknown',
      ...metadata,
    },
  };

  logger.debug?.({
    msg: 'Creating success response',
    correlationId: response.metadata?.correlationId,
    dataType: typeof data,
  });

  return NextResponse.json(response, {
    status: HttpStatus.OK,
    headers: {
      ...defaultHeaders,
      ...getCorsHeaders(config.corsOrigin),
    },
  });
}

/**
 * Creates an error response
 */
export function createErrorResponse(
  error: string | Error | ErrorDetails,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  correlationId?: string,
  config: ResponseServiceConfig = {},
): NextResponse {
  const { logger = console, includeStackTrace = false, defaultHeaders = {} } = config;

  let errorDetails: ErrorDetails;

  if (typeof error === 'string') {
    errorDetails = { message: error };
  } else if (error instanceof Error) {
    errorDetails = {
      message: error.message,
      ...(includeStackTrace && { details: error.stack }),
    };
  } else {
    errorDetails = error;
  }

  if (correlationId) {
    errorDetails.correlationId = correlationId;
  }

  const response: ApiResponse = {
    success: false,
    error: errorDetails,
    metadata: {
      timestamp: new Date().toISOString(),
      correlationId: correlationId || 'unknown',
    },
  };

  logger.error?.({
    msg: 'Creating error response',
    status,
    error: errorDetails.message,
    correlationId,
  });

  return NextResponse.json(response, {
    status,
    headers: {
      ...defaultHeaders,
      ...getCorsHeaders(config.corsOrigin),
    },
  });
}

/**
 * Creates a redirect response
 */
export function createRedirectResponse(
  url: string,
  permanent: boolean = false,
  config: ResponseServiceConfig = {},
): NextResponse {
  const { logger = console, defaultHeaders = {} } = config;

  logger.info?.({
    msg: 'Creating redirect response',
    url,
    permanent,
  });

  return NextResponse.redirect(url, {
    status: permanent ? HttpStatus.MOVED_PERMANENTLY : HttpStatus.FOUND,
    headers: {
      ...defaultHeaders,
      ...getCorsHeaders(config.corsOrigin),
    },
  });
}

/**
 * Creates a streaming response for proxied content
 */
export function createStreamResponse(
  stream: ReadableStream,
  contentType: string = 'application/octet-stream',
  metadata?: Record<string, string>,
  config: ResponseServiceConfig = {},
): NextResponse {
  const { logger = console, defaultHeaders = {} } = config;

  logger.debug?.({
    msg: 'Creating stream response',
    contentType,
    hasMetadata: !!metadata,
  });

  const headers = {
    ...defaultHeaders,
    'Content-Type': contentType,
    ...getCorsHeaders(config.corsOrigin),
    ...metadata,
  };

  return new NextResponse(stream, {
    status: HttpStatus.OK,
    headers,
  });
}

/**
 * Creates CORS headers based on configuration
 */
function getCorsHeaders(origin?: string): Record<string, string> {
  if (!origin) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Formats proxy error response with environment-aware details
 */
export function formatProxyError(
  error: unknown,
  correlationId: string,
  operationId?: string,
  config: ResponseServiceConfig = {},
): Record<string, unknown> {
  const { includeStackTrace = process.env.NODE_ENV !== 'production' } = config;

  const errorResponse: Record<string, unknown> = {
    error: 'Proxy error',
    message: 'Failed to proxy download through API',
    correlationId,
  };

  if (operationId) {
    errorResponse.operationId = operationId;
  }

  // Add detailed error information in non-production environments
  if (includeStackTrace) {
    Object.assign(errorResponse, {
      details: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  return errorResponse;
}

/**
 * Creates cache control headers
 */
export function getCacheHeaders(
  maxAge: number = 3600,
  sMaxAge?: number,
  mustRevalidate: boolean = false,
): Record<string, string> {
  const directives = [`max-age=${maxAge}`];

  if (sMaxAge !== undefined) {
    directives.push(`s-maxage=${sMaxAge}`);
  }

  if (mustRevalidate) {
    directives.push('must-revalidate');
  }

  return {
    'Cache-Control': directives.join(', '),
  };
}

/**
 * Factory function to create ResponseService
 */
export function createResponseService(config: ResponseServiceConfig = {}) {
  return {
    success: <T>(data: T, metadata?: Partial<ResponseMetadata>) =>
      createSuccessResponse(data, metadata, config),
    error: (error: string | Error | ErrorDetails, status?: number, correlationId?: string) =>
      createErrorResponse(error, status, correlationId, config),
    redirect: (url: string, permanent?: boolean) => createRedirectResponse(url, permanent, config),
    stream: (stream: ReadableStream, contentType?: string, metadata?: Record<string, string>) =>
      createStreamResponse(stream, contentType, metadata, config),
    formatProxyError: (error: unknown, correlationId: string, operationId?: string) =>
      formatProxyError(error, correlationId, operationId, config),
    getCacheHeaders,
    HttpStatus,
  };
}
