#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs/promises";
import ora from "ora";
import path from "path";

// Import translations data
import translations from "../apps/web/translations/index.js";

const program = new Command();

interface ValidationResult {
  slug: string;
  title: string;
  hasMarkdown: boolean;
  markdownFiles: string[];
  errors: string[];
}

async function checkBookMarkdown(slug: string): Promise<{
  exists: boolean;
  files: string[];
}> {
  const brainrotPath = path.join(
    process.cwd(),
    "content",
    "translations",
    "books",
    slug,
    "brainrot"
  );

  try {
    await fs.access(brainrotPath);
    const files = await fs.readdir(brainrotPath);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));
    return { exists: markdownFiles.length > 0, files: markdownFiles };
  } catch {
    return { exists: false, files: [] };
  }
}

async function validateTranslations(options: {
  verbose?: boolean;
  json?: boolean;
}) {
  const spinner = ora("Validating translations...").start();
  const results: ValidationResult[] = [];
  let hasErrors = false;

  // Filter for available books
  const availableBooks = translations.filter(
    (book) => book.status === "available"
  );

  spinner.text = `Checking ${availableBooks.length} available books...`;

  for (const book of availableBooks) {
    const slug = book.slug;
    const { exists, files } = await checkBookMarkdown(slug);

    const result: ValidationResult = {
      slug,
      title: book.title,
      hasMarkdown: exists,
      markdownFiles: files,
      errors: [],
    };

    if (!exists) {
      result.errors.push(`No markdown files found in content/translations/books/${slug}/brainrot/`);
      hasErrors = true;
    } else if (files.length === 0) {
      result.errors.push(`Brainrot directory exists but contains no .md files`);
      hasErrors = true;
    }

    // Check if number of markdown files matches expected chapters
    if (exists && book.chapters && book.chapters.length > 0) {
      const expectedCount = book.chapters.length;
      const actualCount = files.length;
      
      if (actualCount !== expectedCount) {
        result.errors.push(
          `Expected ${expectedCount} chapters but found ${actualCount} markdown files`
        );
        hasErrors = true;
      }
    }

    results.push(result);
  }

  spinner.stop();

  // Output results
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(chalk.bold("\n📚 Translation Validation Report\n"));
    console.log(chalk.gray("=" .repeat(60)));

    let successCount = 0;
    let errorCount = 0;

    for (const result of results) {
      if (result.errors.length === 0) {
        successCount++;
        if (options.verbose) {
          console.log(
            chalk.green(`✅ ${result.title} (${result.slug})`)
          );
          console.log(
            chalk.gray(`   Found ${result.markdownFiles.length} markdown files`)
          );
        }
      } else {
        errorCount++;
        console.log(chalk.red(`❌ ${result.title} (${result.slug})`));
        for (const error of result.errors) {
          console.log(chalk.yellow(`   - ${error}`));
        }
      }
    }

    console.log(chalk.gray("=" .repeat(60)));
    console.log(
      chalk.bold(
        `\nSummary: ${chalk.green(`${successCount} passed`)}, ${chalk.red(
          `${errorCount} failed`
        )}`
      )
    );

    if (errorCount > 0) {
      console.log(
        chalk.yellow(
          "\n💡 To fix missing translations, run: pnpm generate:formats book <slug>"
        )
      );
    }
  }

  // Exit with error code if validation failed
  if (hasErrors) {
    process.exit(1);
  }
}

async function validateSingleBook(slug: string, options: {
  verbose?: boolean;
}) {
  const spinner = ora(`Validating ${slug}...`).start();

  // Find the book in translations
  const book = translations.find((t) => t.slug === slug);
  
  if (!book) {
    spinner.fail(`Book ${chalk.red(slug)} not found in translations`);
    process.exit(1);
  }

  if (book.status !== "available") {
    spinner.warn(`Book ${chalk.yellow(slug)} is marked as "${book.status}"`);
  }

  const { exists, files } = await checkBookMarkdown(slug);

  spinner.stop();

  if (exists && files.length > 0) {
    console.log(chalk.green(`✅ ${book.title} (${slug})`));
    console.log(chalk.gray(`   Found ${files.length} markdown files:`));
    if (options.verbose) {
      for (const file of files) {
        console.log(chalk.gray(`   - ${file}`));
      }
    }
  } else {
    console.log(chalk.red(`❌ ${book.title} (${slug})`));
    console.log(
      chalk.yellow(
        `   No markdown files found in content/translations/books/${slug}/brainrot/`
      )
    );
    process.exit(1);
  }
}

program
  .name("validate-translations")
  .description("Validate that available books have corresponding markdown source files")
  .version("1.0.0");

program
  .command("all", { isDefault: true })
  .description("Validate all available translations")
  .option("-v, --verbose", "Show detailed output")
  .option("-j, --json", "Output results as JSON")
  .action(validateTranslations);

program
  .command("book <slug>")
  .description("Validate a specific book")
  .option("-v, --verbose", "Show detailed output")
  .action(validateSingleBook);

program.parse();