/**
 * Shared Lulu HTTP Client with OAuth2 authentication
 *
 * Per council recommendation: Extract auth logic to shared factory
 * to prevent token drift and bugs between LuluService and LuluPrintService.
 *
 * Implements single-flight token refresh to prevent race conditions
 * (adversarial review finding #1).
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { Logger } from "./logger.js";
import type { OAuth2Token, LuluPrintConfig } from "../types/lulu-print.js";
import { LuluAuthError, parseLuluError } from "../errors/lulu-errors.js";

const LULU_PRODUCTION_URL = "https://api.lulu.com";
const LULU_SANDBOX_URL = "https://api.sandbox.lulu.com";
const AUTH_PATH = "/auth/realms/glasstree/protocol/openid-connect/token";

// Token expiry buffer (refresh 120s before actual expiry)
// Extra margin ensures slow requests complete before token expires
const TOKEN_BUFFER_MS = 120_000;

export class LuluHttpClient {
  private client: AxiosInstance;
  private config: Required<LuluPrintConfig>;
  private token?: OAuth2Token;

  // Single-flight pattern: only one token refresh at a time
  private refreshPromise?: Promise<OAuth2Token>;

  constructor(config: LuluPrintConfig) {
    this.config = {
      clientKey: config.clientKey,
      clientSecret: config.clientSecret,
      sandbox: config.sandbox ?? true,
      mockMode: config.mockMode ?? false,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    const baseURL = this.config.sandbox ? LULU_SANDBOX_URL : LULU_PRODUCTION_URL;

    this.client = axios.create({
      baseURL,
      timeout: 60_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor: attach auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Skip auth for auth endpoint itself
        if (config.url?.includes("/auth/")) {
          return config;
        }

        // Skip auth in mock mode
        if (this.config.mockMode) {
          return config;
        }

        const token = await this.ensureValidToken();
        config.headers.Authorization = `Bearer ${token.access_token}`;
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor: handle 401s with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        // Handle 401: token expired mid-flight
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !this.config.mockMode
        ) {
          // Invalidate current token
          this.token = undefined;

          // Retry with fresh token (single-flight handles concurrent 401s)
          try {
            const token = await this.ensureValidToken();
            originalRequest.headers.Authorization = `Bearer ${token.access_token}`;
            return this.client.request(originalRequest);
          } catch (refreshError) {
            // Auth refresh failed, propagate as LuluAuthError
            throw parseLuluError(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Ensure valid token, using single-flight pattern for concurrent requests
   */
  private async ensureValidToken(): Promise<OAuth2Token> {
    // If token is valid, return it
    if (this.token && !this.isTokenExpired()) {
      return this.token;
    }

    // Single-flight: if refresh is in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start new refresh
    this.refreshPromise = this.authenticate();

    try {
      this.token = await this.refreshPromise;
      return this.token;
    } finally {
      // Clear the promise so next refresh can proceed
      this.refreshPromise = undefined;
    }
  }

  private isTokenExpired(): boolean {
    if (!this.token) return true;
    const expiresAt = this.token.created_at + this.token.expires_in * 1000;
    return Date.now() > expiresAt - TOKEN_BUFFER_MS;
  }

  private async authenticate(): Promise<OAuth2Token> {
    if (this.config.mockMode) {
      return {
        access_token: "mock-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "print-api",
        created_at: Date.now(),
      };
    }

    const formData = new URLSearchParams();
    formData.append("client_id", this.config.clientKey);
    formData.append("client_secret", this.config.clientSecret);
    formData.append("grant_type", "client_credentials");

    try {
      const response = await this.client.post(AUTH_PATH, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const token: OAuth2Token = {
        ...response.data,
        created_at: Date.now(),
      };

      Logger.debug("Successfully authenticated with Lulu API");
      return token;
    } catch (error) {
      Logger.error("Failed to authenticate with Lulu API", error);
      throw new LuluAuthError(
        `Authentication failed: ${extractErrorMessage(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get the configured Axios instance for making requests
   */
  getAxios(): AxiosInstance {
    return this.client;
  }

  /**
   * Check if running in sandbox mode
   */
  isSandbox(): boolean {
    return this.config.sandbox;
  }

  /**
   * Check if running in mock mode
   */
  isMockMode(): boolean {
    return this.config.mockMode;
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): { attempts: number; delay: number } {
    return {
      attempts: this.config.retryAttempts,
      delay: this.config.retryDelay,
    };
  }
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error_description ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
