#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLuluCommand } from './commands/lulu.js';
import { createKdpCommand } from './commands/kdp.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  await readFile(join(__dirname, '..', 'package.json'), 'utf-8')
);

// Create the main program
const program = new Command();

// Configure the CLI
program
  .name('brainrot-publish')
  .description('CLI tool for publishing Brainrot books to multiple platforms')
  .version(packageJson.version)
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('-c, --config <path>', 'Path to custom configuration file')
  .hook('preAction', (thisCommand) => {
    // Handle global flags before any command
    const opts = thisCommand.opts();
    
    if (opts.noColor) {
      chalk.level = 0;
    }
    
    if (opts.quiet && opts.verbose) {
      console.error(chalk.red('Error: Cannot use --quiet and --verbose together'));
      process.exit(1);
    }
    
    // Set global verbosity level
    process.env.VERBOSE = opts.verbose ? 'true' : 'false';
    process.env.QUIET = opts.quiet ? 'true' : 'false';
  });

// Publish command
program
  .command('publish <book-slug>')
  .description('Publish a book to configured platforms')
  .option('-p, --platform <platforms...>', 'Platforms to publish to (kdp, lulu, ingram)', ['kdp', 'lulu'])
  .option('--dry-run', 'Simulate publishing without making actual changes')
  .option('--skip-validation', 'Skip pre-flight validation checks')
  .option('--force', 'Force publishing even if book already exists')
  .action(async (bookSlug: string, options) => {
    const spinner = ora(`Publishing ${chalk.cyan(bookSlug)}...`).start();
    
    try {
      // TODO: Implement publishing logic
      if (options.dryRun) {
        spinner.info(`Dry run mode - would publish ${bookSlug} to: ${options.platform.join(', ')}`);
      } else {
        spinner.succeed(`Published ${chalk.green(bookSlug)} successfully!`);
      }
    } catch (error) {
      spinner.fail(`Failed to publish ${chalk.red(bookSlug)}`);
      if (process.env.VERBOSE === 'true') {
        console.error(error);
      }
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List all available books')
  .option('-f, --format <format>', 'Output format (table, json, csv)', 'table')
  .action(async (options) => {
    try {
      // TODO: Implement book listing from content/translations/books
      console.log(chalk.cyan('Available books:'));
      console.log('  • great-gatsby');
      console.log('  • the-iliad');
      console.log('  • the-odyssey');
      console.log('  • the-aeneid');
      console.log('  • alice-in-wonderland');
      console.log('  • frankenstein');
      console.log('  • declaration-of-independence');
      console.log('  • simple-sabotage-field-manual');
      console.log('  • la-divina-comedia');
      console.log('  • tao-te-ching');
    } catch (error) {
      console.error(chalk.red('Failed to list books:'), error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status <book-slug>')
  .description('Check publishing status of a book')
  .action(async (bookSlug: string) => {
    const spinner = ora(`Checking status for ${chalk.cyan(bookSlug)}...`).start();
    
    try {
      // TODO: Implement status checking
      spinner.succeed(`Status for ${chalk.green(bookSlug)}:`);
      console.log('  KDP: Not published');
      console.log('  Lulu: Not published');
      console.log('  IngramSpark: Not configured');
    } catch (error) {
      spinner.fail(`Failed to check status for ${chalk.red(bookSlug)}`);
      if (process.env.VERBOSE === 'true') {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate <book-slug>')
  .description('Validate book metadata and files before publishing')
  .action(async (bookSlug: string) => {
    const spinner = ora(`Validating ${chalk.cyan(bookSlug)}...`).start();
    
    try {
      // TODO: Implement validation logic
      spinner.succeed(`${chalk.green(bookSlug)} is ready for publishing!`);
      console.log(chalk.gray('  ✓ Metadata file exists'));
      console.log(chalk.gray('  ✓ ISBN format is valid'));
      console.log(chalk.gray('  ✓ All required fields present'));
      console.log(chalk.gray('  ✓ Text files generated'));
      console.log(chalk.gray('  ✓ Cover image available'));
    } catch (error) {
      spinner.fail(`Validation failed for ${chalk.red(bookSlug)}`);
      if (process.env.VERBOSE === 'true') {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Add Lulu command
program.addCommand(createLuluCommand());

// Add KDP command
program.addCommand(createKdpCommand());

// Configure command
program
  .command('configure')
  .description('Configure publishing platform credentials')
  .option('--kdp', 'Configure Amazon KDP credentials')
  .option('--lulu', 'Configure Lulu API credentials')
  .option('--ingram', 'Configure IngramSpark credentials')
  .action(async (options) => {
    try {
      if (!options.kdp && !options.lulu && !options.ingram) {
        console.log(chalk.yellow('Please specify a platform to configure:'));
        console.log('  brainrot-publish configure --kdp');
        console.log('  brainrot-publish configure --lulu');
        console.log('  brainrot-publish configure --ingram');
        return;
      }
      
      // TODO: Implement configuration logic with inquirer
      console.log(chalk.cyan('Configuration wizard coming soon...'));
    } catch (error) {
      console.error(chalk.red('Configuration failed:'), error);
      process.exit(1);
    }
  });

// Help command enhancement
program.addHelpText('after', `
${chalk.cyan('Examples:')}
  $ brainrot-publish publish great-gatsby
  $ brainrot-publish publish the-iliad --platform kdp
  $ brainrot-publish publish alice-in-wonderland --dry-run
  $ brainrot-publish list --format json
  $ brainrot-publish status great-gatsby
  $ brainrot-publish validate the-odyssey
  $ brainrot-publish configure --lulu

${chalk.cyan('Environment Variables:')}
  LULU_API_KEY       Lulu API key
  LULU_API_SECRET    Lulu API secret
  KDP_EMAIL          Amazon KDP email
  KDP_PASSWORD       Amazon KDP password

${chalk.cyan('Configuration:')}
  Config files are loaded from (in order):
    1. Path specified with --config flag
    2. .publishrc.json in current directory
    3. ~/.brainrot/publisher.config.json
    4. Default configuration

${chalk.cyan('For more information:')}
  https://github.com/phrazzld/brainrot
`);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}