import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { LuluService } from '../services/lulu.js';
import { ConfigManager } from '../utils/config.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LuluPublishOptions {
  book: string;
  dryRun?: boolean;
  sandbox?: boolean;
  mockMode?: boolean;
  mock?: boolean;
  verbose?: boolean;
}

export function createLuluCommand(): Command {
  const luluCommand = new Command('lulu')
    .description('Publish books to Lulu Print API')
    .option('--sandbox', 'Use Lulu sandbox environment', true)
    .option('--production', 'Use Lulu production environment')
    .option('--mock', 'Run in mock mode without actual API calls');

  luluCommand
    .command('publish <book>')
    .description('Publish a book to Lulu')
    .option('--dry-run', 'Simulate publishing without actual API calls')
    .option('--force', 'Force publish even if already published')
    .action(async (book: string, options: LuluPublishOptions, command) => {
      const parentOptions = command.parent.opts();
      await publishToLulu(book, { ...options, ...parentOptions });
    });

  luluCommand
    .command('list')
    .description('List all projects on Lulu')
    .option('--limit <number>', 'Number of projects to list', '50')
    .action(async (options) => {
      await listProjects(options);
    });

  luluCommand
    .command('status <projectId>')
    .description('Check status of a Lulu project')
    .action(async (projectId: string) => {
      await checkProjectStatus(projectId);
    });

  return luluCommand;
}

async function publishToLulu(bookSlug: string, options: LuluPublishOptions) {
  const spinner = ora('Initializing Lulu publishing...').start();

  try {
    // Load configuration
    await ConfigManager.load();
    const luluConfig = ConfigManager.get('lulu') || {
      apiKey: process.env.LULU_API_KEY,
      apiSecret: process.env.LULU_API_SECRET,
      sandbox: !options.sandbox
    };

    // In mock mode, use fake credentials
    if (options.mockMode || options.mock || options.dryRun) {
      luluConfig.apiKey = luluConfig.apiKey || 'mock-api-key';
      luluConfig.apiSecret = luluConfig.apiSecret || 'mock-api-secret';
    }

    if (!luluConfig.apiKey || !luluConfig.apiSecret) {
      spinner.fail('Missing Lulu API credentials');
      Logger.error('Please set LULU_API_KEY and LULU_API_SECRET environment variables');
      process.exit(1);
    }

    // Initialize service
    const lulu = new LuluService({
      apiKey: luluConfig.apiKey,
      apiSecret: luluConfig.apiSecret,
      sandbox: luluConfig.sandbox,
      mockMode: options.mockMode || options.mock || options.dryRun
    });

    // Load book metadata
    spinner.text = 'Loading book metadata...';
    // Find monorepo root (where the top-level package.json with workspaces is)
    // __dirname is in dist/commands, so go up 4 levels: commands -> dist -> publisher -> apps -> root
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

    if (!metadata.publishing?.lulu) {
      spinner.fail(`Book ${bookSlug} is not configured for Lulu publishing`);
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

    const pdfPath = path.join(generatedDir, 'paperback.pdf');
    const coverPath = path.join(generatedDir, 'cover.pdf');

    // Skip file check in mock mode
    if (!options.mockMode && !options.mock && !options.dryRun) {
      try {
        await fs.access(pdfPath);
        await fs.access(coverPath);
      } catch {
        spinner.fail('Missing generated files. Please run generate:formats first.');
        Logger.error(`Expected files at: ${pdfPath} and ${coverPath}`);
        return;
      }
    }

    // Create project
    spinner.text = 'Creating Lulu project...';
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

    Logger.info(`Created project: ${project.id}`);

    // Upload interior PDF
    spinner.text = 'Uploading interior PDF...';
    await lulu.uploadInteriorPdf(project.id, pdfPath);

    // Upload cover PDF
    spinner.text = 'Uploading cover PDF...';
    await lulu.uploadCoverPdf(project.id, coverPath);

    // Set pricing
    spinner.text = 'Setting pricing...';
    const pricing = metadata.formats?.paperback?.price || 14.99;
    await lulu.setPricing(project.id, [
      {
        currency: 'USD',
        price: pricing,
        territories: ['US']
      },
      {
        currency: 'EUR',
        price: Math.round(pricing * 0.85), // Approximate EUR conversion
        territories: ['EU']
      },
      {
        currency: 'GBP',
        price: Math.round(pricing * 0.75), // Approximate GBP conversion
        territories: ['GB']
      }
    ]);

    // Publish project
    spinner.text = 'Publishing project...';
    const jobId = await lulu.publishProject(project.id);

    // Wait for completion
    spinner.text = 'Waiting for publishing to complete...';
    const jobStatus = await lulu.waitForJob(jobId, 300000); // 5 minute timeout

    if (jobStatus.status === 'completed') {
      spinner.succeed(`Successfully published ${metadata.title} to Lulu!`);
      Logger.info(`Project ID: ${project.id}`);
      Logger.info(`View at: https://${luluConfig.sandbox ? 'sandbox.' : ''}lulu.com/project/${project.id}`);
      
      // Save publishing report
      const reportDir = path.join(monorepoRoot, 'publishing-reports');
      await fs.mkdir(reportDir, { recursive: true });
      
      const report = {
        book: bookSlug,
        platform: 'lulu',
        projectId: project.id,
        publishedAt: new Date().toISOString(),
        metadata,
        environment: luluConfig.sandbox ? 'sandbox' : 'production'
      };
      
      const reportPath = path.join(
        reportDir,
        `${new Date().toISOString().split('T')[0]}-${bookSlug}-lulu.json`
      );
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      Logger.info(`Report saved to: ${reportPath}`);
    } else {
      spinner.fail(`Publishing failed: ${jobStatus.error}`);
    }

  } catch (error: any) {
    spinner.fail(`Publishing failed: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function listProjects(options: any) {
  const spinner = ora('Fetching projects...').start();

  try {
    await ConfigManager.load();
    const luluConfig = ConfigManager.get('lulu') || {
      apiKey: process.env.LULU_API_KEY,
      apiSecret: process.env.LULU_API_SECRET,
      sandbox: true
    };

    const lulu = new LuluService({
      apiKey: luluConfig.apiKey,
      apiSecret: luluConfig.apiSecret,
      sandbox: luluConfig.sandbox,
      mockMode: options.parent?.mock
    });

    const projects = await lulu.listProjects(parseInt(options.limit));
    spinner.succeed(`Found ${projects.length} projects`);

    if (projects.length === 0) {
      Logger.info('No projects found');
      return;
    }

    console.log('\nProjects:');
    projects.forEach(project => {
      console.log(`  ${chalk.cyan(project.id)} - ${chalk.bold(project.title)}`);
      console.log(`    Status: ${project.status}`);
      console.log(`    Created: ${project.created_date}`);
      console.log(`    Modified: ${project.modified_date}`);
      console.log('');
    });

  } catch (error: any) {
    spinner.fail(`Failed to list projects: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}

async function checkProjectStatus(projectId: string) {
  const spinner = ora('Checking project status...').start();

  try {
    await ConfigManager.load();
    const luluConfig = ConfigManager.get('lulu') || {
      apiKey: process.env.LULU_API_KEY,
      apiSecret: process.env.LULU_API_SECRET,
      sandbox: true
    };

    const lulu = new LuluService({
      apiKey: luluConfig.apiKey,
      apiSecret: luluConfig.apiSecret,
      sandbox: luluConfig.sandbox
    });

    const project = await lulu.getProject(projectId);
    spinner.succeed('Project details retrieved');

    console.log('\nProject Details:');
    console.log(`  ID: ${chalk.cyan(project.id)}`);
    console.log(`  Title: ${chalk.bold(project.title)}`);
    console.log(`  Status: ${chalk.green(project.status)}`);
    console.log(`  Created: ${project.created_date}`);
    console.log(`  Modified: ${project.modified_date}`);

  } catch (error: any) {
    spinner.fail(`Failed to get project status: ${error.message}`);
    Logger.error(error.message, error);
    process.exit(1);
  }
}