import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { createRequestLogger, Logger } from '@/utils/logger';

/**
 * Request metadata extracted from incoming request
 */
export interface RequestMetadata {
  correlationId: string;
  method: string;
  url: string;
  pathname: string;
  params: Record<string, string>;
  isProxyRequest: boolean;
  userAgent: string | null;
  referer: string | null;
  origin: string | null;
  host: string | null;
  timestamp: string;
  environment: string;
}

/**
 * Configuration for RequestService
 */
export interface ClientInfo {
  userAgent: string;
  referer: string;
  origin: string;
  accept: string;
  acceptEncoding: string;
  acceptLanguage: string;
}

/**
 * Client classification based on user agent
 */
export interface ClientClassification {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  browser: string;
}

/**
 * Configuration for RequestService
 */
export interface RequestServiceConfig {
  logger?: Logger;
  generateId?: () => string;
  environment?: string;
}

/**
 * Extracts and processes request metadata
 */
export function createRequestMetadata(
  request: NextRequest,
  config: RequestServiceConfig = {}
): RequestMetadata {
  const {
    logger = console,
    generateId = randomUUID,
    environment = process.env.NODE_ENV || 'development'
  } = config;

  const url = new URL(request.url);
  const correlationId = generateId();
  
  // Extract query parameters
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const metadata: RequestMetadata = {
    correlationId,
    method: request.method,
    url: request.url,
    pathname: url.pathname,
    params,
    isProxyRequest: params.proxy === 'true',
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin'),
    host: request.headers.get('host'),
    timestamp: new Date().toISOString(),
    environment
  };

  // Log request received
  logger.info?.({
    msg: 'Download API request received',
    correlationId,
    method: metadata.method,
    pathname: metadata.pathname,
    params: metadata.params,
    isProxyRequest: metadata.isProxyRequest,
    userAgent: metadata.userAgent,
    environment: metadata.environment
  });

  return metadata;
}

/**
 * Creates a request-scoped logger with correlation ID
 */
export function createScopedLogger(
  correlationId: string,
  baseLogger?: Logger
): Logger {
  return createRequestLogger(correlationId, baseLogger);
}

/**
 * Sanitizes URL for safe logging (removes sensitive query params)
 */
export function sanitizeUrlForLogging(url: string): string {
  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
    
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    
    return urlObj.toString();
  } catch {
    return '[INVALID_URL]';
  }
}

/**
 * Generates operation ID for request tracking
 */
export function generateOperationId(): string {
  return `px-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
}

/**
 * Extracts client information from headers
 */
export function extractClientInfo(headers: Headers | Record<string, string>): ClientInfo {
  const getHeader = (key: string): string => {
    if (headers instanceof Headers) {
      return headers.get(key) || '';
    }
    return headers[key] || '';
  };

  return {
    userAgent: getHeader('user-agent'),
    referer: getHeader('referer'),
    origin: getHeader('origin'),
    accept: getHeader('accept'),
    acceptEncoding: getHeader('accept-encoding'),
    acceptLanguage: getHeader('accept-language')
  };
}

/**
 * Determines browser type from user agent
 */
export function determineBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg/')) return 'Edge';
  return 'Other';
}

/**
 * Analyzes client information from headers
 */
export function analyzeClientInfo(headers: Headers | Record<string, string>): {
  clientInfo: ClientInfo;
  clientClassification: ClientClassification;
} {
  const clientInfo = extractClientInfo(headers);
  const { userAgent } = clientInfo;

  // Determine client platform/browser for analytics
  const isMobile = userAgent.includes('Mobile') || userAgent.includes('Android');
  const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
  const isAndroid = userAgent.includes('Android');
  const browser = determineBrowser(userAgent);

  return {
    clientInfo,
    clientClassification: {
      isMobile,
      isIOS,
      isAndroid,
      browser
    }
  };
}

/**
 * Factory function to create RequestService
 */
export function createRequestService(config: RequestServiceConfig = {}) {
  return {
    createMetadata: (request: NextRequest) => createRequestMetadata(request, config),
    createLogger: (correlationId: string) => createScopedLogger(correlationId, config.logger),
    sanitizeUrl: sanitizeUrlForLogging,
    generateOperationId,
    extractClientInfo,
    analyzeClientInfo
  };
}