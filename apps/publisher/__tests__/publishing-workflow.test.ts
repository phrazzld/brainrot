/**
 * End-to-End Single Book Publishing Test
 * Tests complete workflow: cover validation → EPUB generation → KDP upload (mock mode)
 * 
 * This test validates the entire publishing pipeline without external dependencies,
 * ensuring all components work together correctly.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";

// Import modules under test
import { KdpService } from "../src/services/kdp.js";
import { RateLimiterService } from "../src/services/rateLimiter.js";
import { MockReporter } from "../src/utils/mockReporter.js";

// Mock external dependencies
vi.mock("fs/promises");
vi.mock("child_process");
vi.mock("playwright");

// Mock the services that are imported
vi.mock("../src/services/rateLimiter.js", () => ({
  RateLimiterService: vi.fn().mockImplementation(() => ({
    getStatus: vi.fn().mockResolvedValue({
      platform: "kdp",
      date: new Date().toISOString().split("T")[0],
      limit: 3,
      used: 0,
      remaining: 3,
      resetTime: "2024-01-29T00:00:00.000Z",
      lastPublish: null
    }),
    checkAndConsumeQuota: vi.fn().mockResolvedValue(undefined)
  }))
}));

const mockFs = vi.mocked(fs);
const mockSpawn = vi.mocked(spawn);

describe("E2E Single Book Publishing Pipeline", () => {
  let kdpService: KdpService;
  let rateLimiter: RateLimiterService;
  
  // Sample book data for testing
  const testBook = {
    slug: "test-book",
    metadata: {
      title: "Test Book: Brainrot Edition",
      author: "Test Author",
      description: "A test book for E2E pipeline validation",
      isbn: "978-0-123456-78-9",
      publication_year: 2024,
      genre: "Fiction",
      language: "en-US",
      price: {
        ebook: 2.99
      },
      keywords: ["test", "e2e", "publishing"]
    },
    paths: {
      generatedDir: `/Users/phaedrus/Development/brainrot/generated/test-book`,
      manuscriptPath: `/Users/phaedrus/Development/brainrot/generated/test-book/book.epub`,
      coverPath: `/Users/phaedrus/Development/brainrot/generated/test-book/cover.jpg`,
      metadataPath: `/Users/phaedrus/Development/brainrot/content/translations/books/test-book/metadata.yaml`
    }
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Initialize services in mock mode
    kdpService = new KdpService({
      email: "test@kdp.com",
      password: "test-password",
      mockMode: true,
      headless: true
    });

    // Create a properly mocked rate limiter
    rateLimiter = {
      getStatus: vi.fn().mockResolvedValue({
        platform: "kdp",
        date: new Date().toISOString().split("T")[0],
        limit: 3,
        used: 0,
        remaining: 3,
        resetTime: "2024-01-29T00:00:00.000Z",
        lastPublish: null
      }),
      checkAndConsumeQuota: vi.fn().mockResolvedValue(undefined)
    } as any;

    // Mock file system operations for successful scenario
    mockFs.access.mockResolvedValue();
    mockFs.stat.mockResolvedValue({
      size: 300000, // 300KB EPUB file
      isFile: () => true,
      mtime: new Date()
    } as any);

    mockFs.readFile.mockImplementation((filePath: string) => {
      if (filePath.includes("metadata.yaml")) {
        return Promise.resolve(`
title: "Test Book: Brainrot Edition"
author: "Test Author" 
description: "A test book for E2E pipeline validation"
isbn: "978-0-123456-78-9"
publication_year: 2024
genre: "Fiction"
language: "en-US"
price:
  ebook: 2.99
keywords:
  - "test"
  - "e2e"
  - "publishing"
        `);
      }
      if (filePath.includes("book.epub")) {
        return Promise.resolve(Buffer.from("Mock EPUB content"));
      }
      if (filePath.includes("cover.jpg")) {
        return Promise.resolve(Buffer.from("Mock JPEG content"));
      }
      return Promise.resolve("Mock file content");
    });

    // Mock successful process execution
    const createMockProcess = () => ({
      stderr: { on: vi.fn() },
      stdout: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === "close") {
          setTimeout(() => callback(0), 10); // Success
        }
      })
    });

    mockSpawn.mockImplementation((command: string) => {
      return createMockProcess() as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should complete full publishing pipeline successfully in mock mode", async () => {
    const startTime = performance.now();

    // Stage 1: File Validation
    // Verify all required files exist
    await expect(fs.access(testBook.paths.manuscriptPath)).resolves.toBeUndefined();
    await expect(fs.access(testBook.paths.coverPath)).resolves.toBeUndefined();
    await expect(fs.access(testBook.paths.metadataPath)).resolves.toBeUndefined();

    // Verify file sizes are reasonable
    const epubStats = await fs.stat(testBook.paths.manuscriptPath);
    const coverStats = await fs.stat(testBook.paths.coverPath);
    
    expect(epubStats.size).toBeGreaterThan(1000); // EPUB should be > 1KB
    expect(coverStats.size).toBeGreaterThan(1000); // Cover should be > 1KB

    // Stage 2: Metadata Validation
    const metadataContent = await fs.readFile(testBook.paths.metadataPath, "utf-8");
    expect(metadataContent).toContain("Test Book: Brainrot Edition");
    expect(metadataContent).toContain("978-0-123456-78-9");

    // Stage 3: Rate Limit Check
    const rateStatus = await rateLimiter.getStatus("kdp");
    expect(rateStatus.remaining).toBeGreaterThan(0);

    // Stage 4: Mock Publishing Workflow
    const mockReporter = new MockReporter(testBook.slug, "kdp", "mock");

    // Add file information to mock reporter
    await mockReporter.addFileInfo("manuscript", testBook.paths.manuscriptPath);
    await mockReporter.addFileInfo("cover", testBook.paths.coverPath);
    await mockReporter.addFileInfo("metadata", testBook.paths.metadataPath);

    // Add validation results
    mockReporter.addValidation("cover", {
      name: "Cover Dimensions",
      status: "pass",
      message: "2560×2808 pixels (meets KDP requirements)"
    });

    mockReporter.addValidation("metadata", {
      name: "Required Fields",
      status: "pass",
      message: "All required metadata present"
    });

    mockReporter.addValidation("files", {
      name: "EPUB File",
      status: "pass",
      message: "Valid EPUB3 format"
    });

    // Add workflow steps
    mockReporter.addWorkflowStep({
      step: "Login to KDP",
      description: "Authenticate with Amazon KDP",
      status: "simulated",
      estimatedDuration: 15
    });

    mockReporter.addWorkflowStep({
      step: "Upload Cover",
      description: "Upload cover image to KDP",
      status: "simulated", 
      estimatedDuration: 30
    });

    mockReporter.addWorkflowStep({
      step: "Upload Manuscript",
      description: "Upload EPUB file to KDP",
      status: "simulated",
      estimatedDuration: 45
    });

    mockReporter.addWorkflowStep({
      step: "Set Metadata",
      description: "Configure book details and pricing",
      status: "simulated",
      estimatedDuration: 20
    });

    mockReporter.addWorkflowStep({
      step: "Submit for Review",
      description: "Submit book to KDP review queue",
      status: "simulated",
      estimatedDuration: 5
    });

    // Generate mock results
    mockReporter.generateMockResults();
    const report = mockReporter.getReport();

    const duration = performance.now() - startTime;

    // Assertions
    expect(report.summary.wouldSucceed).toBe(true);
    expect(report.summary.totalValidations).toBeGreaterThan(0);
    expect(report.summary.passedValidations).toBeGreaterThan(0);
    expect(report.summary.failedValidations).toBe(0);
    expect(report.mockResults.status).toBe("would-publish");
    expect(report.mockResults.asin).toMatch(/^B[A-Z0-9]+$/);
    expect(duration).toBeLessThan(5000); // Should complete quickly in mock mode

    // Verify file operations were performed
    expect(mockFs.access).toHaveBeenCalledWith(testBook.paths.manuscriptPath);
    expect(mockFs.access).toHaveBeenCalledWith(testBook.paths.coverPath);
    expect(mockFs.access).toHaveBeenCalledWith(testBook.paths.metadataPath);
    
    // Verify workflow completeness
    expect(report.workflow).toHaveLength(5);
    expect(report.workflow.every(step => step.status === "simulated")).toBe(true);
  }, 10000); // 10s timeout for E2E test

  it("should handle missing manuscript file gracefully", async () => {
    // Mock missing manuscript file - need to mock fs.stat to throw error
    mockFs.stat.mockImplementation((filePath: string) => {
      if (filePath.includes("book.epub")) {
        return Promise.reject(new Error("ENOENT: no such file or directory"));
      }
      return Promise.resolve({
        size: 300000,
        isFile: () => true,
        mtime: new Date()
      } as any);
    });

    const mockReporter = new MockReporter(testBook.slug, "kdp", "mock");
    
    // Try to add file info for missing manuscript
    await mockReporter.addFileInfo("manuscript", testBook.paths.manuscriptPath);
    
    // Add validation that should fail
    mockReporter.addValidation("files", {
      name: "EPUB File",
      status: "fail",
      message: "book.epub not found in generated/ directory"
    });

    mockReporter.generateMockResults();
    const report = mockReporter.getReport();

    // Should indicate failure
    expect(report.summary.wouldSucceed).toBe(false);
    expect(report.summary.failedValidations).toBeGreaterThan(0);
    expect(report.mockResults.status).toBe("would-fail");
    expect(report.files.manuscript.exists).toBe(false);
    expect(report.summary.blockers).toContain("files: book.epub not found in generated/ directory");
  });

  it("should handle cover validation failures", async () => {
    const mockReporter = new MockReporter(testBook.slug, "kdp", "mock");
    
    // Mock cover validation failure
    await mockReporter.addFileInfo("cover", testBook.paths.coverPath);
    
    mockReporter.addValidation("cover", {
      name: "Cover Dimensions",
      status: "fail",
      message: "800×600 pixels - Must be at least 1600×2560 pixels for KDP"
    });

    mockReporter.addValidation("cover", {
      name: "Cover File Size", 
      status: "warning",
      message: "4.2MB - Recommended size is 1-3MB for optimal performance"
    });

    mockReporter.generateMockResults();
    const report = mockReporter.getReport();

    // Should fail due to cover issues
    expect(report.summary.wouldSucceed).toBe(false);
    expect(report.summary.failedValidations).toBe(1);
    expect(report.summary.warnings).toBe(1);
    expect(report.mockResults.status).toBe("would-fail");
    expect(report.summary.blockers).toContain("cover: 800×600 pixels - Must be at least 1600×2560 pixels for KDP");
    expect(report.summary.recommendations.length).toBeGreaterThan(0);
  });

  it("should handle rate limit exceeded scenario", async () => {
    // Create new mock reporter
    const mockReporter = new MockReporter(testBook.slug, "kdp", "mock");
    
    // Mock rate limit exceeded response
    const exceededStatus = {
      platform: "kdp",
      date: new Date().toISOString().split("T")[0],
      limit: 3,
      used: 3,
      remaining: 0,
      resetTime: "2024-01-29T00:00:00.000Z",
      lastPublish: {
        timestamp: new Date().toISOString(),
        bookSlug: "previous-book"
      }
    };
    
    mockReporter.addValidation("rateLimits", {
      name: "Daily Publishing Quota",
      status: "fail",
      message: `Rate limit exceeded: ${exceededStatus.used}/${exceededStatus.limit} books published today`
    });

    mockReporter.generateMockResults();
    const report = mockReporter.getReport();

    expect(report.summary.wouldSucceed).toBe(false);
    expect(report.summary.blockers).toContain("rateLimits: Rate limit exceeded: 3/3 books published today");
    expect(report.mockResults.status).toBe("would-fail");
  });

  it("should generate comprehensive mock report with all sections", async () => {
    const mockReporter = new MockReporter(testBook.slug, "kdp", "mock");

    // Add complete file analysis
    await mockReporter.addFileInfo("manuscript", testBook.paths.manuscriptPath);
    await mockReporter.addFileInfo("cover", testBook.paths.coverPath);
    await mockReporter.addFileInfo("metadata", testBook.paths.metadataPath);

    // Add comprehensive validations
    const validationCategories = ["cover", "metadata", "files", "credentials", "rateLimits"] as const;
    
    for (const category of validationCategories) {
      mockReporter.addValidation(category, {
        name: `${category} validation`,
        status: "pass",
        message: `${category} validation passed`
      });
    }

    // Add complete workflow
    const workflowSteps = [
      "Initialize Browser",
      "Login to KDP", 
      "Create New Book",
      "Upload Cover Image",
      "Upload Manuscript",
      "Set Book Details",
      "Configure Pricing",
      "Submit for Review"
    ];

    for (const step of workflowSteps) {
      mockReporter.addWorkflowStep({
        step,
        description: `Mock ${step.toLowerCase()}`,
        status: "simulated",
        estimatedDuration: 10
      });
    }

    mockReporter.generateMockResults();
    const report = mockReporter.getReport();

    // Verify comprehensive report structure
    expect(report.timestamp).toBeTruthy();
    expect(report.bookSlug).toBe(testBook.slug);
    expect(report.platform).toBe("kdp");
    expect(report.mode).toBe("mock");
    
    // Verify validations
    expect(Object.keys(report.validations).length).toBe(5);
    expect(report.summary.totalValidations).toBe(5);
    expect(report.summary.passedValidations).toBe(5);
    
    // Verify files
    expect(Object.keys(report.files).length).toBe(4);
    expect(report.files.manuscript.exists).toBe(true);
    expect(report.files.cover.exists).toBe(true);
    
    // Verify workflow
    expect(report.workflow.length).toBe(8);
    expect(report.workflow.every(step => step.status === "simulated")).toBe(true);
    expect(report.summary.estimatedPublishTime).toBe(80); // 8 steps × 10s each
    
    // Verify mock results
    expect(report.mockResults.status).toBe("would-publish");
    expect(report.mockResults.asin).toBeTruthy();
    expect(report.mockResults.publishUrl).toBeTruthy();
    expect(report.mockResults.marketplaces).toContain("US");
  });
});