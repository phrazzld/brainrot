/**
 * Custom error types for KDP operations
 *
 * Provides specific error classes for different failure scenarios
 * in KDP automation and scraping workflows.
 */

/**
 * Thrown when KDP authentication fails
 *
 * Indicates credentials are invalid, 2FA is required,
 * or account is locked/suspended.
 */
export class KdpAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KdpAuthenticationError";
    // Maintains proper stack trace for V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KdpAuthenticationError);
    }
  }
}

/**
 * Thrown when web scraping encounters unexpected page structure
 *
 * Indicates KDP UI has changed and selectors need updating,
 * or network issues prevented page load.
 */
export class KdpScrapingError extends Error {
  constructor(
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = "KdpScrapingError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KdpScrapingError);
    }
  }
}

/**
 * Thrown when KDP session expires during operation
 *
 * Indicates user needs to re-authenticate. Session cookies
 * have expired or been invalidated.
 */
export class KdpSessionExpiredError extends Error {
  constructor() {
    super("KDP session expired. Please login again.");
    this.name = "KdpSessionExpiredError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KdpSessionExpiredError);
    }
  }
}
