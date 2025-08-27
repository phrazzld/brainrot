import { NextRequest } from 'next/server';

import { Logger } from '@/utils/logger';

/**
 * Authorization result with details
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  userId?: string;
  permissions?: string[];
}

/**
 * Resource access requirements
 */
export interface ResourceAccess {
  resource: string;
  action: 'read' | 'write' | 'delete';
  resourceId?: string;
}

/**
 * Configuration for AuthorizationService
 */
export interface AuthorizationServiceConfig {
  logger?: Logger;
  requireAuth?: boolean;
  publicResources?: string[];
  ipWhitelist?: string[];
  rateLimit?: RateLimitConfig;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
}

/**
 * In-memory rate limit store (for development)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks if a resource is publicly accessible
 */
function isPublicResource(resourceSlug: string, _publicResources: string[] = []): boolean {
  // All resources are currently public in this implementation
  // This can be modified to check against a whitelist
  return true;
}

/**
 * Extracts client IP from request
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}

/**
 * Checks rate limiting for client
 */
function checkRateLimit(
  clientId: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number } {
  if (!config.enabled) {
    return { allowed: true, remaining: config.maxRequests };
  }

  const now = Date.now();
  const clientLimit = rateLimitStore.get(clientId);

  if (!clientLimit || clientLimit.resetTime < now) {
    // Create or reset limit
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (clientLimit.count >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  clientLimit.count++;
  rateLimitStore.set(clientId, clientLimit);

  return {
    allowed: true,
    remaining: config.maxRequests - clientLimit.count,
  };
}

/**
 * Authorizes access to download resources
 */
export function authorizeDownload(
  request: NextRequest,
  resourceSlug: string,
  config: AuthorizationServiceConfig = {},
): AuthorizationResult {
  const {
    logger = console,
    requireAuth = false,
    publicResources = [],
    ipWhitelist = [],
    rateLimit = { enabled: false, maxRequests: 100, windowMs: 60000 },
  } = config;

  // Check if resource is public
  if (!requireAuth || isPublicResource(resourceSlug, publicResources)) {
    logger.debug?.({
      msg: 'Resource is publicly accessible',
      resource: resourceSlug,
    });

    // Still check rate limiting for public resources
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimit);

    if (!rateLimitResult.allowed) {
      logger.warn?.({
        msg: 'Rate limit exceeded',
        clientIp,
        resource: resourceSlug,
      });

      return {
        authorized: false,
        reason: 'Rate limit exceeded. Please try again later.',
      };
    }

    return {
      authorized: true,
      permissions: ['read'],
    };
  }

  // Check IP whitelist
  const clientIp = getClientIp(request);
  if (ipWhitelist.length > 0 && ipWhitelist.includes(clientIp)) {
    logger.debug?.({
      msg: 'Client IP is whitelisted',
      clientIp,
      resource: resourceSlug,
    });

    return {
      authorized: true,
      permissions: ['read'],
    };
  }

  // Check authentication headers (placeholder for future implementation)
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    logger.warn?.({
      msg: 'No authorization header provided',
      resource: resourceSlug,
    });

    return {
      authorized: false,
      reason: 'Authentication required',
    };
  }

  // TODO: Implement actual token validation
  // This is a placeholder that always returns unauthorized for protected resources
  logger.warn?.({
    msg: 'Authorization not implemented',
    resource: resourceSlug,
  });

  return {
    authorized: false,
    reason: 'Invalid or expired authentication',
  };
}

/**
 * Cleans up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [clientId, limit] of rateLimitStore.entries()) {
    if (limit.resetTime < now) {
      rateLimitStore.delete(clientId);
    }
  }
}

/**
 * Factory function to create AuthorizationService
 */
export function createAuthorizationService(config: AuthorizationServiceConfig = {}) {
  // Set up periodic cleanup
  if (config.rateLimit?.enabled) {
    setInterval(cleanupRateLimits, config.rateLimit.windowMs);
  }

  return {
    authorize: (request: NextRequest, resourceSlug: string) =>
      authorizeDownload(request, resourceSlug, config),
    checkRateLimit: (clientId: string) =>
      checkRateLimit(
        clientId,
        config.rateLimit || { enabled: false, maxRequests: 100, windowMs: 60000 },
      ),
    cleanupRateLimits,
  };
}
