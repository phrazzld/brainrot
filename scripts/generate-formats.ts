#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import pLimit from 'p-limit';
import * as yaml from 'js-yaml';
import { stripMarkdown, markdownToText } from '../packages/@brainrot/converter/dist/index.js';

interface BookMetadata {
  title: string;
  author: string;
  translator: string;
  description: string;
  formats: {
    ebook: { isbn: string; price: number };
    paperback: { isbn: string; price: number; pages: number };
    hardcover: { isbn: string; price: number; pages: number };
  };
}

interface GenerateOptions {
  format?: string[];
  output?: string;
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
}

const program = new Command();

program
  .name('generate-formats')
  .description('Generate multiple formats (text, EPUB, PDF) from book translations')
  .version('1.0.0');

program
  .command('book <slug>')
  .description('Generate formats for a specific book')
  .option('-f, --format <formats...>', 'Formats to generate (text, epub, pdf)', ['text'])
  .option('-o, --output <dir>', 'Output directory', './generated')
  .option('--dry-run', 'Show what would be generated without creating files')
  .option('--verbose', 'Show detailed progress')
  .option('--force', 'Overwrite existing files')
  .action(async (slug: string, options: GenerateOptions) => {
    await generateFormatsForBook(slug, options);
  });

program
  .command('all')
  .description('Generate formats for all books')
  .option('-f, --format <formats...>', 'Formats to generate (text, epub, pdf)', ['text'])
  .option('-o, --output <dir>', 'Output directory', './generated')
  .option('--dry-run', 'Show what would be generated without creating files')
  .option('--verbose', 'Show detailed progress')
  .option('--force', 'Overwrite existing files')
  .action(async (options: GenerateOptions) => {
    await generateFormatsForAllBooks(options);
  });

async function generateFormatsForBook(slug: string, options: GenerateOptions) {
  const spinner = ora(`Processing ${chalk.cyan(slug)}...`).start();
  
  try {
    // Check if book exists
    const bookPath = path.join(process.cwd(), 'content', 'translations', 'books', slug);
    const bookExists = await fs.access(bookPath).then(() => true).catch(() => false);
    
    if (!bookExists) {
      spinner.fail(`Book ${chalk.red(slug)} not found`);
      process.exit(1);
    }
    
    // Load metadata
    const metadataPath = path.join(bookPath, 'metadata.yaml');
    const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
    
    if (!metadataExists) {
      spinner.warn(`No metadata.yaml found for ${chalk.yellow(slug)}`);
    }
    
    let metadata: BookMetadata | null = null;
    if (metadataExists) {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = yaml.load(metadataContent) as BookMetadata;
    }
    
    // Create output directory
    const outputDir = path.join(options.output || './generated', slug);
    if (!options.dryRun) {
      await fs.mkdir(outputDir, { recursive: true });
    }
    
    // Generate requested formats
    const formats = options.format || ['text'];
    
    for (const format of formats) {
      spinner.text = `Generating ${format} for ${chalk.cyan(slug)}...`;
      
      switch (format) {
        case 'text':
          await generateTextFormat(bookPath, outputDir, slug, options);
          break;
        case 'epub':
          await generateEpubFormat(bookPath, outputDir, slug, metadata, options);
          break;
        case 'pdf':
          await generatePdfFormat(bookPath, outputDir, slug, metadata, options);
          break;
        default:
          spinner.warn(`Unknown format: ${format}`);
      }
    }
    
    spinner.succeed(`Generated ${formats.join(', ')} for ${chalk.green(slug)}`);
    
  } catch (error) {
    spinner.fail(`Failed to process ${chalk.red(slug)}: ${error}`);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

async function generateTextFormat(
  bookPath: string, 
  outputDir: string, 
  slug: string,
  options: GenerateOptions
) {
  // Check for different directory structures
  const brainrotPath = path.join(bookPath, 'brainrot');
  const brainrotExists = await fs.access(brainrotPath).then(() => true).catch(() => false);
  
  // Check for translation.txt directly in book directory
  const translationPath = path.join(bookPath, 'translation.txt');
  const translationExists = await fs.access(translationPath).then(() => true).catch(() => false);
  
  if (!brainrotExists && !translationExists) {
    if (options.verbose) {
      console.log(`  Skipping ${slug} - no brainrot directory or translation.txt found`);
    }
    return;
  }
  
  let filesToConvert: { inputPath: string; outputName: string }[] = [];
  
  if (brainrotExists) {
    // Handle brainrot directory structure
    let files = await fs.readdir(brainrotPath);
    let markdownFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));
    
    // Check if there's a text subdirectory (for books like The Iliad)
    const textSubdir = path.join(brainrotPath, 'text');
    const textSubdirExists = await fs.access(textSubdir).then(() => true).catch(() => false);
    
    if (textSubdirExists && markdownFiles.length === 0) {
      // Use files from text subdirectory instead
      files = await fs.readdir(textSubdir);
      markdownFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));
      
      filesToConvert = markdownFiles.map(file => ({
        inputPath: path.join(textSubdir, file),
        outputName: file.replace(/\.(md|txt)$/, '.txt')
      }));
    } else {
      filesToConvert = markdownFiles.map(file => ({
        inputPath: path.join(brainrotPath, file),
        outputName: file.replace(/\.(md|txt)$/, '.txt')
      }));
    }
  } else if (translationExists) {
    // Handle single translation.txt file
    filesToConvert = [{
      inputPath: translationPath,
      outputName: `${slug}-complete.txt`
    }];
  }
  
  if (options.verbose) {
    console.log(`  Found ${filesToConvert.length} files to convert`);
  }
  
  // Convert each file to text
  for (const { inputPath, outputName } of filesToConvert) {
    const outputPath = path.join(outputDir, 'text', outputName);
    
    if (!options.dryRun) {
      // Create text subdirectory
      await fs.mkdir(path.join(outputDir, 'text'), { recursive: true });
      
      // Read and convert content
      const content = await fs.readFile(inputPath, 'utf-8');
      const textContent = stripMarkdown(content);
      
      // Check if file exists and handle accordingly
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      if (fileExists && !options.force) {
        if (options.verbose) {
          console.log(`    Skipping ${outputName} (already exists)`);
        }
        continue;
      }
      
      // Write text file
      await fs.writeFile(outputPath, textContent, 'utf-8');
      
      if (options.verbose) {
        console.log(`    Created ${outputName}`);
      }
    } else {
      if (options.verbose) {
        console.log(`    Would create ${outputName}`);
      }
    }
  }
}

async function generateEpubFormat(
  bookPath: string,
  outputDir: string,
  slug: string,
  metadata: BookMetadata | null,
  options: GenerateOptions
) {
  // EPUB generation would require pandoc
  // For now, we'll create a placeholder
  if (options.verbose) {
    console.log(`  EPUB generation requires pandoc (not yet implemented)`);
  }
  
  if (!options.dryRun) {
    const epubPath = path.join(outputDir, `${slug}.epub`);
    // Placeholder: would call pandoc here
    // await execAsync(`pandoc -o ${epubPath} ...`);
  }
}

async function generatePdfFormat(
  bookPath: string,
  outputDir: string,
  slug: string,
  metadata: BookMetadata | null,
  options: GenerateOptions
) {
  // PDF generation would require pandoc + LaTeX
  // For now, we'll create placeholders
  if (options.verbose) {
    console.log(`  PDF generation requires pandoc + LaTeX (not yet implemented)`);
  }
  
  if (!options.dryRun) {
    const paperbackPath = path.join(outputDir, `${slug}-paperback.pdf`);
    const hardcoverPath = path.join(outputDir, `${slug}-hardcover.pdf`);
    // Placeholder: would call pandoc here
    // await execAsync(`pandoc -o ${paperbackPath} --template=paperback.latex ...`);
    // await execAsync(`pandoc -o ${hardcoverPath} --template=hardcover.latex ...`);
  }
}

async function generateFormatsForAllBooks(options: GenerateOptions) {
  const booksPath = path.join(process.cwd(), 'content', 'translations', 'books');
  const books = await fs.readdir(booksPath);
  
  // Filter out non-directories
  const bookSlugs: string[] = [];
  for (const book of books) {
    const stat = await fs.stat(path.join(booksPath, book));
    if (stat.isDirectory()) {
      bookSlugs.push(book);
    }
  }
  
  console.log(chalk.cyan(`Found ${bookSlugs.length} books to process\n`));
  
  // Process books with concurrency limit
  const limit = pLimit(3);
  const tasks = bookSlugs.map(slug => 
    limit(async () => {
      await generateFormatsForBook(slug, { ...options, verbose: false });
    })
  );
  
  await Promise.all(tasks);
  
  console.log(chalk.green(`\n✓ Processed all ${bookSlugs.length} books successfully`));
}

// Run the CLI
program.parse(process.argv);