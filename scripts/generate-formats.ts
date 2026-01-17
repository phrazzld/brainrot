#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import ora from "ora";
import chalk from "chalk";
import pLimit from "p-limit";
import * as yaml from "js-yaml";
import {
  stripMarkdown,
  markdownToText,
  markdownToPdfWithTemplate,
  markdownToEpub,
} from "../packages/@brainrot/converter/dist/index.js";

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

  // Convert each file to text
  for (const { inputPath, outputName } of filesToConvert) {
    const outputPath = path.join(outputDir, "text", outputName);

    if (!options.dryRun) {
      // Create text subdirectory
      await fs.mkdir(path.join(outputDir, "text"), { recursive: true });

      // Read and convert content
      const content = await fs.readFile(inputPath, "utf-8");
      const textContent = stripMarkdown(content);

      // Check if file exists and handle accordingly
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      if (fileExists && !options.force) {
        if (options.verbose) {
          console.log(`    Skipping ${outputName} (already exists)`);
        }
        continue;
      }

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
}

async function generateEpubFormat(
  bookPath: string,
  outputDir: string,
  slug: string,
  metadata: BookMetadata | null,
  options: GenerateOptions,
) {
  const markdown = await readBookMarkdown(bookPath);

  if (!markdown) {
    if (options.verbose) {
      console.log(`  Skipping ${slug} - no markdown content found`);
    }
    return;
  }

  // Create epub subdirectory
  const epubDir = path.join(outputDir, "epub");
  if (!options.dryRun) {
    await fs.mkdir(epubDir, { recursive: true });
  }

  const epubPath = path.join(epubDir, `${slug}.epub`);

  if (options.dryRun) {
    if (options.verbose) {
      console.log(`    Would create ${slug}.epub`);
    }
    return;
  }

  // Check if file exists
  const fileExists = await fs
    .access(epubPath)
    .then(() => true)
    .catch(() => false);

  if (!fileExists || options.force) {
    try {
      await markdownToEpub(markdown, {
        title: metadata?.title || slug.replace(/-/g, " "),
        author: `${metadata?.author || "Unknown"} (translated by ${metadata?.translator || "Brainrot Publishing House"})`,
        date: new Date().toISOString().split("T")[0],
        publisher: "Brainrot Publishing House",
        outputPath: epubPath,
      });
      if (options.verbose) {
        console.log(`    Created ${slug}.epub`);
      }
    } catch (error) {
      console.error(`    Failed to create EPUB: ${error}`);
    }
  } else if (options.verbose) {
    console.log(`    Skipping ${slug}.epub (already exists)`);
  }
}

/**
 * Read and combine all chapter markdown files from a book directory
 */
async function readBookMarkdown(bookPath: string): Promise<string | null> {
  // Check for brainrot directory structure
  const brainrotPath = path.join(bookPath, "brainrot");
  const brainrotExists = await fs
    .access(brainrotPath)
    .then(() => true)
    .catch(() => false);

  if (!brainrotExists) {
    return null;
  }

  // Check for text subdirectory (for books like The Iliad)
  const textSubdir = path.join(brainrotPath, "text");
  const textSubdirExists = await fs
    .access(textSubdir)
    .then(() => true)
    .catch(() => false);

  const sourceDir = textSubdirExists ? textSubdir : brainrotPath;
  const files = await fs.readdir(sourceDir);
  const markdownFiles = files
    .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
    .sort(); // Sort to maintain chapter order

  if (markdownFiles.length === 0) {
    return null;
  }

  // Read and combine all files
  const chapters: string[] = [];
  for (const file of markdownFiles) {
    const content = await fs.readFile(path.join(sourceDir, file), "utf-8");
    chapters.push(content);
  }

  return chapters.join("\n\n---\n\n"); // Join with page breaks
}

async function generatePdfFormat(
  bookPath: string,
  outputDir: string,
  slug: string,
  metadata: BookMetadata | null,
  options: GenerateOptions,
) {
  const markdown = await readBookMarkdown(bookPath);

  if (!markdown) {
    if (options.verbose) {
      console.log(`  Skipping ${slug} - no markdown content found`);
    }
    return;
  }

  // Get template paths
  const templatesDir = path.join(
    process.cwd(),
    "packages",
    "@brainrot",
    "templates",
    "pdf",
  );
  const paperbackTemplate = path.join(templatesDir, "paperback.latex");
  const hardcoverTemplate = path.join(templatesDir, "hardcover.latex");

  // Check if templates exist
  const paperbackExists = await fs
    .access(paperbackTemplate)
    .then(() => true)
    .catch(() => false);

  if (!paperbackExists) {
    if (options.verbose) {
      console.log(`  Warning: LaTeX templates not found at ${templatesDir}`);
    }
    return;
  }

  // Create pdf subdirectory
  const pdfDir = path.join(outputDir, "pdf");
  if (!options.dryRun) {
    await fs.mkdir(pdfDir, { recursive: true });
  }

  const paperbackPath = path.join(pdfDir, `${slug}-paperback.pdf`);
  const hardcoverPath = path.join(pdfDir, `${slug}-hardcover.pdf`);

  // Build conversion options from metadata
  const conversionOptions = {
    title: metadata?.title || slug.replace(/-/g, " "),
    author: "Brainrot Publishing House",
    translator: metadata?.translator || "Brainrot Publishing House",
    originalAuthor: metadata?.author || "Unknown",
    date: new Date().toISOString().split("T")[0],
    year: new Date().getFullYear().toString(),
    isbn: metadata?.formats?.paperback?.isbn || "",
    subject: `${metadata?.title || slug} - Gen Z Translation`,
    keywords: "brainrot, gen z, classic literature, translation",
  };

  if (options.dryRun) {
    if (options.verbose) {
      console.log(`    Would create ${slug}-paperback.pdf`);
      console.log(`    Would create ${slug}-hardcover.pdf`);
    }
    return;
  }

  // Check if files exist and handle accordingly
  const paperbackFileExists = await fs
    .access(paperbackPath)
    .then(() => true)
    .catch(() => false);

  if (!paperbackFileExists || options.force) {
    try {
      await markdownToPdfWithTemplate(markdown, {
        ...conversionOptions,
        templatePath: paperbackTemplate,
        outputPath: paperbackPath,
        isbn: metadata?.formats?.paperback?.isbn || "",
      });
      if (options.verbose) {
        console.log(`    Created ${slug}-paperback.pdf`);
      }
    } catch (error) {
      console.error(`    Failed to create paperback PDF: ${error}`);
    }
  } else if (options.verbose) {
    console.log(`    Skipping ${slug}-paperback.pdf (already exists)`);
  }

  // Check for hardcover template
  const hardcoverExists = await fs
    .access(hardcoverTemplate)
    .then(() => true)
    .catch(() => false);

  if (hardcoverExists) {
    const hardcoverFileExists = await fs
      .access(hardcoverPath)
      .then(() => true)
      .catch(() => false);

    if (!hardcoverFileExists || options.force) {
      try {
        await markdownToPdfWithTemplate(markdown, {
          ...conversionOptions,
          templatePath: hardcoverTemplate,
          outputPath: hardcoverPath,
          isbn: metadata?.formats?.hardcover?.isbn || "",
        });
        if (options.verbose) {
          console.log(`    Created ${slug}-hardcover.pdf`);
        }
      } catch (error) {
        console.error(`    Failed to create hardcover PDF: ${error}`);
      }
    } else if (options.verbose) {
      console.log(`    Skipping ${slug}-hardcover.pdf (already exists)`);
    }
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
