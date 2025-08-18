#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import ora from 'ora';
import chalk from 'chalk';
import pLimit from 'p-limit';
import * as cliProgress from 'cli-progress';
import { put, list, del } from '@vercel/blob';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface SyncOptions {
  force?: boolean;
  delete?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  concurrency?: number;
}

interface FileToUpload {
  localPath: string;
  blobPath: string;
  checksum: string;
  size: number;
}

interface BlobFile {
  pathname: string;
  url: string;
  size: number;
}

const program = new Command();

program
  .name('sync-translations')
  .description('Sync generated text files to Vercel Blob storage')
  .version('1.0.0');

program
  .command('book <slug>')
  .description('Sync a specific book to blob storage')
  .option('-f, --force', 'Upload all files regardless of checksums')
  .option('-d, --delete', 'Delete orphaned files from blob storage')
  .option('--dry-run', 'Show what would be uploaded without actually uploading')
  .option('--verbose', 'Show detailed progress')
  .option('-c, --concurrency <number>', 'Number of concurrent uploads', '5')
  .action(async (slug: string, options: SyncOptions) => {
    await syncBook(slug, options);
  });

program
  .command('all')
  .description('Sync all books to blob storage')
  .option('-f, --force', 'Upload all files regardless of checksums')
  .option('-d, --delete', 'Delete orphaned files from blob storage')
  .option('--dry-run', 'Show what would be uploaded without actually uploading')
  .option('--verbose', 'Show detailed progress')
  .option('-c, --concurrency <number>', 'Number of concurrent uploads', '5')
  .action(async (options: SyncOptions) => {
    await syncAllBooks(options);
  });

async function calculateChecksum(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

async function getExistingBlobs(prefix: string): Promise<Map<string, BlobFile>> {
  try {
    const response = await list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN });
    const blobMap = new Map<string, BlobFile>();
    
    response.blobs.forEach(blob => {
      blobMap.set(blob.pathname, blob);
    });
    
    return blobMap;
  } catch (error) {
    console.error(chalk.yellow('Warning: Could not fetch existing blobs'), error);
    return new Map();
  }
}

async function syncBook(slug: string, options: SyncOptions) {
  const spinner = ora(`Syncing ${chalk.cyan(slug)}...`).start();
  
  try {
    // Check if generated files exist
    const generatedPath = path.join(process.cwd(), 'generated', slug, 'text');
    const generatedExists = await fs.access(generatedPath).then(() => true).catch(() => false);
    
    if (!generatedExists) {
      spinner.fail(`No generated text files found for ${chalk.red(slug)}`);
      console.log(chalk.yellow(`Run 'pnpm generate:formats book ${slug}' first`));
      process.exit(1);
    }
    
    // Get list of files to upload
    const files = await fs.readdir(generatedPath);
    const textFiles = files.filter(f => f.endsWith('.txt'));
    
    if (textFiles.length === 0) {
      spinner.warn(`No text files found for ${chalk.yellow(slug)}`);
      return;
    }
    
    spinner.text = `Found ${textFiles.length} files to sync for ${chalk.cyan(slug)}`;
    
    // Prepare upload list with checksums
    const filesToUpload: FileToUpload[] = [];
    for (const file of textFiles) {
      const localPath = path.join(generatedPath, file);
      const blobPath = `books/${slug}/text/${file}`;
      const stats = await fs.stat(localPath);
      const checksum = await calculateChecksum(localPath);
      
      filesToUpload.push({
        localPath,
        blobPath,
        checksum,
        size: stats.size
      });
    }
    
    // Get existing blobs to check for duplicates
    const existingBlobs = await getExistingBlobs(`books/${slug}/text/`);
    
    // Filter files that need uploading (unless --force is used)
    let toUpload = filesToUpload;
    if (!options.force) {
      // For now, upload all files since we can't compare checksums with blob storage
      // In a real implementation, we'd store checksums in metadata
      spinner.text = `Checking ${filesToUpload.length} files for changes...`;
    }
    
    if (toUpload.length === 0) {
      spinner.succeed(`${chalk.green(slug)} is already up to date`);
      return;
    }
    
    spinner.stop();
    
    // Create progress bar for uploads
    const progressBar = new cliProgress.SingleBar({
      format: 'Uploading |{bar}| {percentage}% | {value}/{total} Files | {filename}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    }, cliProgress.Presets.shades_classic);
    
    if (!options.dryRun) {
      progressBar.start(toUpload.length, 0, { filename: 'Starting...' });
    }
    
    // Upload files with concurrency limit
    const limit = pLimit(parseInt(options.concurrency || '5'));
    let uploaded = 0;
    let errors = 0;
    const uploadLog: any[] = [];
    
    const uploadTasks = toUpload.map(file => 
      limit(async () => {
        try {
          if (!options.dryRun) {
            progressBar.update(uploaded, { filename: path.basename(file.localPath) });
            
            const content = await fs.readFile(file.localPath);
            const blob = await put(file.blobPath, content, {
              access: 'public',
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            
            uploaded++;
            progressBar.update(uploaded, { filename: path.basename(file.localPath) });
            
            uploadLog.push({
              file: file.blobPath,
              url: blob.url,
              size: file.size,
              checksum: file.checksum,
              timestamp: new Date().toISOString()
            });
            
            if (options.verbose) {
              console.log(chalk.green(`  ✓ ${file.blobPath}`));
            }
          } else {
            console.log(chalk.gray(`  Would upload: ${file.blobPath} (${(file.size / 1024).toFixed(1)}KB)`));
          }
        } catch (error) {
          errors++;
          console.error(chalk.red(`  ✗ Failed to upload ${file.blobPath}:`), error);
        }
      })
    );
    
    await Promise.all(uploadTasks);
    
    if (!options.dryRun) {
      progressBar.stop();
    }
    
    // Handle orphaned files deletion if requested
    if (options.delete && !options.dryRun) {
      const uploadedPaths = new Set(toUpload.map(f => f.blobPath));
      const toDelete: string[] = [];
      
      existingBlobs.forEach((blob, pathname) => {
        if (!uploadedPaths.has(pathname)) {
          toDelete.push(pathname);
        }
      });
      
      if (toDelete.length > 0) {
        const deleteSpinner = ora(`Deleting ${toDelete.length} orphaned files...`).start();
        
        for (const pathname of toDelete) {
          try {
            await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
            if (options.verbose) {
              console.log(chalk.yellow(`  Deleted: ${pathname}`));
            }
          } catch (error) {
            console.error(chalk.red(`  Failed to delete ${pathname}:`), error);
          }
        }
        
        deleteSpinner.succeed(`Deleted ${toDelete.length} orphaned files`);
      }
    }
    
    // Save sync log
    if (!options.dryRun && uploadLog.length > 0) {
      const logPath = path.join(process.cwd(), 'sync-log.json');
      let existingLog: any = {};
      
      try {
        const existing = await fs.readFile(logPath, 'utf-8');
        existingLog = JSON.parse(existing);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }
      
      existingLog[slug] = {
        lastSync: new Date().toISOString(),
        filesUploaded: uploaded,
        errors: errors,
        files: uploadLog
      };
      
      await fs.writeFile(logPath, JSON.stringify(existingLog, null, 2));
    }
    
    // Final status
    if (!options.dryRun) {
      if (errors > 0) {
        console.log(chalk.yellow(`\n⚠ Synced ${uploaded} files for ${slug} with ${errors} errors`));
      } else {
        console.log(chalk.green(`\n✓ Successfully synced ${uploaded} files for ${slug}`));
      }
    } else {
      console.log(chalk.gray(`\nDry run complete. Would upload ${toUpload.length} files.`));
    }
    
  } catch (error) {
    spinner.fail(`Failed to sync ${chalk.red(slug)}`);
    console.error(error);
    process.exit(1);
  }
}

async function syncAllBooks(options: SyncOptions) {
  const generatedPath = path.join(process.cwd(), 'generated');
  
  try {
    // Get list of all books with generated content
    const books = await fs.readdir(generatedPath);
    const bookSlugs: string[] = [];
    
    for (const book of books) {
      const bookPath = path.join(generatedPath, book);
      const stat = await fs.stat(bookPath);
      if (stat.isDirectory()) {
        const textPath = path.join(bookPath, 'text');
        const hasText = await fs.access(textPath).then(() => true).catch(() => false);
        if (hasText) {
          bookSlugs.push(book);
        }
      }
    }
    
    if (bookSlugs.length === 0) {
      console.log(chalk.yellow('No books with generated text found'));
      console.log(chalk.gray('Run "pnpm generate:formats all" first'));
      return;
    }
    
    console.log(chalk.cyan(`Found ${bookSlugs.length} books to sync\n`));
    
    // Sync each book
    for (const slug of bookSlugs) {
      await syncBook(slug, options);
      console.log(''); // Add spacing between books
    }
    
    console.log(chalk.green(`\n✓ Completed syncing all ${bookSlugs.length} books`));
    
  } catch (error) {
    console.error(chalk.red('Failed to sync books:'), error);
    process.exit(1);
  }
}

// Check for required environment variables
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(chalk.red('Error: BLOB_READ_WRITE_TOKEN not found in environment'));
  console.error(chalk.yellow('Please ensure .env.local contains BLOB_READ_WRITE_TOKEN'));
  process.exit(1);
}

// Run the CLI
program.parse(process.argv);