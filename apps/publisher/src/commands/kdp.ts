import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { KdpService } from '../services/kdp.js';
import { ConfigManager } from '../utils/config.js';
import { Logger } from '../utils/logger.js';

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

export function createKdpCommand(): Command {
  const kdpCommand = new Command('kdp')
    .description('Publish books to Amazon KDP')
    .option('--headless', 'Run browser in headless mode', true)
    .option('--headed', 'Run browser with visible UI for debugging')
    .option('--mock', 'Run in mock mode without actual browser automation');

  kdpCommand
    .command('publish <book>')
    .description('Publish a book to Amazon KDP')
    .option('--dry-run', 'Simulate publishing without making actual changes')
    .option('--draft', 'Save as draft instead of publishing live')
    .option('--publish', 'Publish immediately (default is draft)')
    .action(async (book: string, options: KdpPublishOptions, command) => {
      const parentOptions = command.parent.opts();
      await publishToKdp(book, { 
        ...options, 
        ...parentOptions,
        headless: !parentOptions.headed
      });
    });

  kdpCommand
    .command('login')
    .description('Test KDP login')
    .action(async (options, command) => {
      const parentOptions = command.parent.opts();
      await testLogin({ 
        ...parentOptions,
        headless: !parentOptions.headed
      });
    });

  kdpCommand
    .command('check')
    .description('Check KDP credentials and browser setup')
    .action(async (options, command) => {
      const parentOptions = command.parent.opts();
      await checkSetup(parentOptions);
    });

  return kdpCommand;
}

async function publishToKdp(bookSlug: string, options: KdpPublishOptions) {
  const spinner = ora('Initializing KDP publishing...').start();

  try {
    // Load configuration
    await ConfigManager.load();
    const kdpConfig = ConfigManager.get('kdp') || {
      email: process.env.KDP_EMAIL,
      password: process.env.KDP_PASSWORD
    };

    // In mock mode, use fake credentials
    if (options.mock || options.dryRun) {
      kdpConfig.email = kdpConfig.email || 'mock@example.com';
      kdpConfig.password = kdpConfig.password || 'mock-password';
    }

    if (!kdpConfig.email || !kdpConfig.password) {
      spinner.fail('Missing KDP credentials');
      Logger.error('Please set KDP_EMAIL and KDP_PASSWORD environment variables');
      process.exit(1);
    }

    // Initialize service
    const kdp = new KdpService({
      email: kdpConfig.email,
      password: kdpConfig.password,
      headless: options.headless !== false,
      mockMode: options.mock || options.dryRun,
      screenshotDir: path.join(process.cwd(), 'kdp-screenshots')
    });

    // Load book metadata
    spinner.text = 'Loading book metadata...';
    const monorepoRoot = path.resolve(__dirname, '..', '..', '..', '..');
    const metadataPath = path.join(
      monorepoRoot,
      'content/translations/books',
      bookSlug,
      'metadata.yaml'
    );

    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const yaml = await import('js-yaml');
    const metadata = yaml.load(metadataContent) as any;

    if (!metadata.publishing?.kdp) {
      spinner.fail(`Book ${bookSlug} is not configured for KDP publishing`);
      return;
    }

    // Check for generated files
    spinner.text = 'Checking for generated files...';
    const generatedDir = path.join(
      monorepoRoot,
      'content/translations/books',
      bookSlug,
      'generated'
    );

    const manuscriptPath = path.join(generatedDir, 'kindle.epub');
    const coverPath = path.join(generatedDir, 'cover.jpg');

    // Skip file check in mock mode
    if (!options.mock && !options.dryRun) {
      try {
        await fs.access(manuscriptPath);
        await fs.access(coverPath);
      } catch {
        spinner.fail('Missing generated files. Please run generate:formats first.');
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
      language: metadata.language || 'en-US',
      isbn: metadata.formats?.ebook?.isbn,
      publishingRights: 'worldwide' as const
    };

    const manuscriptDetails = {
      filePath: manuscriptPath,
      format: 'epub' as const
    };

    const coverDetails = {
      filePath: coverPath,
      format: 'jpg' as const
    };

    const pricingDetails = {
      price: metadata.formats?.ebook?.price || 4.99,
      currency: metadata.formats?.ebook?.currency || 'USD',
      marketplaces: ['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'NL', 'JP', 'BR', 'CA', 'MX', 'AU', 'IN'],
      royaltyOption: '70%' as const,
      kdpSelect: true
    };

    // Publish book
    spinner.text = 'Starting KDP publishing workflow...';
    
    try {
      const result = await kdp.publishCompleteBook(
        bookDetails,
        manuscriptDetails,
        coverDetails,
        pricingDetails,
        options.publish === true // Default to draft unless --publish is specified
      );

      if (result.asin) {
        spinner.succeed(`Successfully published ${metadata.title} to KDP!`);
        Logger.info(`ASIN: ${result.asin}`);
        Logger.info(`View at: https://www.amazon.com/dp/${result.asin}`);
      } else {
        spinner.succeed(`Successfully saved ${metadata.title} as draft on KDP!`);
        Logger.info(`Book ID: ${result.bookId}`);
      }

      // Save publishing report
      const reportDir = path.join(monorepoRoot, 'publishing-reports');
      await fs.mkdir(reportDir, { recursive: true });
      
      const report = {
        book: bookSlug,
        platform: 'kdp',
        bookId: result.bookId,
        asin: result.asin,
        publishedAt: new Date().toISOString(),
        metadata,
        status: result.asin ? 'published' : 'draft'
      };
      
      const reportPath = path.join(
        reportDir,
        `${new Date().toISOString().split('T')[0]}-${bookSlug}-kdp.json`
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
  const spinner = ora('Testing KDP login...').start();

  try {
    await ConfigManager.load();
    const kdpConfig = ConfigManager.get('kdp') || {
      email: process.env.KDP_EMAIL,
      password: process.env.KDP_PASSWORD
    };

    if (options.mock) {
      kdpConfig.email = 'mock@example.com';
      kdpConfig.password = 'mock-password';
    }

    if (!kdpConfig.email || !kdpConfig.password) {
      spinner.fail('Missing KDP credentials');
      Logger.error('Please set KDP_EMAIL and KDP_PASSWORD environment variables');
      process.exit(1);
    }

    const kdp = new KdpService({
      email: kdpConfig.email,
      password: kdpConfig.password,
      headless: options.headless !== false,
      mockMode: options.mock,
      screenshotDir: path.join(process.cwd(), 'kdp-screenshots')
    });

    await kdp.login();
    spinner.succeed('Successfully logged in to KDP!');
    
    await kdp.close();

  } catch (error: any) {
    spinner.fail(`Login failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function checkSetup(options: any) {
  const spinner = ora('Checking KDP setup...').start();

  try {
    // Check Playwright installation
    spinner.text = 'Checking Playwright installation...';
    try {
      await import('playwright');
      Logger.success('✓ Playwright installed');
    } catch {
      Logger.error('✗ Playwright not installed. Run: pnpm add playwright');
      process.exit(1);
    }

    // Check browser installation
    spinner.text = 'Checking browser installation...';
    const { chromium } = await import('playwright');
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      Logger.success('✓ Chromium browser available');
    } catch {
      Logger.error('✗ Chromium not installed. Run: npx playwright install chromium');
      process.exit(1);
    }

    // Check credentials
    spinner.text = 'Checking KDP credentials...';
    await ConfigManager.load();
    const kdpConfig = ConfigManager.get('kdp');
    
    if (kdpConfig?.email && kdpConfig?.password) {
      Logger.success('✓ KDP credentials configured');
    } else if (process.env.KDP_EMAIL && process.env.KDP_PASSWORD) {
      Logger.success('✓ KDP credentials found in environment');
    } else {
      Logger.warning('⚠ KDP credentials not configured');
      Logger.info('Set KDP_EMAIL and KDP_PASSWORD environment variables');
    }

    spinner.succeed('KDP setup check complete');

  } catch (error: any) {
    spinner.fail(`Setup check failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}