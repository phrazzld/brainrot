import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { LuluService } from '../services/lulu.js';
import { KdpService } from '../services/kdp.js';
import { ConfigManager } from '../utils/config.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PublishAllOptions {
  platforms?: string[];
  dryRun?: boolean;
  force?: boolean;
  skipValidation?: boolean;
  mock?: boolean;
  headless?: boolean;
  verbose?: boolean;
}

interface PreflightCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message?: string;
}

interface PublishResult {
  platform: string;
  status: 'success' | 'failed' | 'skipped';
  bookId?: string;
  url?: string;
  error?: string;
  timestamp: string;
}

export function createPublishAllCommand(): Command {
  const publishAllCommand = new Command('publish-all')
    .description('Publish book to all configured platforms')
    .argument('<book>', 'Book slug to publish')
    .option('-p, --platforms <platforms...>', 'Platforms to publish to', ['kdp', 'lulu'])
    .option('--dry-run', 'Simulate publishing without making actual changes')
    .option('--force', 'Force publishing even if already published')
    .option('--skip-validation', 'Skip pre-flight validation checks')
    .option('--mock', 'Run in mock mode for testing')
    .option('--headless', 'Run browser automation in headless mode', true)
    .action(async (book: string, options: PublishAllOptions) => {
      await publishToAllPlatforms(book, options);
    });

  return publishAllCommand;
}

async function publishToAllPlatforms(bookSlug: string, options: PublishAllOptions) {
  const spinner = ora('Initializing multi-platform publishing...').start();
  const results: PublishResult[] = [];
  const monorepoRoot = path.resolve(__dirname, '..', '..', '..', '..');

  try {
    // Load configuration
    await ConfigManager.load();

    // Load book metadata
    spinner.text = 'Loading book metadata...';
    const metadataPath = path.join(
      monorepoRoot,
      'content/translations/books',
      bookSlug,
      'metadata.yaml'
    );

    let metadata: any;
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const yaml = await import('js-yaml');
      metadata = yaml.load(metadataContent) as any;
    } catch (error) {
      spinner.fail(`Failed to load metadata for ${bookSlug}`);
      Logger.error(`Metadata file not found at: ${metadataPath}`);
      process.exit(1);
    }

    // Run pre-flight checks
    if (!options.skipValidation) {
      spinner.text = 'Running pre-flight checks...';
      const checks = await runPreflightChecks(bookSlug, metadata, options);
      
      const failedChecks = checks.filter(c => c.status === 'fail');
      if (failedChecks.length > 0) {
        spinner.fail('Pre-flight checks failed');
        Logger.error('Failed checks:');
        failedChecks.forEach(check => {
          Logger.error(`  - ${check.name}: ${check.message}`);
        });
        
        if (!options.force) {
          Logger.info('Use --force to override validation failures');
          process.exit(1);
        }
      }

      const warnings = checks.filter(c => c.status === 'warning');
      if (warnings.length > 0) {
        Logger.warning('Pre-flight warnings:');
        warnings.forEach(check => {
          Logger.warning(`  - ${check.name}: ${check.message}`);
        });
      }
    }

    // Determine platforms to publish to
    const requestedPlatforms = options.platforms || ['kdp', 'lulu'];
    const enabledPlatforms = requestedPlatforms.filter(platform => {
      if (platform === 'kdp' && metadata.publishing?.kdp) return true;
      if (platform === 'lulu' && metadata.publishing?.lulu) return true;
      if (platform === 'ingram' && metadata.publishing?.ingram) return true;
      return false;
    });

    if (enabledPlatforms.length === 0) {
      spinner.fail('No platforms enabled for this book');
      Logger.error(`Requested platforms: ${requestedPlatforms.join(', ')}`);
      Logger.error('Enable platforms in metadata.yaml under "publishing" section');
      process.exit(1);
    }

    Logger.info(`Publishing to platforms: ${enabledPlatforms.join(', ')}`);

    // Publish to each platform sequentially
    for (const platform of enabledPlatforms) {
      spinner.text = `Publishing to ${platform}...`;
      
      try {
        const result = await publishToPlatform(
          platform,
          bookSlug,
          metadata,
          options
        );
        
        results.push(result);
        
        if (result.status === 'success') {
          Logger.success(`✓ ${platform}: ${result.url || result.bookId}`);
        } else if (result.status === 'skipped') {
          Logger.info(`⊘ ${platform}: Skipped`);
        }
      } catch (error: any) {
        const result: PublishResult = {
          platform,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        results.push(result);
        Logger.error(`✗ ${platform}: ${error.message}`);
        
        // Check if we should continue or abort
        if (!options.force) {
          spinner.fail(`Publishing failed on ${platform}`);
          Logger.error('Aborting remaining platforms. Use --force to continue on errors.');
          break;
        }
      }
    }

    // Generate comprehensive report
    spinner.text = 'Generating publishing report...';
    const report = {
      book: bookSlug,
      timestamp: new Date().toISOString(),
      metadata: {
        title: metadata.title,
        author: metadata.author,
        isbn: metadata.formats?.ebook?.isbn || metadata.formats?.paperback?.isbn
      },
      platforms: enabledPlatforms,
      results,
      options: {
        dryRun: options.dryRun,
        mock: options.mock,
        force: options.force
      },
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }
    };

    // Save report
    const reportDir = path.join(monorepoRoot, 'publishing-reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportPath = path.join(
      reportDir,
      `${new Date().toISOString().split('T')[0]}-${bookSlug}-all.json`
    );
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    Logger.info(`Report saved to: ${reportPath}`);

    // Final status
    if (report.summary.successful === report.summary.total) {
      spinner.succeed(`Successfully published ${metadata.title} to all platforms!`);
    } else if (report.summary.successful > 0) {
      spinner.warn(`Published to ${report.summary.successful}/${report.summary.total} platforms`);
    } else {
      spinner.fail('Publishing failed on all platforms');
    }

    // Send notification (if configured)
    await sendCompletionNotification(bookSlug, report);

  } catch (error: any) {
    spinner.fail(`Publishing failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function runPreflightChecks(
  bookSlug: string,
  metadata: any,
  options: PublishAllOptions
): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = [];
  const monorepoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const bookDir = path.join(monorepoRoot, 'content/translations/books', bookSlug);
  const generatedDir = path.join(bookDir, 'generated');

  // Check metadata completeness
  checks.push({
    name: 'Metadata title',
    status: metadata.title ? 'pass' : 'fail',
    message: metadata.title ? undefined : 'Missing title in metadata'
  });

  checks.push({
    name: 'Metadata author',
    status: metadata.author ? 'pass' : 'fail',
    message: metadata.author ? undefined : 'Missing author in metadata'
  });

  checks.push({
    name: 'Metadata description',
    status: metadata.description ? 'pass' : 'warning',
    message: metadata.description ? undefined : 'Missing description (recommended)'
  });

  // Check ISBNs
  if (metadata.publishing?.kdp) {
    checks.push({
      name: 'eBook ISBN',
      status: metadata.formats?.ebook?.isbn ? 'pass' : 'warning',
      message: metadata.formats?.ebook?.isbn ? undefined : 'Missing eBook ISBN'
    });
  }

  if (metadata.publishing?.lulu) {
    checks.push({
      name: 'Paperback ISBN',
      status: metadata.formats?.paperback?.isbn ? 'pass' : 'warning',
      message: metadata.formats?.paperback?.isbn ? undefined : 'Missing paperback ISBN'
    });
  }

  // Check generated files (skip in mock mode)
  if (!options.mock && !options.dryRun) {
    if (metadata.publishing?.kdp) {
      try {
        await fs.access(path.join(generatedDir, 'kindle.epub'));
        checks.push({ name: 'Kindle manuscript', status: 'pass' });
      } catch {
        checks.push({
          name: 'Kindle manuscript',
          status: 'fail',
          message: 'kindle.epub not found in generated/'
        });
      }

      try {
        await fs.access(path.join(generatedDir, 'cover.jpg'));
        checks.push({ name: 'Cover image', status: 'pass' });
      } catch {
        checks.push({
          name: 'Cover image',
          status: 'fail',
          message: 'cover.jpg not found in generated/'
        });
      }
    }

    if (metadata.publishing?.lulu) {
      try {
        await fs.access(path.join(generatedDir, 'paperback.pdf'));
        checks.push({ name: 'Paperback PDF', status: 'pass' });
      } catch {
        checks.push({
          name: 'Paperback PDF',
          status: 'fail',
          message: 'paperback.pdf not found in generated/'
        });
      }

      try {
        await fs.access(path.join(generatedDir, 'cover.pdf'));
        checks.push({ name: 'Cover PDF', status: 'pass' });
      } catch {
        checks.push({
          name: 'Cover PDF',
          status: 'fail',
          message: 'cover.pdf not found in generated/'
        });
      }
    }
  }

  // Check pricing
  if (metadata.publishing?.kdp) {
    checks.push({
      name: 'eBook pricing',
      status: metadata.formats?.ebook?.price ? 'pass' : 'warning',
      message: metadata.formats?.ebook?.price ? undefined : 'No eBook price set (will use default)'
    });
  }

  if (metadata.publishing?.lulu) {
    checks.push({
      name: 'Paperback pricing',
      status: metadata.formats?.paperback?.price ? 'pass' : 'warning',
      message: metadata.formats?.paperback?.price ? undefined : 'No paperback price set (will use default)'
    });
  }

  return checks;
}

async function publishToPlatform(
  platform: string,
  bookSlug: string,
  metadata: any,
  options: PublishAllOptions
): Promise<PublishResult> {
  const monorepoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const generatedDir = path.join(
    monorepoRoot,
    'content/translations/books',
    bookSlug,
    'generated'
  );

  switch (platform) {
    case 'lulu': {
      const luluConfig = ConfigManager.get('lulu') || {
        apiKey: process.env.LULU_API_KEY,
        apiSecret: process.env.LULU_API_SECRET,
        sandbox: true
      };

      // Use mock credentials in mock mode
      if (options.mock || options.dryRun) {
        luluConfig.apiKey = luluConfig.apiKey || 'mock-api-key';
        luluConfig.apiSecret = luluConfig.apiSecret || 'mock-api-secret';
      }

      const lulu = new LuluService({
        apiKey: luluConfig.apiKey,
        apiSecret: luluConfig.apiSecret,
        sandbox: luluConfig.sandbox,
        mockMode: options.mock || options.dryRun
      });

      const project = await lulu.createProject({
        title: metadata.title,
        author: metadata.author,
        description: metadata.description,
        isbn: metadata.formats?.paperback?.isbn,
        category: metadata.categories?.[0],
        keywords: metadata.keywords,
        language: metadata.language || 'en',
        copyright_year: metadata.translation_year || new Date().getFullYear()
      });

      await lulu.uploadInteriorPdf(
        project.id,
        path.join(generatedDir, 'paperback.pdf')
      );

      await lulu.uploadCoverPdf(
        project.id,
        path.join(generatedDir, 'cover.pdf')
      );

      const pricing = metadata.formats?.paperback?.price || 14.99;
      await lulu.setPricing(project.id, [
        { currency: 'USD', price: pricing, territories: ['US'] },
        { currency: 'EUR', price: Math.round(pricing * 0.85), territories: ['EU'] },
        { currency: 'GBP', price: Math.round(pricing * 0.75), territories: ['GB'] }
      ]);

      const jobId = await lulu.publishProject(project.id);
      await lulu.waitForJob(jobId);

      return {
        platform: 'lulu',
        status: 'success',
        bookId: project.id,
        url: `https://${luluConfig.sandbox ? 'sandbox.' : ''}lulu.com/project/${project.id}`,
        timestamp: new Date().toISOString()
      };
    }

    case 'kdp': {
      const kdpConfig = ConfigManager.get('kdp') || {
        email: process.env.KDP_EMAIL,
        password: process.env.KDP_PASSWORD
      };

      // Use mock credentials in mock mode
      if (options.mock || options.dryRun) {
        kdpConfig.email = kdpConfig.email || 'mock@example.com';
        kdpConfig.password = kdpConfig.password || 'mock-password';
      }

      const kdp = new KdpService({
        email: kdpConfig.email,
        password: kdpConfig.password,
        headless: options.headless !== false,
        mockMode: options.mock || options.dryRun
      });

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

      const result = await kdp.publishCompleteBook(
        bookDetails,
        { filePath: path.join(generatedDir, 'kindle.epub'), format: 'epub' as const },
        { filePath: path.join(generatedDir, 'cover.jpg'), format: 'jpg' as const },
        {
          price: metadata.formats?.ebook?.price || 4.99,
          currency: metadata.formats?.ebook?.currency || 'USD',
          marketplaces: ['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'NL', 'JP', 'BR', 'CA', 'MX', 'AU', 'IN'],
          royaltyOption: '70%' as const,
          kdpSelect: true
        },
        false // Save as draft by default
      );

      return {
        platform: 'kdp',
        status: 'success',
        bookId: result.bookId,
        url: result.asin ? `https://www.amazon.com/dp/${result.asin}` : undefined,
        timestamp: new Date().toISOString()
      };
    }

    case 'ingram': {
      // IngramSpark not implemented yet
      return {
        platform: 'ingram',
        status: 'skipped',
        error: 'IngramSpark integration not implemented',
        timestamp: new Date().toISOString()
      };
    }

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

async function sendCompletionNotification(bookSlug: string, report: any): Promise<void> {
  // Check for notification configuration
  const config = await ConfigManager.load();
  
  // For now, just log the completion
  if (report.summary.successful > 0) {
    Logger.info(`🎉 Publishing complete for "${report.metadata.title}"`);
    Logger.info(`  Successful: ${report.summary.successful} platforms`);
    Logger.info(`  Failed: ${report.summary.failed} platforms`);
    
    report.results
      .filter((r: PublishResult) => r.status === 'success')
      .forEach((r: PublishResult) => {
        Logger.info(`  ${r.platform}: ${r.url || r.bookId}`);
      });
  }

  // TODO: Implement actual notifications
  // - Email via SendGrid/AWS SES
  // - Slack webhook
  // - Discord webhook
  // - SMS via Twilio
}