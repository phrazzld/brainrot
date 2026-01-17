/**
 * Custom error classes for Lulu Print API
 * Per council recommendation: specific errors reveal details needed to fix rejected orders
 */

import axios from "axios";

export class LuluPrintError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    options?: {
      details?: Record<string, unknown>;
      retryable?: boolean;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = "LuluPrintError";
    this.code = code;
    this.details = options?.details;
    this.retryable = options?.retryable ?? false;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Authentication failures (401)
 */
export class LuluAuthError extends LuluPrintError {
  constructor(message: string, cause?: Error) {
    super(message, "AUTH_ERROR", { retryable: false, cause });
    this.name = "LuluAuthError";
  }
}

/**
 * Validation errors (422) - e.g., address fields too long, invalid SKU
 */
export class LuluValidationError extends LuluPrintError {
  public readonly fieldErrors: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    fieldErrors: Array<{ field: string; message: string }>,
    cause?: Error,
  ) {
    super(message, "VALIDATION_ERROR", {
      details: { fieldErrors },
      retryable: false,
      cause,
    });
    this.name = "LuluValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Rate limiting (429)
 */
export class LuluRateLimitError extends LuluPrintError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, "RATE_LIMIT", { retryable: true });
    this.name = "LuluRateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Server errors (5xx)
 */
export class LuluServerError extends LuluPrintError {
  constructor(message: string, cause?: Error) {
    super(message, "SERVER_ERROR", { retryable: true, cause });
    this.name = "LuluServerError";
  }
}

/**
 * Network errors (DNS, connection refused, etc.)
 */
export class LuluNetworkError extends LuluPrintError {
  public readonly networkErrorType: "timeout" | "dns" | "connection" | "unknown";

  constructor(
    message: string,
    networkErrorType: "timeout" | "dns" | "connection" | "unknown" = "unknown",
    cause?: Error,
  ) {
    super(message, "NETWORK_ERROR", { retryable: true, cause });
    this.name = "LuluNetworkError";
    this.networkErrorType = networkErrorType;
  }
}

/**
 * Request timeout errors (separate from general network errors for clearer debugging)
 */
export class LuluTimeoutError extends LuluNetworkError {
  public readonly timeoutMs?: number;

  constructor(message: string, timeoutMs?: number, cause?: Error) {
    super(message, "timeout", cause);
    this.name = "LuluTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Resource not found (404)
 */
export class LuluNotFoundError extends LuluPrintError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, "NOT_FOUND", {
      retryable: false,
    });
    this.name = "LuluNotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Job already exists (idempotency check)
 */
export class LuluDuplicateJobError extends LuluPrintError {
  public readonly existingJobId: string;

  constructor(externalId: string, existingJobId: string) {
    super(
      `Job with external_id "${externalId}" already exists: ${existingJobId}`,
      "DUPLICATE_JOB",
      { retryable: false },
    );
    this.name = "LuluDuplicateJobError";
    this.existingJobId = existingJobId;
  }
}

/**
 * Job cannot be canceled (already in production or shipped)
 */
export class LuluJobNotCancelableError extends LuluPrintError {
  public readonly jobId: string;
  public readonly currentStatus: string;

  constructor(jobId: string, currentStatus: string) {
    super(
      `Job ${jobId} cannot be canceled: status is ${currentStatus}`,
      "JOB_NOT_CANCELABLE",
      { retryable: false },
    );
    this.name = "LuluJobNotCancelableError";
    this.jobId = jobId;
    this.currentStatus = currentStatus;
  }
}

/**
 * File validation failed
 */
export class LuluFileValidationError extends LuluPrintError {
  public readonly fileType: "interior" | "cover";
  public readonly errors: Array<{ code: string; message: string }>;
  public readonly warnings: Array<{ code: string; message: string }>;

  constructor(
    fileType: "interior" | "cover",
    errors: Array<{ code: string; message: string }>,
    warnings: Array<{ code: string; message: string }> = [],
  ) {
    super(
      `${fileType} PDF validation failed: ${errors.map((e) => e.message).join(", ")}`,
      "FILE_VALIDATION_ERROR",
      { retryable: false },
    );
    this.name = "LuluFileValidationError";
    this.fileType = fileType;
    this.errors = errors;
    this.warnings = warnings;
  }
}

/**
 * Parse Axios error into appropriate Lulu error class
 */
export function parseLuluError(error: unknown): LuluPrintError {
  // Handle Axios errors
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    // Auth error
    if (status === 401) {
      return new LuluAuthError(
        data?.error_description || data?.message || "Authentication failed",
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Validation error
    if (status === 422) {
      const fieldErrors = parseValidationErrors(data);
      return new LuluValidationError(
        data?.message || "Validation failed",
        fieldErrors,
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Rate limit
    if (status === 429) {
      const retryAfter = parseInt(error.response?.headers?.["retry-after"]);
      return new LuluRateLimitError(
        "Rate limit exceeded",
        isNaN(retryAfter) ? undefined : retryAfter,
      );
    }

    // Not found
    if (status === 404) {
      return new LuluNotFoundError("Resource", "unknown");
    }

    // Server error
    if (status && status >= 500) {
      return new LuluServerError(
        data?.message || `Server error: ${status}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    // Network error (no response) - differentiate by error code
    if (!error.response) {
      const cause = error instanceof Error ? error : new Error(String(error));
      const code = error.code?.toUpperCase();

      // Timeout errors
      if (code === "ECONNABORTED" || code === "ETIMEDOUT" || error.message?.includes("timeout")) {
        return new LuluTimeoutError(
          `Request timed out: ${error.message || "connection took too long"}`,
          error.config?.timeout,
          cause,
        );
      }

      // DNS resolution failures
      if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
        return new LuluNetworkError(
          `DNS resolution failed: ${error.message || "could not resolve host"}`,
          "dns",
          cause,
        );
      }

      // Connection refused/reset
      if (code === "ECONNREFUSED" || code === "ECONNRESET") {
        return new LuluNetworkError(
          `Connection failed: ${error.message || "connection refused or reset"}`,
          "connection",
          cause,
        );
      }

      // Generic network error
      return new LuluNetworkError(
        error.message || "Network error occurred",
        "unknown",
        cause,
      );
    }

    // Generic error
    return new LuluPrintError(
      data?.message || error.message || "Unknown error",
      "UNKNOWN",
      { cause: error instanceof Error ? error : new Error(String(error)) },
    );
  }

  // Handle other errors
  if (error instanceof LuluPrintError) {
    return error;
  }

  if (error instanceof Error) {
    return new LuluPrintError(error.message, "UNKNOWN", { cause: error });
  }

  return new LuluPrintError(String(error), "UNKNOWN");
}

// Use axios's built-in type guard for consistency and robustness
const isAxiosError = axios.isAxiosError;

// Parse validation errors from API response
function parseValidationErrors(
  data: any,
): Array<{ field: string; message: string }> {
  if (!data) return [];

  // Handle various API error formats

  // Format: {errors: [{field, message}, ...]} (array of objects)
  if (Array.isArray(data.errors)) {
    return data.errors.map((e: any) => ({
      field: e.field || e.loc?.join(".") || "unknown",
      message: e.message || e.msg || String(e),
    }));
  }

  // Format: {errors: {field1: "msg1", field2: "msg2"}} (object mapping)
  if (typeof data.errors === "object" && data.errors !== null) {
    return Object.entries(data.errors).map(([field, message]) => ({
      field,
      message: String(message),
    }));
  }

  // Format: {detail: {field1: "msg1", field2: "msg2"}} (FastAPI-style object)
  if (typeof data.detail === "object" && !Array.isArray(data.detail)) {
    return Object.entries(data.detail).map(([field, message]) => ({
      field,
      message: String(message),
    }));
  }

  // Format: {detail: [{loc: [...], msg: "..."}, ...]} (Pydantic-style)
  if (Array.isArray(data.detail)) {
    return data.detail.map((e: any) => ({
      field: e.loc?.join(".") || "unknown",
      message: e.msg || String(e),
    }));
  }

  return [];
}
