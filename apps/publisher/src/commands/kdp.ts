import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { KdpService } from "../services/kdp.js";
import { ConfigManager } from "../utils/config.js";
import { Logger } from "../utils/logger.js";
import { MockReporter, type MockValidationResult } from "../utils/mockReporter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface KdpPublishOptions {
  book: string;
  dryRun?: boolean;
  headless?: boolean;
  mock?: boolean;
  publish?: boolean;
  verbose?: boolean;
}

interface KdpValidateCoverOptions {
  strict?: boolean;
  mock?: boolean;
  verbose?: boolean;
}

interface KdpProcessCoverOptions {
  dpi?: string;
  quality?: string;
  format?: string;
  force?: boolean;
  mock?: boolean;
  verbose?: boolean;
}

export function createKdpCommand(): Command {
  const kdpCommand = new Command("kdp")
    .description("Publish books to Amazon KDP")
    .option("--headless", "Run browser in headless mode", true)
    .option("--headed", "Run browser with visible UI for debugging")
    .option("--mock", "Run in mock mode without actual browser automation");

  kdpCommand
    .command("publish <book>")
    .description("Publish a book to Amazon KDP")
    .option("--dry-run", "Simulate publishing without making actual changes")
    .option("--draft", "Save as draft instead of publishing live")
    .option("--publish", "Publish immediately (default is draft)")
    .action(async (book: string, options: KdpPublishOptions, command) => {
      const parentOptions = command.parent.opts();
      await publishToKdp(book, {
        ...options,
        ...parentOptions,
        headless: !parentOptions.headed,
      });
    });

  kdpCommand
    .command("login")
    .description("Test KDP login")
    .action(async (options, command) => {
      const parentOptions = command.parent.opts();
      await testLogin({
        ...parentOptions,
        headless: !parentOptions.headed,
      });
    });

  kdpCommand
    .command("check")
    .description("Check KDP credentials and browser setup")
    .action(async (options, command) => {
      const parentOptions = command.parent.opts();
      await checkSetup(parentOptions);
    });

  kdpCommand
    .command("validate-cover <book>")
    .description("Validate cover image for KDP publishing requirements")
    .option("--strict", "Fail on quality warnings as well as technical errors")
    .action(async (book: string, options, command) => {
      const parentOptions = command.parent.opts();
      await validateCover(book, {
        ...options,
        ...parentOptions,
      });
    });

  kdpCommand
    .command("process-cover <book> <coverPath>")
    .description("Auto-process cover image for KDP publishing (convert, normalize, validate)")
    .option("--dpi <number>", "Target DPI for output image", "300")
    .option("--quality <number>", "JPEG quality (1-100)", "90") 
    .option("--format <format>", "Output format (jpeg|png)", "jpeg")
    .option("--force", "Overwrite existing processed cover")
    .action(async (book: string, coverPath: string, options, command) => {
      const parentOptions = command.parent.opts();
      await processCoverCommand(book, coverPath, {
        ...options,
        ...parentOptions,
      });
    });

  kdpCommand
    .command("status")
    .description("Show current publishing rate limit status")
    .action(async (options, command) => {
      const parentOptions = command.parent.opts();
      await showRateLimitStatus({
        ...parentOptions,
      });
    });

  return kdpCommand;
}

async function publishToKdp(bookSlug: string, options: KdpPublishOptions) {
  const spinner = ora("Initializing KDP publishing...").start();

  try {
    // Load configuration
    await ConfigManager.load();
    const kdpConfig = ConfigManager.get("kdp") || {
      email: process.env.KDP_EMAIL,
      password: process.env.KDP_PASSWORD,
    };

    // Enhanced mock mode with detailed reporting
    if (options.mock || options.dryRun) {
      kdpConfig.email = kdpConfig.email || "mock@example.com";
      kdpConfig.password = kdpConfig.password || "mock-password";
      
      // Use enhanced mock mode reporter
      spinner.text = "Generating publishing preview...";
      await runEnhancedMockMode(bookSlug, options);
      spinner.succeed("Mock publishing preview completed!");
      return;
    }

    if (!kdpConfig.email || !kdpConfig.password) {
      spinner.fail("Missing KDP credentials");
      Logger.error(
        "Please set KDP_EMAIL and KDP_PASSWORD environment variables",
      );
      process.exit(1);
    }

    // Check rate limiting (unless in mock/dry-run mode)
    if (!options.mock && !options.dryRun) {
      spinner.text = "Checking daily rate limits...";
      
      try {
        const { RateLimiterService } = await import("../services/rateLimiter.js");
        const rateLimiter = new RateLimiterService();
        await rateLimiter.checkAndConsumeQuota("kdp", bookSlug);
        
        const status = await rateLimiter.getStatus("kdp");
        Logger.info(`Rate limit OK: ${status.currentCount}/${status.dailyLimit} books published today`);
      } catch (error: any) {
        if (error.name === 'RateLimitExceededError') {
          spinner.fail("Daily rate limit exceeded");
          Logger.error(error.message);
          Logger.info(`Daily limit resets at: ${error.resetTime}`);
          process.exit(1);
        } else {
          // Non-rate-limit errors - log but don't block
          Logger.warning(`Rate limiter warning: ${error.message}`);
        }
      }
    } else {
      Logger.info("Skipping rate limit check (mock/dry-run mode)");
    }

    // Initialize service
    const kdp = new KdpService({
      email: kdpConfig.email,
      password: kdpConfig.password,
      headless: options.headless !== false,
      mockMode: options.mock || options.dryRun,
      screenshotDir: path.join(process.cwd(), "kdp-screenshots"),
    });

    // Load book metadata
    spinner.text = "Loading book metadata...";
    const monorepoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const metadataPath = path.join(
      monorepoRoot,
      "content/translations/books",
      bookSlug,
      "metadata.yaml",
    );

    const metadataContent = await fs.readFile(metadataPath, "utf-8");
    const yaml = await import("js-yaml");
    const metadata = yaml.load(metadataContent) as any;

    if (!metadata.publishing?.kdp) {
      spinner.fail(`Book ${bookSlug} is not configured for KDP publishing`);
      return;
    }

    // Check for generated files
    spinner.text = "Checking for generated files...";
    const generatedDir = path.join(monorepoRoot, "generated", bookSlug);

    const manuscriptPath = path.join(generatedDir, "book.epub");
    const coverPath = path.join(generatedDir, "cover.jpg");

    // Skip file check in mock mode
    if (!options.mock && !options.dryRun) {
      try {
        await fs.access(manuscriptPath);
        await fs.access(coverPath);
      } catch {
        spinner.fail(
          "Missing generated files. Please run generate:formats first.",
        );
        Logger.error(`Expected files at: ${manuscriptPath} and ${coverPath}`);
        return;
      }
    }

    // Prepare book details
    const bookDetails = {
      title: metadata.title,
      subtitle: metadata.subtitle,
      author: metadata.author,
      description: metadata.description,
      keywords: metadata.keywords || [],
      categories: metadata.categories || [],
      language: metadata.language || "en-US",
      isbn: metadata.formats?.ebook?.isbn,
      publishingRights: "worldwide" as const,
    };

    const manuscriptDetails = {
      filePath: manuscriptPath,
      format: "epub" as const,
    };

    const coverDetails = {
      filePath: coverPath,
      format: "jpg" as const,
    };

    const pricingDetails = {
      price: metadata.formats?.ebook?.price || 4.99,
      currency: metadata.formats?.ebook?.currency || "USD",
      marketplaces: [
        "US",
        "UK",
        "DE",
        "FR",
        "ES",
        "IT",
        "NL",
        "JP",
        "BR",
        "CA",
        "MX",
        "AU",
        "IN",
      ],
      royaltyOption: "70%" as const,
      kdpSelect: true,
    };

    // Publish book
    spinner.text = "Starting KDP publishing workflow...";

    try {
      const result = await kdp.publishCompleteBook(
        bookDetails,
        manuscriptDetails,
        coverDetails,
        pricingDetails,
        options.publish === true, // Default to draft unless --publish is specified
      );

      if (result.asin) {
        spinner.succeed(`Successfully published ${metadata.title} to KDP!`);
        Logger.info(`ASIN: ${result.asin}`);
        Logger.info(`View at: https://www.amazon.com/dp/${result.asin}`);
      } else {
        spinner.succeed(
          `Successfully saved ${metadata.title} as draft on KDP!`,
        );
        Logger.info(`Book ID: ${result.bookId}`);
      }

      // Save publishing report
      const reportDir = path.join(monorepoRoot, "publishing-reports");
      await fs.mkdir(reportDir, { recursive: true });

      const report = {
        book: bookSlug,
        platform: "kdp",
        bookId: result.bookId,
        asin: result.asin,
        publishedAt: new Date().toISOString(),
        metadata,
        status: result.asin ? "published" : "draft",
      };

      const reportPath = path.join(
        reportDir,
        `${new Date().toISOString().split("T")[0]}-${bookSlug}-kdp.json`,
      );

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      Logger.info(`Report saved to: ${reportPath}`);
    } finally {
      await kdp.close();
    }
  } catch (error: any) {
    spinner.fail(`Publishing failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function testLogin(options: any) {
  const spinner = ora("Testing KDP login...").start();

  try {
    await ConfigManager.load();
    const kdpConfig = ConfigManager.get("kdp") || {
      email: process.env.KDP_EMAIL,
      password: process.env.KDP_PASSWORD,
    };

    if (options.mock) {
      kdpConfig.email = "mock@example.com";
      kdpConfig.password = "mock-password";
    }

    if (!kdpConfig.email || !kdpConfig.password) {
      spinner.fail("Missing KDP credentials");
      Logger.error(
        "Please set KDP_EMAIL and KDP_PASSWORD environment variables",
      );
      process.exit(1);
    }

    const kdp = new KdpService({
      email: kdpConfig.email,
      password: kdpConfig.password,
      headless: options.headless !== false,
      mockMode: options.mock,
      screenshotDir: path.join(process.cwd(), "kdp-screenshots"),
    });

    await kdp.login();
    spinner.succeed("Successfully logged in to KDP!");

    await kdp.close();
  } catch (error: any) {
    spinner.fail(`Login failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function checkSetup(options: any) {
  const spinner = ora("Checking KDP setup...").start();

  try {
    // Check Playwright installation
    spinner.text = "Checking Playwright installation...";
    try {
      await import("playwright");
      Logger.success("✓ Playwright installed");
    } catch {
      Logger.error("✗ Playwright not installed. Run: pnpm add playwright");
      process.exit(1);
    }

    // Check browser installation
    spinner.text = "Checking browser installation...";
    const { chromium } = await import("playwright");
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      Logger.success("✓ Chromium browser available");
    } catch {
      Logger.error(
        "✗ Chromium not installed. Run: npx playwright install chromium",
      );
      process.exit(1);
    }

    // Check credentials
    spinner.text = "Checking KDP credentials...";
    await ConfigManager.load();
    const kdpConfig = ConfigManager.get("kdp");

    if (kdpConfig?.email && kdpConfig?.password) {
      Logger.success("✓ KDP credentials configured");
    } else if (process.env.KDP_EMAIL && process.env.KDP_PASSWORD) {
      Logger.success("✓ KDP credentials found in environment");
    } else {
      Logger.warning("⚠ KDP credentials not configured");
      Logger.info("Set KDP_EMAIL and KDP_PASSWORD environment variables");
    }

    spinner.succeed("KDP setup check complete");
  } catch (error: any) {
    spinner.fail(`Setup check failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

interface PreflightCheck {
  name: string;
  status: "pass" | "fail" | "warning";
  message?: string;
}

/**
 * Enhanced mock mode with comprehensive reporting and validation preview
 */
async function runEnhancedMockMode(bookSlug: string, options: KdpPublishOptions): Promise<void> {
  const mockMode = options.dryRun ? "dry-run" : "mock";
  const reporter = new MockReporter(bookSlug, "kdp", mockMode);
  
  try {
    // Initialize paths
    const monorepoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const metadataPath = path.join(monorepoRoot, "content/translations/books", bookSlug, "metadata.yaml");
    const generatedDir = path.join(monorepoRoot, "generated", bookSlug);
    const manuscriptPath = path.join(generatedDir, "book.epub");
    const coverPath = path.join(generatedDir, "cover.jpg");
    const legalPath = path.join(generatedDir, "legal.md");
    
    // Add workflow steps
    reporter.addWorkflowStep({
      step: "Credential Validation",
      description: "Verify KDP account credentials",
      status: "simulated",
      estimatedDuration: 2
    });
    
    reporter.addWorkflowStep({
      step: "Rate Limit Check",
      description: "Check daily publishing quota (3 books/day)",
      status: "simulated", 
      estimatedDuration: 1
    });
    
    reporter.addWorkflowStep({
      step: "File Validation",
      description: "Validate manuscript and cover files",
      status: "simulated",
      estimatedDuration: 3
    });
    
    reporter.addWorkflowStep({
      step: "KDP Browser Session",
      description: "Initialize automated browser session",
      status: "skipped",
      estimatedDuration: 10
    });
    
    reporter.addWorkflowStep({
      step: "Book Metadata Upload",
      description: "Submit title, description, and publishing details",
      status: "skipped",
      estimatedDuration: 15
    });
    
    reporter.addWorkflowStep({
      step: "Manuscript Upload",
      description: "Upload EPUB file and validate format",
      status: "skipped",
      estimatedDuration: 30
    });
    
    reporter.addWorkflowStep({
      step: "Cover Upload", 
      description: "Upload cover image and validate dimensions",
      status: "skipped",
      estimatedDuration: 10
    });
    
    reporter.addWorkflowStep({
      step: "Pricing Configuration",
      description: "Set pricing for all selected marketplaces",
      status: "skipped",
      estimatedDuration: 5
    });
    
    reporter.addWorkflowStep({
      step: "Publishing Submission",
      description: options.publish ? "Submit for publishing review" : "Save as draft",
      status: "skipped",
      estimatedDuration: 3
    });
    
    // Validate credentials
    const startTime = Date.now();
    const credentialsValid = validateMockCredentials();
    const credentialTiming = Date.now() - startTime;
    
    reporter.addValidation("credentials", {
      name: "KDP Account Credentials",
      status: credentialsValid ? "pass" : "fail",
      message: credentialsValid ? "Mock credentials provided" : "Missing credentials",
      timing: credentialTiming
    });
    
    // Validate rate limits
    await validateMockRateLimit(reporter);
    
    // Add file information
    await reporter.addFileInfo("metadata", metadataPath);
    await reporter.addFileInfo("manuscript", manuscriptPath);  
    await reporter.addFileInfo("cover", coverPath);
    await reporter.addFileInfo("legal", legalPath);
    
    // Validate metadata
    await validateMockMetadata(reporter, metadataPath);
    
    // Validate files
    await validateMockFiles(reporter, manuscriptPath, coverPath);
    
    // Validate cover using actual validation functions
    if (await fileExists(coverPath)) {
      await validateMockCover(reporter, coverPath, options);
    } else {
      reporter.addValidation("cover", {
        name: "Cover Image",
        status: "fail",
        message: "Cover file not found - run generate:formats or provide cover image"
      });
    }
    
    // Generate final results
    reporter.generateMockResults();
    
    // Display comprehensive report
    reporter.displayReport();
    
    // Save report to file
    await reporter.saveReport();
    
  } catch (error: any) {
    Logger.error(`Mock mode failed: ${error.message}`);
    throw error;
  }
}

/**
 * Validate mock credentials
 */
function validateMockCredentials(): boolean {
  return process.env.KDP_EMAIL !== undefined || process.env.KDP_PASSWORD !== undefined;
}

/**
 * Validate mock rate limits
 */
async function validateMockRateLimit(reporter: MockReporter): Promise<void> {
  try {
    const { RateLimiterService } = await import("../services/rateLimiter.js");
    const rateLimiter = new RateLimiterService();
    const status = await rateLimiter.getStatus("kdp");
    
    const canPublish = status.remaining > 0;
    reporter.addValidation("rateLimits", {
      name: "Daily Publishing Quota",
      status: canPublish ? "pass" : "fail",
      message: `${status.currentCount}/${status.dailyLimit} books published today (${status.remaining} remaining)`
    });
    
  } catch (error: any) {
    reporter.addValidation("rateLimits", {
      name: "Rate Limit Check",
      status: "warning",
      message: `Rate limit service unavailable: ${error.message}`
    });
  }
}

/**
 * Validate mock metadata
 */
async function validateMockMetadata(reporter: MockReporter, metadataPath: string): Promise<void> {
  try {
    if (!(await fileExists(metadataPath))) {
      reporter.addValidation("metadata", {
        name: "Book Metadata",
        status: "fail", 
        message: "metadata.yaml not found"
      });
      return;
    }
    
    const metadataContent = await fs.readFile(metadataPath, "utf-8");
    const yaml = await import("js-yaml");
    const metadata = yaml.load(metadataContent) as any;
    
    // Validate required fields
    const requiredFields = ["title", "author", "description"];
    for (const field of requiredFields) {
      const hasField = metadata[field] && metadata[field].trim().length > 0;
      reporter.addValidation("metadata", {
        name: `Required Field: ${field}`,
        status: hasField ? "pass" : "fail",
        message: hasField ? undefined : `Missing required field: ${field}`
      });
    }
    
    // Validate KDP configuration
    const hasKdpConfig = metadata.publishing?.kdp;
    reporter.addValidation("metadata", {
      name: "KDP Publishing Configuration",
      status: hasKdpConfig ? "pass" : "fail",
      message: hasKdpConfig ? undefined : "No KDP publishing configuration found in metadata"
    });
    
    // Validate ISBN
    const hasIsbn = metadata.formats?.ebook?.isbn;
    reporter.addValidation("metadata", {
      name: "eBook ISBN",
      status: hasIsbn ? "pass" : "warning",
      message: hasIsbn ? undefined : "No ISBN specified (KDP can assign one automatically)"
    });
    
    // Validate pricing
    const hasPrice = metadata.formats?.ebook?.price;
    reporter.addValidation("metadata", {
      name: "eBook Pricing",
      status: hasPrice ? "pass" : "warning",
      message: hasPrice ? `$${metadata.formats.ebook.price}` : "No price specified (will use default)"
    });
    
  } catch (error: any) {
    reporter.addValidation("metadata", {
      name: "Metadata Validation",
      status: "fail",
      message: `Failed to validate metadata: ${error.message}`
    });
  }
}

/**
 * Validate mock files
 */
async function validateMockFiles(reporter: MockReporter, manuscriptPath: string, coverPath: string): Promise<void> {
  // Validate manuscript
  const manuscriptExists = await fileExists(manuscriptPath);
  reporter.addValidation("files", {
    name: "EPUB Manuscript", 
    status: manuscriptExists ? "pass" : "fail",
    message: manuscriptExists ? "EPUB file ready" : "Run generate:formats to create EPUB"
  });
  
  // Validate cover
  const coverExists = await fileExists(coverPath);
  reporter.addValidation("files", {
    name: "Cover Image",
    status: coverExists ? "pass" : "fail",
    message: coverExists ? "Cover image ready" : "Cover image required"
  });
  
  // Check generated directory
  const generatedDirExists = await fileExists(path.dirname(manuscriptPath));
  reporter.addValidation("files", {
    name: "Generated Directory",
    status: generatedDirExists ? "pass" : "warning",
    message: generatedDirExists ? "Output directory exists" : "Will create output directory"
  });
}

/**
 * Validate mock cover using actual validation functions
 */
async function validateMockCover(reporter: MockReporter, coverPath: string, options: KdpPublishOptions): Promise<void> {
  try {
    const { validateCover } = await import("@brainrot/converter");
    
    const validationResult = await validateCover(coverPath, {
      strict: false, // Use non-strict for mock mode
      verbose: options.verbose
    });
    
    // Convert validation results to mock format
    for (const check of validationResult.checks) {
      reporter.addValidation("cover", {
        name: check.name,
        status: check.status as "pass" | "fail" | "warning",
        message: check.message
      });
    }
    
  } catch (error: any) {
    reporter.addValidation("cover", {
      name: "Cover Validation",
      status: "warning",
      message: `Cover validation module unavailable: ${error.message}`
    });
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateCover(bookSlug: string, options: KdpValidateCoverOptions) {
  const spinner = ora(`Validating cover for ${chalk.cyan(bookSlug)}...`).start();

  try {
    // Load book metadata
    const monorepoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const metadataPath = path.join(
      monorepoRoot,
      "content/translations/books",
      bookSlug,
      "metadata.yaml",
    );

    let metadata = null;
    try {
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const yaml = await import("js-yaml");
      metadata = yaml.load(metadataContent) as any;
    } catch {
      spinner.fail(`No metadata found for book ${chalk.red(bookSlug)}`);
      Logger.error(`Expected metadata at: ${metadataPath}`);
      process.exit(1);
    }

    if (options.mock) {
      // Mock mode - simulate validation without actual processing
      spinner.succeed(`Mock validation passed for ${chalk.green(bookSlug)}`);
      Logger.success("✓ Cover dimensions: 1600x2560 (simulated)");
      Logger.success("✓ Cover format: JPEG (simulated)");
      Logger.success("✓ Cover size: 2.1MB (simulated)");
      return;
    }

    // Look for cover file
    const generatedDir = path.join(monorepoRoot, "generated", bookSlug);
    const coverPath = path.join(generatedDir, "cover.jpg");
    
    // Check if cover exists
    try {
      await fs.access(coverPath);
    } catch {
      spinner.fail(`Cover image not found for ${chalk.red(bookSlug)}`);
      Logger.error(`Expected cover at: ${coverPath}`);
      Logger.error("Please ensure cover.jpg exists in the generated directory");
      process.exit(1);
    }

    // Perform actual validation
    const checks = await performCoverValidation(coverPath, options);
    
    // Display results
    const failures = checks.filter(check => check.status === "fail");
    const warnings = checks.filter(check => check.status === "warning");
    const passes = checks.filter(check => check.status === "pass");

    spinner.stop();
    
    // Show all check results
    for (const check of checks) {
      const icon = check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "⚠";
      const color = check.status === "pass" ? "green" : check.status === "fail" ? "red" : "yellow";
      const message = check.message ? ` - ${check.message}` : "";
      console.log(chalk[color](`${icon} ${check.name}${message}`));
    }

    if (failures.length > 0) {
      Logger.error(`\nCover validation failed with ${failures.length} error(s)`);
      process.exit(1);
    } else if (warnings.length > 0 && options.strict) {
      Logger.error(`\nStrict mode: Cover validation failed with ${warnings.length} warning(s)`);
      process.exit(1);
    } else if (warnings.length > 0) {
      Logger.warning(`\nCover validation passed with ${warnings.length} warning(s)`);
      Logger.info("Use --strict flag to treat warnings as errors");
    } else {
      Logger.success(`\nCover validation passed all checks! ✓`);
    }

  } catch (error: any) {
    spinner.fail(`Cover validation failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function performCoverValidation(
  coverPath: string, 
  options: KdpValidateCoverOptions
): Promise<PreflightCheck[]> {
  try {
    // Use the new validation functions from converter package
    const { validateCover, createImageProcessor } = await import("@brainrot/converter");
    
    // Show which image processor is being used if verbose
    if (options.verbose) {
      const processor = await createImageProcessor();
      console.log(`Using image processor: ${processor.getName()}`);
    }
    
    // Run comprehensive cover validation
    const validationResult = await validateCover(coverPath, {
      strict: options.strict,
      verbose: options.verbose
    });

    // Return validation results (ValidationResult[] is compatible with PreflightCheck[])
    return validationResult.checks;

  } catch (error: any) {
    // Fallback error handling if validation module fails
    return [{
      name: "Cover Validation",
      status: "fail",
      message: `Validation failed: ${error.message}`
    }];
  }
}

async function processCoverCommand(
  bookSlug: string,
  coverPath: string,
  options: KdpProcessCoverOptions
) {
  const spinner = ora(`Processing cover for ${chalk.cyan(bookSlug)}...`).start();
  
  try {
    // Handle mock mode
    if (options.mock || process.env.BRAINROT_MOCK_MODE) {
      spinner.text = "Mock mode: simulating cover processing";
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      spinner.succeed(chalk.green("✓ Mock cover processing completed"));
      console.log(chalk.blue("ℹ Mock mode: cover would be processed to generated/{slug}/cover.jpg"));
      return;
    }

    // Parse numeric options
    const dpi = parseInt(options.dpi || "300");
    const quality = parseInt(options.quality || "90");
    const format = (options.format as "jpeg" | "png") || "jpeg";

    if (dpi < 72 || dpi > 600) {
      spinner.fail("Invalid DPI: must be between 72 and 600");
      return;
    }

    if (quality < 1 || quality > 100) {
      spinner.fail("Invalid quality: must be between 1 and 100");
      return;
    }

    spinner.text = "Processing cover image...";

    // Use the cover processing functionality from converter
    const { processCoverForBook } = await import("@brainrot/converter");
    
    const report = await processCoverForBook(bookSlug, coverPath, "./generated", {
      dpi,
      quality,
      format,
      force: options.force,
      verbose: options.verbose
    });

    // Display results
    if (report.processing.success) {
      spinner.succeed(chalk.green(`✓ Cover processed successfully for ${bookSlug}`));
      
      // Show processing steps if verbose
      if (options.verbose && report.processing.processingSteps.length > 0) {
        console.log(chalk.blue("\nProcessing steps:"));
        for (const step of report.processing.processingSteps) {
          console.log(chalk.gray(`  • ${step}`));
        }
      }

      // Show validation results
      const validation = report.validation;
      if (validation.checks.length > 0) {
        console.log(chalk.blue("\nValidation results:"));
        for (const check of validation.checks) {
          const icon = check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "⚠";
          const color = check.status === "pass" ? "green" : check.status === "fail" ? "red" : "yellow";
          const message = check.message ? ` - ${check.message}` : "";
          console.log(chalk[color](`${icon} ${check.name}${message}`));
        }
      }

      // Show summary
      console.log(chalk.blue(`\n📁 Processed cover: ${report.processedFile.path}`));
      console.log(chalk.blue(`📋 Validation report: ${path.join("./generated", bookSlug, "validation.json")}`));
      
      if (validation.suggestions.length > 0) {
        console.log(chalk.yellow("\n💡 Suggestions:"));
        for (const suggestion of validation.suggestions) {
          console.log(chalk.yellow(`  • ${suggestion}`));
        }
      }

    } else {
      spinner.fail(chalk.red(`✗ Cover processing failed for ${bookSlug}`));
      
      if (report.processing.error) {
        console.log(chalk.red(`Error: ${report.processing.error}`));
      }

      if (report.processing.processingSteps.length > 0) {
        console.log(chalk.blue("\nProcessing log:"));
        for (const step of report.processing.processingSteps) {
          console.log(chalk.gray(`  • ${step}`));
        }
      }

      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail(`Cover processing failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function showRateLimitStatus(options: any) {
  const spinner = ora("Checking rate limit status...").start();
  
  try {
    const { RateLimiterService } = await import("../services/rateLimiter.js");
    const rateLimiter = new RateLimiterService();
    
    // Get status for all platforms
    const allStatuses = await rateLimiter.getAllStatus();
    
    spinner.stop();
    
    console.log(chalk.blue("\n📊 Publishing Rate Limit Status\n"));
    
    for (const status of allStatuses) {
      const platformName = status.platform.toUpperCase();
      const usageColor = status.remaining === 0 ? "red" : status.remaining <= 1 ? "yellow" : "green";
      const icon = status.remaining === 0 ? "🚫" : status.remaining <= 1 ? "⚠️" : "✅";
      
      console.log(chalk.bold(`${icon} ${platformName}`));
      console.log(chalk[usageColor](`   ${status.currentCount}/${status.dailyLimit} books published today`));
      console.log(chalk.gray(`   ${status.remaining} remaining`));
      
      if (status.lastPublish) {
        const lastPublishTime = status.lastPublish.toLocaleString();
        console.log(chalk.gray(`   Last publish: ${lastPublishTime}`));
      }
      
      const resetTime = status.resetTime.toLocaleString();
      console.log(chalk.gray(`   Resets at: ${resetTime}`));
      console.log(); // Empty line between platforms
    }
    
    // Show database path for debugging
    if (options.verbose) {
      console.log(chalk.gray(`Database: ${rateLimiter.getDatabasePath()}`));
    }
    
  } catch (error: any) {
    spinner.fail("Failed to get rate limit status");
    Logger.error(error.message, error);
    process.exit(1);
  }
}
