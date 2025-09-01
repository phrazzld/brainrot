#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import ora from "ora";
import chalk from "chalk";
import pLimit from "p-limit";
import * as yaml from "js-yaml";
import {
  stripMarkdown,
  markdownToText,
  markdownToEpub,
} from "../packages/@brainrot/converter/dist/index.js";
import { generateLegalPages } from "../packages/@brainrot/templates/index.js";

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

interface CacheEntry {
  hash: string;
  timestamp: string;
  files: Record<string, string>; // filename -> hash
}

interface CacheDatabase {
  entries: Record<string, CacheEntry>; // format -> CacheEntry
  lastUpdated: string;
}

// Caching utilities
function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

function calculateMultiFileHash(contents: string[]): string {
  const combined = contents.join('\n---FILE-SEPARATOR---\n');
  return calculateContentHash(combined);
}

async function loadCache(cacheDir: string): Promise<CacheDatabase> {
  const cachePath = path.join(cacheDir, '.cache.json');
  
  try {
    const data = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(data) as CacheDatabase;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Cache file doesn't exist, create new database
      return {
        entries: {},
        lastUpdated: new Date().toISOString()
      };
    }
    throw new Error(`Failed to load cache: ${error.message}`);
  }
}

async function saveCache(cacheDir: string, cache: CacheDatabase): Promise<void> {
  const cachePath = path.join(cacheDir, '.cache.json');
  
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    cache.lastUpdated = new Date().toISOString();
    const data = JSON.stringify(cache, null, 2);
    await fs.writeFile(cachePath, data, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save cache: ${(error as Error).message}`);
  }
}

async function isContentChanged(
  format: string,
  currentHash: string,
  outputFiles: string[],
  cacheDir: string
): Promise<boolean> {
  const cache = await loadCache(cacheDir);
  const cacheEntry = cache.entries[format];
  
  if (!cacheEntry) {
    return true; // No cache entry, content is considered changed
  }
  
  // Check if hash has changed
  if (cacheEntry.hash !== currentHash) {
    return true;
  }
  
  // Check if all output files still exist
  for (const filePath of outputFiles) {
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!exists) {
      return true; // Output file missing, need to regenerate
    }
  }
  
  return false; // Content hasn't changed and files exist
}

async function updateCache(
  format: string,
  contentHash: string,
  outputFiles: string[],
  cacheDir: string
): Promise<void> {
  const cache = await loadCache(cacheDir);
  
  // Calculate hashes for output files
  const fileHashes: Record<string, string> = {};
  for (const filePath of outputFiles) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      fileHashes[fileName] = calculateContentHash(fileContent);
    } catch (error) {
      // File might not exist or be readable, skip it
    }
  }
  
  cache.entries[format] = {
    hash: contentHash,
    timestamp: new Date().toISOString(),
    files: fileHashes
  };
  
  await saveCache(cacheDir, cache);
}

const program = new Command();

program
  .name("generate-formats")
  .description(
    "Generate multiple formats (text, EPUB, PDF) from book translations",
  )
  .version("1.0.0");

program
  .command("book <slug>")
  .description("Generate formats for a specific book")
  .option(
    "-f, --format <formats...>",
    "Formats to generate (text, epub, pdf)",
    ["text"],
  )
  .option("-o, --output <dir>", "Output directory", "./generated")
  .option("--dry-run", "Show what would be generated without creating files")
  .option("--verbose", "Show detailed progress")
  .option("--force", "Overwrite existing files")
  .action(async (slug: string, options: GenerateOptions) => {
    await generateFormatsForBook(slug, options);
  });

program
  .command("all")
  .description("Generate formats for all books")
  .option(
    "-f, --format <formats...>",
    "Formats to generate (text, epub, pdf)",
    ["text"],
  )
  .option("-o, --output <dir>", "Output directory", "./generated")
  .option("--dry-run", "Show what would be generated without creating files")
  .option("--verbose", "Show detailed progress")
  .option("--force", "Overwrite existing files")
  .action(async (options: GenerateOptions) => {
    await generateFormatsForAllBooks(options);
  });

async function generateFormatsForBook(slug: string, options: GenerateOptions) {
  const spinner = ora(`Processing ${chalk.cyan(slug)}...`).start();

  try {
    // Check if book exists
    const bookPath = path.join(
      process.cwd(),
      "content",
      "translations",
      "books",
      slug,
    );
    const bookExists = await fs
      .access(bookPath)
      .then(() => true)
      .catch(() => false);

    if (!bookExists) {
      spinner.fail(`Book ${chalk.red(slug)} not found`);
      process.exit(1);
    }

    // Load metadata
    const metadataPath = path.join(bookPath, "metadata.yaml");
    const metadataExists = await fs
      .access(metadataPath)
      .then(() => true)
      .catch(() => false);

    if (!metadataExists) {
      spinner.warn(`No metadata.yaml found for ${chalk.yellow(slug)}`);
    }

    let metadata: BookMetadata | null = null;
    if (metadataExists) {
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      metadata = yaml.load(metadataContent) as BookMetadata;
    }

    // Create output directory
    const outputDir = path.join(options.output || "./generated", slug);
    if (!options.dryRun) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    // Generate requested formats
    const formats = options.format || ["text"];

    for (const format of formats) {
      spinner.text = `Generating ${format} for ${chalk.cyan(slug)}...`;

      switch (format) {
        case "text":
          await generateTextFormat(bookPath, outputDir, slug, options);
          break;
        case "epub":
          await generateEpubFormat(
            bookPath,
            outputDir,
            slug,
            metadata,
            options,
          );
          break;
        case "pdf":
          await generatePdfFormat(bookPath, outputDir, slug, metadata, options);
          break;
        default:
          spinner.warn(`Unknown format: ${format}`);
      }
    }

    spinner.succeed(`Generated ${formats.join(", ")} for ${chalk.green(slug)}`);
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
  options: GenerateOptions,
) {
  // Check for different directory structures
  const brainrotPath = path.join(bookPath, "brainrot");
  const brainrotExists = await fs
    .access(brainrotPath)
    .then(() => true)
    .catch(() => false);

  // Check for translation.txt directly in book directory
  const translationPath = path.join(bookPath, "translation.txt");
  const translationExists = await fs
    .access(translationPath)
    .then(() => true)
    .catch(() => false);

  if (!brainrotExists && !translationExists) {
    if (options.verbose) {
      console.log(
        `  Skipping ${slug} - no brainrot directory or translation.txt found`,
      );
    }
    return;
  }

  let filesToConvert: { inputPath: string; outputName: string }[] = [];

  if (brainrotExists) {
    // Handle brainrot directory structure
    let files = await fs.readdir(brainrotPath);
    let markdownFiles = files.filter(
      (f) => f.endsWith(".md") || f.endsWith(".txt"),
    );

    // Check if there's a text subdirectory (for books like The Iliad)
    const textSubdir = path.join(brainrotPath, "text");
    const textSubdirExists = await fs
      .access(textSubdir)
      .then(() => true)
      .catch(() => false);

    if (textSubdirExists && markdownFiles.length === 0) {
      // Use files from text subdirectory instead
      files = await fs.readdir(textSubdir);
      markdownFiles = files.filter(
        (f) => f.endsWith(".md") || f.endsWith(".txt"),
      );

      filesToConvert = markdownFiles.map((file) => ({
        inputPath: path.join(textSubdir, file),
        outputName: file.replace(/\.(md|txt)$/, ".txt"),
      }));
    } else {
      filesToConvert = markdownFiles.map((file) => ({
        inputPath: path.join(brainrotPath, file),
        outputName: file.replace(/\.(md|txt)$/, ".txt"),
      }));
    }
  } else if (translationExists) {
    // Handle single translation.txt file
    filesToConvert = [
      {
        inputPath: translationPath,
        outputName: `${slug}-complete.txt`,
      },
    ];
  }

  if (options.verbose) {
    console.log(`  Found ${filesToConvert.length} files to convert`);
  }

  // Calculate content hash for all input files
  const inputContents: string[] = [];
  for (const { inputPath } of filesToConvert) {
    const content = await fs.readFile(inputPath, "utf-8");
    inputContents.push(content);
  }
  const contentHash = calculateMultiFileHash(inputContents);
  
  // Prepare output file paths
  const outputPaths = filesToConvert.map(({ outputName }) => 
    path.join(outputDir, outputName)
  );

  // Check if content has changed (unless force is enabled)
  if (!options.force) {
    const hasChanged = await isContentChanged('text', contentHash, outputPaths, outputDir);
    if (!hasChanged) {
      if (options.verbose) {
        console.log(`    Skipping text generation (content unchanged)`);
      }
      return;
    }
  }

  // Convert each file to text
  for (const { inputPath, outputName } of filesToConvert) {
    const outputPath = path.join(outputDir, outputName);

    if (!options.dryRun) {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Read and convert content
      const content = await fs.readFile(inputPath, "utf-8");
      const textContent = stripMarkdown(content);

      // Write text file
      await fs.writeFile(outputPath, textContent, "utf-8");

      if (options.verbose) {
        console.log(`    Created ${outputName}`);
      }
    } else {
      if (options.verbose) {
        console.log(`    Would create ${outputName}`);
      }
    }
  }

  // Update cache after successful generation
  if (!options.dryRun) {
    await updateCache('text', contentHash, outputPaths, outputDir);
  }
}

async function generateEpubFormat(
  bookPath: string,
  outputDir: string,
  slug: string,
  metadata: BookMetadata | null,
  options: GenerateOptions,
) {
  // Check for different directory structures (matching text format logic)
  const brainrotPath = path.join(bookPath, "brainrot");
  const brainrotExists = await fs
    .access(brainrotPath)
    .then(() => true)
    .catch(() => false);

  // Check for translation.txt directly in book directory
  const translationPath = path.join(bookPath, "translation.txt");
  const translationExists = await fs
    .access(translationPath)
    .then(() => true)
    .catch(() => false);

  if (!brainrotExists && !translationExists) {
    if (options.verbose) {
      console.log(
        `  Skipping ${slug} - no brainrot directory or translation.txt found`,
      );
    }
    return;
  }

  let markdownContent = "";

  if (brainrotExists) {
    // Handle brainrot directory structure
    let files = await fs.readdir(brainrotPath);
    let markdownFiles = files.filter(
      (f) => f.endsWith(".md") || f.endsWith(".txt"),
    );

    // Check if there's a text subdirectory (for books like The Iliad)
    const textSubdir = path.join(brainrotPath, "text");
    const textSubdirExists = await fs
      .access(textSubdir)
      .then(() => true)
      .catch(() => false);

    if (textSubdirExists && markdownFiles.length === 0) {
      // Use files from text subdirectory instead
      files = await fs.readdir(textSubdir);
      markdownFiles = files.filter(
        (f) => f.endsWith(".md") || f.endsWith(".txt"),
      );

      // Read and concatenate all files from text subdirectory
      for (const file of markdownFiles.sort()) {
        const filePath = path.join(textSubdir, file);
        const content = await fs.readFile(filePath, "utf-8");
        markdownContent += content + "\n\n";
      }
    } else {
      // Read and concatenate all files from brainrot directory
      for (const file of markdownFiles.sort()) {
        const filePath = path.join(brainrotPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        markdownContent += content + "\n\n";
      }
    }
  } else if (translationExists) {
    // Handle single translation.txt file
    markdownContent = await fs.readFile(translationPath, "utf-8");
  }

  if (!markdownContent.trim()) {
    if (options.verbose) {
      console.log(`  Skipping ${slug} - no content found`);
    }
    return;
  }

  // Calculate content hash for EPUB generation
  const metadataString = metadata ? JSON.stringify(metadata) : '{}';
  const legalContent = generateLegalPages(metadata || {});
  const combinedContent = [
    markdownContent,
    metadataString,
    legalContent,
    slug, // Include slug as it affects title generation
    new Date().getFullYear().toString() // Include year as it affects dates
  ];
  const contentHash = calculateMultiFileHash(combinedContent);
  
  // Prepare output file paths
  const epubPath = path.join(outputDir, "book.epub");
  const legalPath = path.join(outputDir, "legal.md");
  const outputPaths = [epubPath, legalPath];

  // Check if content has changed (unless force is enabled)
  if (!options.force) {
    const hasChanged = await isContentChanged('epub', contentHash, outputPaths, outputDir);
    if (!hasChanged) {
      if (options.verbose) {
        console.log(`    Skipping EPUB generation (content unchanged)`);
      }
      return;
    }
  }

  if (!options.dryRun) {
    try {
      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // Generate legal pages
      const legalContent = generateLegalPages(metadata || {});
      const legalPath = path.join(outputDir, "legal.md");
      await fs.writeFile(legalPath, legalContent, "utf-8");

      if (options.verbose) {
        console.log(`    Created legal.md`);
      }

      // Prepare metadata for pandoc
      const conversionOptions = {
        title: metadata?.title || slug.replace(/-/g, " ").toUpperCase(),
        author: metadata?.author || "Anonymous",
        date: new Date().getFullYear().toString(),
        language: "en",
        publisher: "Brainrot Publishing House",
        outputPath: epubPath,
        includeBeforeBody: legalPath,
      };

      // Generate EPUB using pandoc
      await markdownToEpub(markdownContent, conversionOptions);

      if (options.verbose) {
        console.log(`    Created book.epub`);
      }

      // Update cache after successful generation
      await updateCache('epub', contentHash, outputPaths, outputDir);
    } catch (error) {
      throw new Error(`EPUB generation failed for ${slug}: ${error}`);
    }
  } else {
    if (options.verbose) {
      console.log(`    Would create book.epub`);
    }
  }
}

async function generatePdfFormat(
  bookPath: string,
  outputDir: string,
  slug: string,
  metadata: BookMetadata | null,
  options: GenerateOptions,
) {
  // PDF generation would require pandoc + LaTeX
  // For now, we'll create placeholders
  if (options.verbose) {
    console.log(
      `  PDF generation requires pandoc + LaTeX (not yet implemented)`,
    );
  }

  if (!options.dryRun) {
    const paperbackPath = path.join(outputDir, "paperback.pdf");
    const hardcoverPath = path.join(outputDir, "hardcover.pdf");
    // Placeholder: would call pandoc here
    // await execAsync(`pandoc -o ${paperbackPath} --template=paperback.latex ...`);
    // await execAsync(`pandoc -o ${hardcoverPath} --template=hardcover.latex ...`);
  }
}

async function generateFormatsForAllBooks(options: GenerateOptions) {
  const booksPath = path.join(
    process.cwd(),
    "content",
    "translations",
    "books",
  );
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
  const tasks = bookSlugs.map((slug) =>
    limit(async () => {
      await generateFormatsForBook(slug, { ...options, verbose: false });
    }),
  );

  await Promise.all(tasks);

  console.log(
    chalk.green(`\n✓ Processed all ${bookSlugs.length} books successfully`),
  );
}

// Run the CLI
program.parse(process.argv);
