/**
 * Lulu Print API Service (Direct Fulfillment)
 *
 * This service uses the Print API (/print-jobs) for direct fulfillment,
 * NOT the Publishing API (/projects) for marketplace listing.
 *
 * Key features:
 * - Idempotency via external_id to prevent double-charging
 * - Single-flight token refresh via shared LuluHttpClient
 * - Custom error classes for actionable failure handling
 */

import pRetry from "p-retry";
import { randomUUID } from "crypto";
import { LuluHttpClient } from "../utils/lulu-client.js";
import { Logger } from "../utils/logger.js";
import {
  parseLuluError,
  LuluDuplicateJobError,
  LuluNotFoundError,
  LuluJobNotCancelableError,
} from "../errors/lulu-errors.js";
import type {
  LuluPrintConfig,
  LineItem,
  ShippingAddress,
  ShippingLevel,
  ShippingOption,
  CostEstimate,
  PrintJob,
  PrintJobStatus,
  PrintJobCreateOptions,
  PrintJobListOptions,
  PrintJobListResponse,
  ValidationResult,
  CoverDimensions,
} from "../types/lulu-print.js";

// Mock data for testing
interface MockPrintJob extends PrintJob {
  _mockStatus: PrintJobStatus;
  _mockCreatedAt: number;
}

export class LuluPrintService {
  private httpClient: LuluHttpClient;
  private mockJobs: Map<string, MockPrintJob> = new Map();

  constructor(config: LuluPrintConfig) {
    this.httpClient = new LuluHttpClient(config);
  }

  // ==========================================================================
  // Cost Estimation
  // ==========================================================================

  /**
   * Calculate cost for a print job without creating it
   *
   * @param items - Line items to quote
   * @param address - Shipping destination
   * @param shippingLevel - Optional specific shipping level
   */
  async calculateCost(
    items: LineItem[],
    address: ShippingAddress,
    shippingLevel?: ShippingLevel,
  ): Promise<CostEstimate> {
    if (this.httpClient.isMockMode()) {
      return this.mockCalculateCost(items, address, shippingLevel);
    }

    const axios = this.httpClient.getAxios();
    const retryConfig = this.httpClient.getRetryConfig();

    return pRetry(
      async () => {
        try {
          const response = await axios.post("/print-job-cost-calculations/", {
            line_items: items.map((item) => ({
              title: item.title,
              quantity: item.quantity,
              pod_package_id: item.pod_package_id,
              printable_normalization: item.printable_normalization,
            })),
            shipping_address: address,
            shipping_level: shippingLevel,
          });

          Logger.debug("Cost calculation successful");
          return this.mapCostResponse(response.data);
        } catch (error) {
          throw parseLuluError(error);
        }
      },
      {
        retries: retryConfig.attempts,
        minTimeout: retryConfig.delay,
        onFailedAttempt: (error) => {
          Logger.warn(`Cost calculation attempt ${error.attemptNumber} failed`);
        },
      },
    );
  }

  // ==========================================================================
  // Shipping Options
  // ==========================================================================

  /**
   * Get available shipping options with costs
   */
  async getShippingOptions(
    items: LineItem[],
    address: ShippingAddress,
  ): Promise<ShippingOption[]> {
    if (this.httpClient.isMockMode()) {
      return this.mockGetShippingOptions();
    }

    const axios = this.httpClient.getAxios();

    try {
      const response = await axios.post("/shipping-options/", {
        line_items: items.map((item) => ({
          quantity: item.quantity,
          pod_package_id: item.pod_package_id,
        })),
        shipping_address: address,
      });

      return response.data.shipping_options || [];
    } catch (error) {
      throw parseLuluError(error);
    }
  }

  // ==========================================================================
  // Print Job Management
  // ==========================================================================

  /**
   * Create a print job (places an order)
   *
   * Uses external_id for idempotency. If the request fails but the job was
   * created on the server, subsequent retries will detect the duplicate.
   *
   * @param items - Line items to print
   * @param address - Shipping destination
   * @param shippingLevel - Shipping speed
   * @param options - Additional options including external_id for idempotency
   */
  async createPrintJob(
    items: LineItem[],
    address: ShippingAddress,
    shippingLevel: ShippingLevel,
    options?: PrintJobCreateOptions,
  ): Promise<PrintJob> {
    // Generate external_id if not provided (for idempotency)
    const externalId = options?.external_id || randomUUID();

    if (this.httpClient.isMockMode()) {
      return this.mockCreatePrintJob(items, address, shippingLevel, externalId);
    }

    const axios = this.httpClient.getAxios();
    const retryConfig = this.httpClient.getRetryConfig();

    return pRetry(
      async () => {
        // Check if job with this external_id already exists (idempotency)
        const existingJob = await this.findJobByExternalId(externalId);
        if (existingJob) {
          Logger.warn(`Job with external_id ${externalId} already exists`);
          throw new LuluDuplicateJobError(externalId, existingJob.id);
        }

        try {
          const response = await axios.post("/print-jobs/", {
            line_items: items.map((item) => ({
              title: item.title,
              quantity: item.quantity,
              pod_package_id: item.pod_package_id,
              printable_normalization: item.printable_normalization,
              external_id: item.external_id,
            })),
            shipping_address: address,
            shipping_level: shippingLevel,
            external_id: externalId,
            contact_email: options?.contact_email,
            production_delay_minutes: options?.production_delay_minutes,
          });

          Logger.info(`Print job created: ${response.data.id}`);
          return this.mapPrintJobResponse(response.data);
        } catch (error) {
          throw parseLuluError(error);
        }
      },
      {
        retries: retryConfig.attempts,
        minTimeout: retryConfig.delay,
        onFailedAttempt: (error) => {
          // Don't retry on duplicate job (it succeeded)
          if (error instanceof LuluDuplicateJobError) {
            throw error; // Abort retries
          }
          Logger.warn(
            `Create print job attempt ${error.attemptNumber} failed: ${error.message}`,
          );
        },
      },
    );
  }

  /**
   * Get print job status and details
   */
  async getJobStatus(jobId: string): Promise<PrintJob> {
    if (this.httpClient.isMockMode()) {
      return this.mockGetJobStatus(jobId);
    }

    const axios = this.httpClient.getAxios();

    try {
      const response = await axios.get(`/print-jobs/${jobId}/`);
      return this.mapPrintJobResponse(response.data);
    } catch (error) {
      throw parseLuluError(error);
    }
  }

  /**
   * Cancel a print job (only if not yet in production)
   */
  async cancelJob(jobId: string): Promise<void> {
    if (this.httpClient.isMockMode()) {
      return this.mockCancelJob(jobId);
    }

    const axios = this.httpClient.getAxios();

    // First check current status
    const job = await this.getJobStatus(jobId);
    const cancelableStatuses: PrintJobStatus[] = [
      "CREATED",
      "UNPAID",
      "PAYMENT_IN_PROGRESS",
    ];

    if (!cancelableStatuses.includes(job.status)) {
      throw new LuluJobNotCancelableError(jobId, job.status);
    }

    try {
      await axios.put(`/print-jobs/${jobId}/status/`, {
        name: "CANCELED",
      });
      Logger.info(`Print job ${jobId} canceled`);
    } catch (error) {
      throw parseLuluError(error);
    }
  }

  /**
   * List print jobs with optional filters
   */
  async listJobs(options?: PrintJobListOptions): Promise<PrintJobListResponse> {
    if (this.httpClient.isMockMode()) {
      return this.mockListJobs(options);
    }

    const axios = this.httpClient.getAxios();

    try {
      const response = await axios.get("/print-jobs/", {
        params: {
          limit: options?.limit || 50,
          offset: options?.offset || 0,
          status: options?.status,
          created_after: options?.created_after,
          created_before: options?.created_before,
        },
      });

      return {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: (response.data.results || []).map((r: any) =>
          this.mapPrintJobResponse(r),
        ),
      };
    } catch (error) {
      throw parseLuluError(error);
    }
  }

  /**
   * Find a job by external_id (for idempotency check)
   */
  private async findJobByExternalId(
    externalId: string,
  ): Promise<PrintJob | null> {
    if (this.httpClient.isMockMode()) {
      for (const job of this.mockJobs.values()) {
        if (job.external_id === externalId) {
          return job;
        }
      }
      return null;
    }

    const axios = this.httpClient.getAxios();

    try {
      const response = await axios.get("/print-jobs/", {
        params: { external_id: externalId, limit: 1 },
      });

      if (response.data.results?.length > 0) {
        return this.mapPrintJobResponse(response.data.results[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // File Validation
  // ==========================================================================

  /**
   * Validate interior PDF before ordering
   */
  async validateInterior(url: string): Promise<ValidationResult> {
    if (this.httpClient.isMockMode()) {
      return { valid: true, errors: [], warnings: [] };
    }

    const axios = this.httpClient.getAxios();

    try {
      const response = await axios.post("/validate-interior/", {
        source_url: url,
      });

      return {
        valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
      };
    } catch (error) {
      throw parseLuluError(error);
    }
  }

  /**
   * Validate cover PDF before ordering
   */
  async validateCover(
    url: string,
    pageCount: number,
    podPackageId: string,
  ): Promise<ValidationResult> {
    if (this.httpClient.isMockMode()) {
      return { valid: true, errors: [], warnings: [] };
    }

    const axios = this.httpClient.getAxios();

    try {
      const response = await axios.post("/validate-cover/", {
        source_url: url,
        page_count: pageCount,
        pod_package_id: podPackageId,
      });

      return {
        valid: response.data.is_valid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
      };
    } catch (error) {
      throw parseLuluError(error);
    }
  }

  /**
   * Get required cover dimensions for a book
   */
  async getCoverDimensions(
    pageCount: number,
    podPackageId: string,
  ): Promise<CoverDimensions> {
    if (this.httpClient.isMockMode()) {
      // Mock cover dimensions for 6x9 paperback
      return {
        width: 12.26,
        height: 9.25,
        spine_width: 0.41,
        bleed: 0.125,
        unit: "in",
      };
    }

    const axios = this.httpClient.getAxios();

    try {
      const response = await axios.post("/cover-dimensions/", {
        page_count: pageCount,
        pod_package_id: podPackageId,
      });

      return {
        width: response.data.width,
        height: response.data.height,
        spine_width: response.data.spine_width,
        bleed: response.data.bleed,
        unit: response.data.unit || "in",
      };
    } catch (error) {
      throw parseLuluError(error);
    }
  }

  // ==========================================================================
  // Polling / Watch
  // ==========================================================================

  /**
   * Poll for job status until terminal state or timeout
   *
   * @param jobId - Job to watch
   * @param onStatusChange - Callback when status changes
   * @param intervalMs - Polling interval (default 30s)
   * @param timeoutMs - Max time to poll (default 24h)
   */
  async watchJob(
    jobId: string,
    onStatusChange?: (job: PrintJob) => void,
    intervalMs = 30_000,
    timeoutMs = 86_400_000,
  ): Promise<PrintJob> {
    const startTime = Date.now();
    let lastStatus: PrintJobStatus | undefined;

    const terminalStatuses: PrintJobStatus[] = ["SHIPPED", "CANCELED", "ERROR"];

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJobStatus(jobId);

      // Notify on status change
      if (lastStatus !== job.status) {
        lastStatus = job.status;
        Logger.info(`Job ${jobId}: ${job.status}`);
        onStatusChange?.(job);
      }

      // Return if terminal status
      if (terminalStatuses.includes(job.status)) {
        return job;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Watching job ${jobId} timed out after ${timeoutMs}ms`);
  }

  // ==========================================================================
  // Mock Implementations
  // ==========================================================================

  private mockCalculateCost(
    items: LineItem[],
    _address: ShippingAddress,
    shippingLevel?: ShippingLevel,
  ): CostEstimate {
    const itemCosts = items.map((item) => ({
      quantity: item.quantity,
      unit_cost: 4.23,
      total_cost: item.quantity * 4.23,
      currency: "USD",
    }));

    const printTotal = itemCosts.reduce((sum, i) => sum + i.total_cost, 0);
    const shippingCost = shippingLevel === "EXPEDITED" ? 12.99 : 5.99;
    const tax = (printTotal + shippingCost) * 0.05;

    return {
      line_items: itemCosts,
      shipping: [
        { level: shippingLevel || "GROUND", cost: shippingCost, currency: "USD" },
      ],
      tax,
      total: printTotal + shippingCost + tax,
      currency: "USD",
    };
  }

  private mockGetShippingOptions(): ShippingOption[] {
    return [
      {
        level: "MAIL",
        name: "Standard Mail",
        cost: 3.99,
        currency: "USD",
        estimated_days: { min: 7, max: 14 },
        tracking_supported: false,
      },
      {
        level: "GROUND",
        name: "Ground Shipping",
        cost: 5.99,
        currency: "USD",
        estimated_days: { min: 5, max: 8 },
        tracking_supported: true,
      },
      {
        level: "PRIORITY_MAIL",
        name: "Priority Mail",
        cost: 7.99,
        currency: "USD",
        estimated_days: { min: 3, max: 5 },
        tracking_supported: true,
      },
      {
        level: "EXPEDITED",
        name: "Expedited",
        cost: 12.99,
        currency: "USD",
        estimated_days: { min: 2, max: 3 },
        tracking_supported: true,
      },
    ];
  }

  private mockCreatePrintJob(
    items: LineItem[],
    address: ShippingAddress,
    shippingLevel: ShippingLevel,
    externalId: string,
  ): PrintJob {
    const jobId = `pj-mock-${Date.now()}`;
    const now = new Date().toISOString();

    const job: MockPrintJob = {
      id: jobId,
      status: "CREATED",
      line_items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        pod_package_id: item.pod_package_id,
      })),
      shipping_address: address,
      shipping_level: shippingLevel,
      costs: {
        total_cost_excl_tax: 10.22,
        total_cost_incl_tax: 10.73,
        tax: 0.51,
        shipping_cost: 5.99,
        currency: "USD",
      },
      external_id: externalId,
      created_at: now,
      updated_at: now,
      _mockStatus: "CREATED",
      _mockCreatedAt: Date.now(),
    };

    this.mockJobs.set(jobId, job);
    Logger.info(`[MOCK] Created print job: ${jobId}`);

    return job;
  }

  private mockGetJobStatus(jobId: string): PrintJob {
    const job = this.mockJobs.get(jobId);
    if (!job) {
      throw new LuluNotFoundError("PrintJob", jobId);
    }

    // Simulate status progression based on time
    const elapsed = Date.now() - job._mockCreatedAt;
    if (elapsed > 60_000) job._mockStatus = "IN_PRODUCTION";
    if (elapsed > 120_000) job._mockStatus = "SHIPPED";

    return { ...job, status: job._mockStatus };
  }

  private mockCancelJob(jobId: string): void {
    const job = this.mockJobs.get(jobId);
    if (!job) {
      throw new LuluNotFoundError("PrintJob", jobId);
    }

    const cancelableStatuses: PrintJobStatus[] = [
      "CREATED",
      "UNPAID",
      "PAYMENT_IN_PROGRESS",
    ];

    if (!cancelableStatuses.includes(job._mockStatus)) {
      throw new LuluJobNotCancelableError(jobId, job._mockStatus);
    }

    job._mockStatus = "CANCELED";
    job.status = "CANCELED";
    Logger.info(`[MOCK] Canceled print job: ${jobId}`);
  }

  private mockListJobs(options?: PrintJobListOptions): PrintJobListResponse {
    let jobs = Array.from(this.mockJobs.values());

    if (options?.status) {
      jobs = jobs.filter((j) => j._mockStatus === options.status);
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const results = jobs.slice(offset, offset + limit);

    return {
      count: jobs.length,
      next: offset + limit < jobs.length ? "next" : null,
      previous: offset > 0 ? "previous" : null,
      results,
    };
  }

  // ==========================================================================
  // Response Mapping
  // ==========================================================================

  private mapCostResponse(data: any): CostEstimate {
    return {
      line_items: (data.line_items || []).map((item: any) => ({
        quantity: item.quantity,
        unit_cost: item.unit_cost || item.cost_per_unit,
        total_cost: item.total_cost || item.cost,
        currency: item.currency || data.currency || "USD",
      })),
      shipping: (data.shipping_options || []).map((opt: any) => ({
        level: opt.level,
        cost: opt.cost || opt.price,
        currency: opt.currency || data.currency || "USD",
      })),
      tax: data.tax || data.tax_amount || 0,
      total: data.total || data.total_cost || 0,
      currency: data.currency || "USD",
    };
  }

  private mapPrintJobResponse(data: any): PrintJob {
    return {
      id: data.id,
      status: data.status?.name || data.status,
      line_items: (data.line_items || []).map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
        pod_package_id: item.pod_package_id,
        tracking: item.tracking,
      })),
      shipping_address: data.shipping_address,
      shipping_level: data.shipping_level || data.shipping_option_level,
      costs: {
        total_cost_excl_tax: data.costs?.total_cost_excl_tax || 0,
        total_cost_incl_tax: data.costs?.total_cost_incl_tax || 0,
        tax: data.costs?.tax || 0,
        shipping_cost: data.costs?.shipping_cost || 0,
        currency: data.costs?.currency || "USD",
      },
      external_id: data.external_id,
      contact_email: data.contact_email,
      production_delay_minutes: data.production_delay_minutes,
      created_at: data.date_created || data.created_at,
      updated_at: data.date_modified || data.updated_at,
      estimated_ship_date: data.estimated_ship_date,
    };
  }
}

export default LuluPrintService;
