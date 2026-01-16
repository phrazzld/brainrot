/**
 * Print CLI Command - Orchestrator for Lulu Print API
 *
 * Per council recommendation: CLI command acts as orchestrator.
 * It reads metadata.yaml, parses address, checks PDF page count,
 * generates SKU, and calls service methods.
 */

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";
import inquirer from "inquirer";
import { LuluPrintService } from "../services/lulu-print.js";
import { Logger } from "../utils/logger.js";
import {
  parseAddressFlags,
  parseAddressJson,
  formatAddress,
  hasRequiredAddressFlags,
  getMissingAddressFields,
  type AddressFlags,
} from "../utils/address.js";
import { getPdfPageCount, validatePdfForPrint } from "../utils/pdf-utils.js";
import {
  generatePodPackageId,
  getDefaultPrintSpecs,
  calculateSpineWidth,
} from "../utils/pod-package.js";
import type {
  ShippingAddress,
  ShippingLevel,
  LineItem,
  PrintSpecs,
} from "../types/lulu-print.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find monorepo root
const MONOREPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

interface PrintOptions {
  // Address flags
  name?: string;
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  // Address from file or inline JSON
  address?: string;
  addressFile?: string;
  // Shipping
  shipping?: ShippingLevel;
  // Mode flags
  dryRun?: boolean;
  mock?: boolean;
  sandbox?: boolean;
  production?: boolean;
  // Other
  watch?: boolean;
  quantity?: number;
}

export function createPrintCommand(): Command {
  const printCommand = new Command("print")
    .description("Direct print-on-demand fulfillment via Lulu Print API")
    .option("--sandbox", "Use Lulu sandbox environment (default)", true)
    .option("--production", "Use Lulu production environment")
    .option("--mock", "Run in mock mode without actual API calls");

  // Quote subcommand
  printCommand
    .command("quote <book-slug>")
    .description("Get a price quote for printing a book")
    .option("--name <name>", "Recipient name")
    .option("--street <street>", "Street address")
    .option("--street2 <street2>", "Street address line 2")
    .option("--city <city>", "City")
    .option("--state <state>", "State/Province code")
    .option("--zip <zip>", "Postal code")
    .option("--country <country>", "Country code (ISO 3166-1 alpha-2)")
    .option("--phone <phone>", "Phone number")
    .option("--email <email>", "Email address")
    .option("--address <json>", "Address as JSON string")
    .option("--address-file <path>", "Path to JSON file with address")
    .option("-q, --quantity <n>", "Number of copies", "1")
    .action(async (bookSlug: string, options: PrintOptions, command) => {
      const parentOptions = command.parent.opts();
      await quoteBook(bookSlug, { ...options, ...parentOptions });
    });

  // Order subcommand
  printCommand
    .command("order <book-slug>")
    .description("Create a print order for a book")
    .option("--name <name>", "Recipient name")
    .option("--street <street>", "Street address")
    .option("--street2 <street2>", "Street address line 2")
    .option("--city <city>", "City")
    .option("--state <state>", "State/Province code")
    .option("--zip <zip>", "Postal code")
    .option("--country <country>", "Country code (ISO 3166-1 alpha-2)")
    .option("--phone <phone>", "Phone number")
    .option("--email <email>", "Email address")
    .option("--address <json>", "Address as JSON string")
    .option("--address-file <path>", "Path to JSON file with address")
    .option(
      "-s, --shipping <level>",
      "Shipping level (MAIL, GROUND, PRIORITY_MAIL, EXPEDITED)",
      "GROUND",
    )
    .option("-q, --quantity <n>", "Number of copies", "1")
    .option("--dry-run", "Simulate order without actually placing it")
    .action(async (bookSlug: string, options: PrintOptions, command) => {
      const parentOptions = command.parent.opts();
      await orderBook(bookSlug, { ...options, ...parentOptions });
    });

  // Status subcommand
  printCommand
    .command("status <job-id>")
    .description("Check status of a print job")
    .option("--watch", "Poll for status updates until terminal state")
    .action(async (jobId: string, options: PrintOptions, command) => {
      const parentOptions = command.parent.opts();
      await checkStatus(jobId, { ...options, ...parentOptions });
    });

  // Cancel subcommand
  printCommand
    .command("cancel <job-id>")
    .description("Cancel a print job (only if not yet in production)")
    .action(async (jobId: string, _options, command) => {
      const parentOptions = command.parent.opts();
      await cancelJob(jobId, parentOptions);
    });

  // List subcommand
  printCommand
    .command("list")
    .description("List recent print jobs")
    .option("--limit <n>", "Number of jobs to list", "20")
    .option("--status <status>", "Filter by status")
    .action(async (options, command) => {
      const parentOptions = command.parent.opts();
      await listJobs({ ...options, ...parentOptions });
    });

  // Validate subcommand
  printCommand
    .command("validate <book-slug>")
    .description("Validate book files for print")
    .action(async (bookSlug: string, _options, command) => {
      const parentOptions = command.parent.opts();
      await validateBook(bookSlug, parentOptions);
    });

  return printCommand;
}

// =============================================================================
// Command Implementations
// =============================================================================

async function quoteBook(bookSlug: string, options: PrintOptions) {
  const spinner = ora("Loading book metadata...").start();

  try {
    // Load book metadata and files
    const bookInfo = await loadBookInfo(bookSlug, spinner);
    if (!bookInfo) return;

    // Parse address
    const address = await resolveAddress(options, spinner);
    if (!address) return;

    // Initialize service
    const service = createService(options);

    // Build line item
    spinner.text = "Calculating cost...";
    const lineItem = await buildLineItem(bookInfo, parseInt(String(options.quantity || "1")));

    // Get shipping options with costs
    const shippingOptions = await service.getShippingOptions([lineItem], address);

    // Get cost estimate
    const cost = await service.calculateCost([lineItem], address);

    spinner.succeed("Quote ready");

    // Display results
    console.log("\n" + chalk.bold("📚 Book:"));
    console.log(`   ${bookInfo.title}`);
    console.log(
      `   Format: ${bookInfo.specs.trim}" ${bookInfo.specs.binding}, ${bookInfo.specs.color === "bw" ? "B&W" : "Color"}, ${bookInfo.pageCount} pages`,
    );

    console.log("\n" + chalk.bold("📍 Ship to:"));
    console.log(formatAddress(address).split("\n").map((l) => `   ${l}`).join("\n"));

    console.log("\n" + chalk.bold("💰 Pricing:"));
    console.log(`   Print cost: $${cost.line_items[0]?.total_cost.toFixed(2) || "0.00"}`);
    console.log("\n   " + chalk.dim("Shipping options:"));
    for (const opt of shippingOptions) {
      console.log(
        `     ${opt.level}: $${opt.cost.toFixed(2)} (${opt.estimated_days.min}-${opt.estimated_days.max} business days)`,
      );
    }
    console.log(`\n   Tax: $${cost.tax.toFixed(2)}`);
    console.log(chalk.green.bold(`   Total: $${cost.total.toFixed(2)}`));
  } catch (error: any) {
    spinner.fail(`Quote failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function orderBook(bookSlug: string, options: PrintOptions) {
  const spinner = ora("Loading book metadata...").start();

  try {
    // Load book metadata and files
    const bookInfo = await loadBookInfo(bookSlug, spinner);
    if (!bookInfo) return;

    // Parse address
    const address = await resolveAddress(options, spinner);
    if (!address) return;

    // Initialize service
    const service = createService(options);

    // Build line item
    spinner.text = "Preparing order...";
    const lineItem = await buildLineItem(bookInfo, parseInt(String(options.quantity || "1")));
    const shippingLevel = (options.shipping || "GROUND") as ShippingLevel;

    // Get cost estimate first
    const cost = await service.calculateCost([lineItem], address, shippingLevel);

    spinner.stop();

    // Confirm with user
    console.log("\n" + chalk.bold("📦 Order Summary:"));
    console.log(`   Book: ${bookInfo.title}`);
    console.log(`   Quantity: ${lineItem.quantity}`);
    console.log(`   Shipping: ${shippingLevel}`);
    console.log(chalk.green.bold(`   Total: $${cost.total.toFixed(2)}`));
    console.log("\n" + chalk.bold("📍 Ship to:"));
    console.log(formatAddress(address).split("\n").map((l) => `   ${l}`).join("\n"));

    if (options.dryRun) {
      console.log(chalk.yellow("\n🔶 DRY RUN - Order not placed"));
      return;
    }

    // Confirmation prompt
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: "Place this order?",
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.yellow("Order canceled"));
      return;
    }

    // Place order
    spinner.start("Placing order...");
    const job = await service.createPrintJob([lineItem], address, shippingLevel, {
      contact_email: address.email || options.email,
    });

    spinner.succeed(chalk.green("Order placed successfully!"));

    console.log("\n" + chalk.bold("🎉 Order Details:"));
    console.log(`   Job ID: ${chalk.cyan(job.id)}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Track: brainrot-publish print status ${job.id}`);

    if (job.estimated_ship_date) {
      console.log(`   Est. ship date: ${job.estimated_ship_date}`);
    }
  } catch (error: any) {
    spinner.fail(`Order failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function checkStatus(jobId: string, options: PrintOptions) {
  const spinner = ora("Fetching job status...").start();

  try {
    const service = createService(options);
    const job = await service.getJobStatus(jobId);

    spinner.succeed("Status retrieved");

    console.log("\n" + chalk.bold("📋 Job Details:"));
    console.log(`   ID: ${chalk.cyan(job.id)}`);
    console.log(`   Status: ${formatStatus(job.status)}`);
    console.log(`   Created: ${job.created_at}`);
    console.log(`   Updated: ${job.updated_at}`);

    if (job.line_items?.length) {
      console.log("\n   " + chalk.bold("Items:"));
      for (const item of job.line_items) {
        console.log(`     - ${item.title} (x${item.quantity})`);
        if (item.tracking) {
          console.log(`       Tracking: ${item.tracking.carrier} ${item.tracking.number}`);
          console.log(`       URL: ${item.tracking.url}`);
        }
      }
    }

    if (job.costs) {
      console.log(
        `\n   Total: $${job.costs.total_cost_incl_tax?.toFixed(2) || "N/A"}`,
      );
    }

    // Watch mode
    if (options.watch && !["SHIPPED", "CANCELED", "ERROR"].includes(job.status)) {
      console.log(chalk.dim("\nWatching for status changes... (Ctrl+C to stop)\n"));

      await service.watchJob(jobId, (updatedJob) => {
        console.log(
          `[${new Date().toLocaleTimeString()}] Status: ${formatStatus(updatedJob.status)}`,
        );
      });
    }
  } catch (error: any) {
    spinner.fail(`Failed to get status: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function cancelJob(jobId: string, options: PrintOptions) {
  const spinner = ora("Canceling job...").start();

  try {
    const service = createService(options);
    await service.cancelJob(jobId);
    spinner.succeed(chalk.green(`Job ${jobId} canceled`));
  } catch (error: any) {
    spinner.fail(`Cancel failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function listJobs(options: any) {
  const spinner = ora("Fetching jobs...").start();

  try {
    const service = createService(options);
    const response = await service.listJobs({
      limit: parseInt(options.limit || "20"),
      status: options.status,
    });

    spinner.succeed(`Found ${response.count} jobs`);

    if (response.results.length === 0) {
      console.log(chalk.dim("\nNo print jobs found"));
      return;
    }

    console.log("\n" + chalk.bold("Recent Print Jobs:"));
    for (const job of response.results) {
      const title = job.line_items?.[0]?.title || "Unknown";
      console.log(
        `   ${chalk.cyan(job.id)} - ${formatStatus(job.status)} - ${title}`,
      );
      console.log(`     Created: ${job.created_at}`);
    }
  } catch (error: any) {
    spinner.fail(`Failed to list jobs: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function validateBook(bookSlug: string, options: PrintOptions) {
  const spinner = ora("Validating book files...").start();

  try {
    const bookInfo = await loadBookInfo(bookSlug, spinner);
    if (!bookInfo) return;

    spinner.text = "Validating interior PDF...";
    const interiorValidation = await validatePdfForPrint(bookInfo.interiorPath);

    spinner.text = "Validating cover PDF...";
    const coverValidation = await validatePdfForPrint(bookInfo.coverPath);

    const allIssues = [
      ...interiorValidation.issues.map((i) => `Interior: ${i}`),
      ...coverValidation.issues.map((i) => `Cover: ${i}`),
    ];

    if (allIssues.length === 0) {
      spinner.succeed(chalk.green("All files valid for print"));

      console.log("\n" + chalk.bold("📄 Interior PDF:"));
      console.log(`   Pages: ${interiorValidation.pageCount}`);
      console.log(`   Path: ${bookInfo.interiorPath}`);

      console.log("\n" + chalk.bold("🖼️  Cover PDF:"));
      console.log(`   Path: ${bookInfo.coverPath}`);

      console.log("\n" + chalk.bold("📐 Calculated Dimensions:"));
      const spineWidth = calculateSpineWidth(
        interiorValidation.pageCount,
        bookInfo.specs,
      );
      console.log(`   Spine width: ${spineWidth.toFixed(3)}"`);
    } else {
      spinner.fail("Validation issues found");
      console.log("\n" + chalk.red("Issues:"));
      for (const issue of allIssues) {
        console.log(`   ❌ ${issue}`);
      }
      process.exit(1);
    }
  } catch (error: any) {
    spinner.fail(`Validation failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

// =============================================================================
// Helpers
// =============================================================================

interface BookInfo {
  slug: string;
  title: string;
  author: string;
  pageCount: number;
  specs: PrintSpecs;
  podPackageId: string;
  interiorPath: string;
  coverPath: string;
  interiorUrl?: string;
  coverUrl?: string;
}

async function loadBookInfo(
  bookSlug: string,
  spinner: ReturnType<typeof ora>,
): Promise<BookInfo | null> {
  try {
    // Load metadata
    const metadataPath = path.join(
      MONOREPO_ROOT,
      "content/translations/books",
      bookSlug,
      "metadata.yaml",
    );

    const metadataContent = await fs.readFile(metadataPath, "utf-8");
    const yaml = await import("js-yaml");
    const metadata = yaml.load(metadataContent) as any;

    // Check for print config
    const printConfig = metadata.formats?.paperback || metadata.publishing?.print;
    if (!printConfig) {
      spinner.fail(`Book ${bookSlug} has no print configuration in metadata.yaml`);
      return null;
    }

    // Locate PDF files
    const generatedDir = path.join(
      MONOREPO_ROOT,
      "content/translations/books",
      bookSlug,
      "generated",
    );

    const interiorPath = path.join(generatedDir, "paperback.pdf");
    const coverPath = path.join(generatedDir, "cover.pdf");

    // Check files exist
    try {
      await fs.access(interiorPath);
      await fs.access(coverPath);
    } catch {
      spinner.fail(
        `Missing PDF files. Expected:\n  ${interiorPath}\n  ${coverPath}\nRun 'pnpm generate:formats' first.`,
      );
      return null;
    }

    // Get actual page count (CRITICAL: must be at order time)
    spinner.text = "Counting pages...";
    const pageCount = await getPdfPageCount(interiorPath);

    // Build specs from metadata or use defaults
    const specs: PrintSpecs = {
      trim: printConfig.trim || "6x9",
      color: printConfig.color || "bw",
      binding: printConfig.binding || "paperback",
      paper: printConfig.paper || "cream",
      finish: printConfig.finish || "matte",
    };

    // Generate SKU with actual page count
    const podPackageId = generatePodPackageId(specs, pageCount);

    return {
      slug: bookSlug,
      title: metadata.title || bookSlug,
      author: metadata.author || "Unknown",
      pageCount,
      specs,
      podPackageId,
      interiorPath,
      coverPath,
      // URLs would come from Vercel Blob in production
      interiorUrl: printConfig.interior_url,
      coverUrl: printConfig.cover_url,
    };
  } catch (error: any) {
    spinner.fail(`Failed to load book: ${error.message}`);
    return null;
  }
}

async function resolveAddress(
  options: PrintOptions,
  spinner: ReturnType<typeof ora>,
): Promise<ShippingAddress | null> {
  try {
    // Try inline JSON first
    if (options.address) {
      return parseAddressJson(options.address);
    }

    // Try file
    if (options.addressFile) {
      const content = await fs.readFile(options.addressFile, "utf-8");
      return parseAddressJson(content);
    }

    // Try flags
    const flags: AddressFlags = {
      name: options.name,
      street: options.street,
      street2: options.street2,
      city: options.city,
      state: options.state,
      zip: options.zip,
      country: options.country,
      phone: options.phone,
      email: options.email,
    };

    if (hasRequiredAddressFlags(flags)) {
      return parseAddressFlags(flags);
    }

    // Prompt for missing fields
    const missing = getMissingAddressFields(flags);
    if (missing.length > 0) {
      spinner.stop();
      console.log(chalk.yellow("\nMissing required address fields. Please provide:"));

      const answers = await inquirer.prompt(
        missing.map((field) => ({
          type: "input",
          name: field,
          message: `${field}:`,
          validate: (input: string) => input.length > 0 || `${field} is required`,
        })),
      );

      return parseAddressFlags({ ...flags, ...answers });
    }

    return parseAddressFlags(flags);
  } catch (error: any) {
    spinner.fail(`Invalid address: ${error.message}`);
    return null;
  }
}

async function buildLineItem(
  bookInfo: BookInfo,
  quantity: number,
): Promise<LineItem> {
  // In production, these would be Vercel Blob URLs
  // For now, we use placeholder URLs that the Print API will validate
  const interiorUrl =
    bookInfo.interiorUrl ||
    `https://blob.brainrot.pub/books/${bookInfo.slug}/paperback.pdf`;
  const coverUrl =
    bookInfo.coverUrl ||
    `https://blob.brainrot.pub/books/${bookInfo.slug}/cover.pdf`;

  return {
    title: bookInfo.title,
    quantity,
    pod_package_id: bookInfo.podPackageId,
    printable_normalization: {
      cover: { source_url: coverUrl },
      interior: { source_url: interiorUrl },
      pod_package_id: bookInfo.podPackageId,
    },
  };
}

function createService(options: PrintOptions): LuluPrintService {
  return new LuluPrintService({
    clientKey: process.env.LULU_CLIENT_KEY || process.env.LULU_API_KEY || "",
    clientSecret:
      process.env.LULU_CLIENT_SECRET || process.env.LULU_API_SECRET || "",
    sandbox: !options.production,
    mockMode: options.mock || options.dryRun,
  });
}

function formatStatus(status: string): string {
  const colors: Record<string, (s: string) => string> = {
    CREATED: chalk.blue,
    UNPAID: chalk.yellow,
    PAYMENT_IN_PROGRESS: chalk.yellow,
    PRODUCTION_READY: chalk.cyan,
    IN_PRODUCTION: chalk.cyan,
    SHIPPED: chalk.green,
    CANCELED: chalk.gray,
    ERROR: chalk.red,
  };
  return (colors[status] || chalk.white)(status);
}
