import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import pRetry from 'p-retry';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/logger.js';

interface LuluConfig {
  apiKey: string;
  apiSecret: string;
  sandbox?: boolean;
  mockMode?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface OAuth2Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
}

interface Project {
  id: string;
  title: string;
  status: string;
  created_date: string;
  modified_date: string;
}

interface PricingOptions {
  currency: string;
  price: number;
  territories?: string[];
}

interface BookDetails {
  title: string;
  author: string;
  description?: string;
  isbn?: string;
  category?: string;
  keywords?: string[];
  language?: string;
  copyright_year?: number;
}

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  result?: any;
}

export class LuluService {
  private client: AxiosInstance;
  private config: LuluConfig;
  private token?: OAuth2Token;
  private mockProjects: Map<string, Project> = new Map();
  private mockJobs: Map<string, JobStatus> = new Map();

  constructor(config: LuluConfig) {
    this.config = {
      sandbox: true,
      mockMode: false,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    const baseURL = this.config.sandbox 
      ? 'https://api.sandbox.lulu.com'
      : 'https://api.lulu.com';

    this.client = axios.create({
      baseURL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (!config.url?.includes('/auth/') && !this.config.mockMode) {
          const token = await this.ensureValidToken();
          config.headers.Authorization = `Bearer ${token.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          Logger.debug('Token expired, refreshing...');
          this.token = undefined;
          return this.client.request(error.config!);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with Lulu API using OAuth2
   */
  private async authenticate(): Promise<OAuth2Token> {
    if (this.config.mockMode) {
      return {
        access_token: 'mock-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'print-api',
        created_at: Date.now()
      };
    }

    const authUrl = '/auth/realms/glasstree/protocol/openid-connect/token';
    
    const formData = new URLSearchParams();
    formData.append('client_id', this.config.apiKey);
    formData.append('client_secret', this.config.apiSecret);
    formData.append('grant_type', 'client_credentials');

    try {
      const response = await this.client.post(authUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const token: OAuth2Token = {
        ...response.data,
        created_at: Date.now()
      };

      Logger.debug('Successfully authenticated with Lulu API');
      return token;
    } catch (error) {
      Logger.error('Failed to authenticate with Lulu API', error);
      throw new Error(`Authentication failed: ${this.extractErrorMessage(error)}`);
    }
  }

  /**
   * Ensure we have a valid token
   */
  private async ensureValidToken(): Promise<OAuth2Token> {
    if (!this.token || this.isTokenExpired()) {
      this.token = await this.authenticate();
    }
    return this.token;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.token) return true;
    const expiresAt = this.token.created_at + (this.token.expires_in * 1000);
    const buffer = 60000; // 1 minute buffer
    return Date.now() > (expiresAt - buffer);
  }

  /**
   * Create a new book project
   */
  async createProject(details: BookDetails): Promise<Project> {
    if (this.config.mockMode) {
      const project: Project = {
        id: `mock-project-${Date.now()}`,
        title: details.title,
        status: 'draft',
        created_date: new Date().toISOString(),
        modified_date: new Date().toISOString()
      };
      this.mockProjects.set(project.id, project);
      Logger.info(`[MOCK] Created project: ${project.id}`);
      return project;
    }

    return pRetry(
      async () => {
        const response = await this.client.post('/projects', {
          title: details.title,
          author: details.author,
          description: details.description,
          isbn: details.isbn,
          category: details.category,
          keywords: details.keywords?.join(','),
          language: details.language || 'en',
          copyright_year: details.copyright_year || new Date().getFullYear()
        });

        Logger.info(`Created project: ${response.data.id}`);
        return response.data;
      },
      {
        retries: this.config.retryAttempts,
        minTimeout: this.config.retryDelay,
        onFailedAttempt: (error) => {
          Logger.warn(`Create project attempt ${error.attemptNumber} failed: ${error.message}`);
        }
      }
    );
  }

  /**
   * Upload interior PDF
   */
  async uploadInteriorPdf(projectId: string, pdfPath: string): Promise<void> {
    if (this.config.mockMode) {
      try {
        const stats = await fs.stat(pdfPath);
        Logger.info(`[MOCK] Uploaded interior PDF: ${path.basename(pdfPath)} (${stats.size} bytes)`);
      } catch {
        Logger.info(`[MOCK] Uploaded interior PDF: ${path.basename(pdfPath)} (mock file)`);
      }
      return;
    }

    return pRetry(
      async () => {
        const fileBuffer = await fs.readFile(pdfPath);
        const form = new FormData();
        form.append('file', fileBuffer, {
          filename: path.basename(pdfPath),
          contentType: 'application/pdf'
        });

        await this.client.post(
          `/projects/${projectId}/interior`,
          form,
          {
            headers: {
              ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );

        Logger.info(`Uploaded interior PDF for project ${projectId}`);
      },
      {
        retries: this.config.retryAttempts,
        minTimeout: this.config.retryDelay,
        factor: 2, // Exponential backoff
        onFailedAttempt: (error) => {
          Logger.warn(`Upload interior attempt ${error.attemptNumber} failed: ${error.message}`);
        }
      }
    );
  }

  /**
   * Upload cover PDF with dimension validation
   */
  async uploadCoverPdf(projectId: string, pdfPath: string): Promise<void> {
    if (this.config.mockMode) {
      try {
        const stats = await fs.stat(pdfPath);
        Logger.info(`[MOCK] Uploaded cover PDF: ${path.basename(pdfPath)} (${stats.size} bytes)`);
      } catch {
        Logger.info(`[MOCK] Uploaded cover PDF: ${path.basename(pdfPath)} (mock file)`);
      }
      return;
    }

    // TODO: Add dimension validation using pdf-lib or similar
    // Dimensions should match book specifications

    return pRetry(
      async () => {
        const fileBuffer = await fs.readFile(pdfPath);
        const form = new FormData();
        form.append('file', fileBuffer, {
          filename: path.basename(pdfPath),
          contentType: 'application/pdf'
        });

        await this.client.post(
          `/projects/${projectId}/cover`,
          form,
          {
            headers: {
              ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );

        Logger.info(`Uploaded cover PDF for project ${projectId}`);
      },
      {
        retries: this.config.retryAttempts,
        minTimeout: this.config.retryDelay,
        factor: 2,
        onFailedAttempt: (error) => {
          Logger.warn(`Upload cover attempt ${error.attemptNumber} failed: ${error.message}`);
        }
      }
    );
  }

  /**
   * Set pricing for territories
   */
  async setPricing(projectId: string, pricing: PricingOptions[]): Promise<void> {
    if (this.config.mockMode) {
      Logger.info(`[MOCK] Set pricing for project ${projectId}:`);
      Logger.debug(JSON.stringify(pricing, null, 2));
      return;
    }

    return pRetry(
      async () => {
        const pricingData = pricing.map(p => ({
          currency_code: p.currency,
          price: p.price,
          territories: p.territories || ['WORLD']
        }));

        await this.client.put(`/projects/${projectId}/pricing`, {
          pricing: pricingData
        });

        Logger.info(`Set pricing for project ${projectId}`);
      },
      {
        retries: this.config.retryAttempts,
        minTimeout: this.config.retryDelay,
        onFailedAttempt: (error) => {
          Logger.warn(`Set pricing attempt ${error.attemptNumber} failed: ${error.message}`);
        }
      }
    );
  }

  /**
   * Publish project to make it available for sale
   */
  async publishProject(projectId: string): Promise<string> {
    if (this.config.mockMode) {
      const project = this.mockProjects.get(projectId);
      if (project) {
        project.status = 'published';
      }
      const jobId = `mock-job-${Date.now()}`;
      this.mockJobs.set(jobId, {
        id: jobId,
        status: 'completed',
        progress: 100
      });
      Logger.info(`[MOCK] Published project ${projectId}, job ID: ${jobId}`);
      return jobId;
    }

    return pRetry(
      async () => {
        const response = await this.client.post(`/projects/${projectId}/publish`);
        const jobId = response.data.job_id || response.data.id;
        Logger.info(`Published project ${projectId}, job ID: ${jobId}`);
        return jobId;
      },
      {
        retries: this.config.retryAttempts,
        minTimeout: this.config.retryDelay,
        onFailedAttempt: (error) => {
          Logger.warn(`Publish attempt ${error.attemptNumber} failed: ${error.message}`);
        }
      }
    );
  }

  /**
   * Check job status for async operations
   */
  async checkJobStatus(jobId: string): Promise<JobStatus> {
    if (this.config.mockMode) {
      const job = this.mockJobs.get(jobId) || {
        id: jobId,
        status: 'completed' as const,
        progress: 100
      };
      Logger.debug(`[MOCK] Job ${jobId} status: ${job.status}`);
      return job;
    }

    try {
      const response = await this.client.get(`/jobs/${jobId}`);
      return {
        id: jobId,
        status: response.data.status,
        progress: response.data.progress,
        error: response.data.error,
        result: response.data.result
      };
    } catch (error) {
      Logger.error(`Failed to check job status: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Wait for job completion with polling
   */
  async waitForJob(jobId: string, timeoutMs: number = 300000): Promise<JobStatus> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.checkJobStatus(jobId);
      
      if (status.status === 'completed') {
        Logger.info(`Job ${jobId} completed successfully`);
        return status;
      }
      
      if (status.status === 'failed') {
        throw new Error(`Job ${jobId} failed: ${status.error}`);
      }

      Logger.debug(`Job ${jobId} status: ${status.status} (${status.progress}%)`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
  }

  /**
   * Get project details
   */
  async getProject(projectId: string): Promise<Project> {
    if (this.config.mockMode) {
      const project = this.mockProjects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      return project;
    }

    try {
      const response = await this.client.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      Logger.error(`Failed to get project: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * List all projects
   */
  async listProjects(limit: number = 50, offset: number = 0): Promise<Project[]> {
    if (this.config.mockMode) {
      return Array.from(this.mockProjects.values()).slice(offset, offset + limit);
    }

    try {
      const response = await this.client.get('/projects', {
        params: { limit, offset }
      });
      return response.data.results || [];
    } catch (error) {
      Logger.error(`Failed to list projects: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    if (this.config.mockMode) {
      this.mockProjects.delete(projectId);
      Logger.info(`[MOCK] Deleted project ${projectId}`);
      return;
    }

    try {
      await this.client.delete(`/projects/${projectId}`);
      Logger.info(`Deleted project ${projectId}`);
    } catch (error) {
      Logger.error(`Failed to delete project: ${this.extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || 
             error.response?.data?.error || 
             error.message;
    }
    return error?.message || 'Unknown error';
  }
}

export default LuluService;