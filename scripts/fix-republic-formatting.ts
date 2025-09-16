#!/usr/bin/env node
import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";

async function cleanRepublicMarkdown() {
  const brainrotPath = path.join(
    process.cwd(),
    "content/translations/books/the-republic/brainrot"
  );

  console.log(chalk.cyan("Cleaning Republic markdown files..."));

  // Get all markdown files
  const files = await fs.readdir(brainrotPath);
  const markdownFiles = files.filter((f) => f.endsWith(".md"));

  console.log(chalk.gray(`Found ${markdownFiles.length} files to process`));

  for (const file of markdownFiles) {
    const filePath = path.join(brainrotPath, file);
    console.log(chalk.gray(`  Processing ${file}...`));

    // Read the file
    let content = await fs.readFile(filePath, "utf-8");

    // Remove all lines that start with # (headers)
    const lines = content.split("\n");
    const cleanedLines = lines.filter(line => !line.trim().startsWith("#"));

    // Join remaining lines and convert to lowercase
    content = cleanedLines.join("\n").toLowerCase();

    // Clean up excessive newlines (more than 2)
    content = content.replace(/\n{3,}/g, "\n\n");

    // Trim the content
    content = content.trim();

    // Write back the cleaned content
    await fs.writeFile(filePath, content, "utf-8");
  }

  console.log(chalk.green(`✓ Cleaned ${markdownFiles.length} files successfully`));
}

// Run the cleanup
cleanRepublicMarkdown().catch((error) => {
  console.error(chalk.red("Error:"), error);
  process.exit(1);
});