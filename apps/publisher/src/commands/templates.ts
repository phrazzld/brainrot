import { Command } from "commander";
import chalk from "chalk";
import { 
  getLegalTemplateVersions, 
  getCurrentLegalTemplateVersion,
  setLegalTemplateVersion,
  tagLegalTemplateVersion,
  rollbackLegalTemplates,
  generateLegalPages
} from "@brainrot/templates";
import { Logger } from "../utils/logger.js";

interface TemplateVersionOptions {
  version?: string;
  message?: string;
  verbose?: boolean;
}

interface TemplateTestOptions {
  version?: string;
  verbose?: boolean;
}

/**
 * List available template versions
 */
async function listTemplateVersions(options: TemplateVersionOptions): Promise<void> {
  try {
    const versions = getLegalTemplateVersions();
    const current = getCurrentLegalTemplateVersion();
    
    console.log(chalk.blue("\n📋 Legal Template Versions\n"));
    
    if (versions.length === 0) {
      console.log(chalk.yellow("⚠️  No versioned templates found."));
      console.log(chalk.dim("   Create a version with: pnpm templates:tag <version>"));
      return;
    }
    
    console.log(chalk.green("Available versions:"));
    for (const version of versions) {
      const isCurrent = current === version;
      const marker = isCurrent ? chalk.green("→ ") : "  ";
      const status = isCurrent ? chalk.green("(current)") : "";
      console.log(`${marker}${chalk.cyan(version)} ${status}`);
    }
    
    console.log(chalk.green(`\nCurrent version: ${chalk.cyan(current)}`));
    
    if (current === 'latest') {
      console.log(chalk.dim("Using latest templates from working directory"));
    } else {
      console.log(chalk.dim(`Using versioned templates from ${current}`));
    }
    
  } catch (error) {
    Logger.error("Failed to list template versions:", error);
    process.exit(1);
  }
}

/**
 * Set the template version to use
 */
async function setTemplateVersion(version: string, options: TemplateVersionOptions): Promise<void> {
  try {
    Logger.info(`Setting legal template version to: ${version}`);
    
    setLegalTemplateVersion(version);
    
    const current = getCurrentLegalTemplateVersion();
    console.log(chalk.green(`✅ Template version set to: ${chalk.cyan(current)}`));
    
    if (current === 'latest') {
      console.log(chalk.dim("   Using latest templates from working directory"));
    } else {
      console.log(chalk.dim(`   Using versioned templates from ${current}`));
    }
    
  } catch (error) {
    Logger.error(`Failed to set template version to ${version}:`, error);
    process.exit(1);
  }
}

/**
 * Create a new template version tag
 */
async function tagTemplateVersion(version: string, options: TemplateVersionOptions): Promise<void> {
  try {
    Logger.info(`Creating legal template version tag: v${version}`);
    
    const message = options.message || `Legal templates version ${version}`;
    const tagName = tagLegalTemplateVersion(version, message);
    
    console.log(chalk.green(`✅ Created template version tag: ${chalk.cyan(tagName)}`));
    console.log(chalk.dim(`   Message: ${message}`));
    
    // Show updated version list
    console.log(chalk.blue("\n📋 Updated Version List:"));
    const versions = getLegalTemplateVersions();
    versions.slice(0, 3).forEach((v: string) => {
      console.log(`   ${chalk.cyan(v)}`);
    });
    if (versions.length > 3) {
      console.log(chalk.dim(`   ... and ${versions.length - 3} more`));
    }
    
  } catch (error) {
    Logger.error(`Failed to create template version ${version}:`, error);
    process.exit(1);
  }
}

/**
 * Rollback to a previous template version
 */
async function rollbackTemplateVersion(version: string, options: TemplateVersionOptions): Promise<void> {
  try {
    Logger.info(`Rolling back legal templates to version: ${version}`);
    
    const rolledBackTo = rollbackLegalTemplates(version);
    
    console.log(chalk.green(`✅ Rolled back templates to: ${chalk.cyan(rolledBackTo)}`));
    console.log(chalk.yellow("⚠️  Remember to test your publishing pipeline after rollback"));
    console.log(chalk.dim("   Test with: pnpm templates:test"));
    
  } catch (error) {
    Logger.error(`Failed to rollback to template version ${version}:`, error);
    process.exit(1);
  }
}

/**
 * Test template generation with current version
 */
async function testTemplateGeneration(options: TemplateTestOptions): Promise<void> {
  try {
    const version = options.version || getCurrentLegalTemplateVersion();
    
    Logger.info(`Testing legal template generation with version: ${version}`);
    
    // Sample metadata for testing
    const testMetadata = {
      title: "Test Book Title",
      author: "Test Author",
      originalTitle: "Original Test Title",
      originalAuthor: "Original Test Author",
      originalYear: "2023",
      isbn: "978-0-123456-78-9",
      format: "Digital Edition"
    };
    
    const legalPages = generateLegalPages(testMetadata, version === 'latest' ? null : version);
    
    console.log(chalk.green("✅ Template generation successful"));
    console.log(chalk.blue(`📄 Generated ${legalPages.length} characters of legal content`));
    
    if (version !== 'latest') {
      if (legalPages.includes(`<!-- Generated using legal templates ${version} -->`)) {
        console.log(chalk.green(`✅ Version tracking working: ${version}`));
      }
    }
    
    // Show first few lines as preview
    const lines = legalPages.split('\n').slice(0, 5);
    console.log(chalk.dim("\nPreview:"));
    lines.forEach((line: string) => {
      console.log(chalk.dim(`   ${line}`));
    });
    
    if (options.verbose) {
      console.log(chalk.blue("\n📋 Full Legal Content:"));
      console.log(legalPages);
    }
    
  } catch (error) {
    Logger.error("Template generation test failed:", error);
    process.exit(1);
  }
}

/**
 * Show template version status
 */
async function showTemplateStatus(options: TemplateVersionOptions): Promise<void> {
  try {
    const current = getCurrentLegalTemplateVersion();
    const versions = getLegalTemplateVersions();
    
    console.log(chalk.blue("📋 Legal Template Status\n"));
    
    console.log(`Current version: ${chalk.cyan(current)}`);
    
    if (current === 'latest') {
      console.log(chalk.green("✅ Using latest templates from working directory"));
      console.log(chalk.dim("   Templates will use any local changes"));
    } else {
      console.log(chalk.yellow(`⚠️  Using versioned templates from ${current}`));
      console.log(chalk.dim("   Templates are locked to this version"));
    }
    
    console.log(`\nAvailable versions: ${versions.length}`);
    if (versions.length > 0) {
      const recent = versions.slice(0, 3);
      recent.forEach((version: string) => {
        const isCurrent = current === version;
        const marker = isCurrent ? chalk.green("→ ") : "  ";
        console.log(`${marker}${chalk.cyan(version)}`);
      });
    }
    
    console.log(chalk.dim("\n💡 Quick commands:"));
    console.log(chalk.dim("   pnpm templates:list     - List all versions"));
    console.log(chalk.dim("   pnpm templates:set      - Set specific version"));
    console.log(chalk.dim("   pnpm templates:rollback - Quick rollback"));
    console.log(chalk.dim("   pnpm templates:test     - Test current version"));
    
  } catch (error) {
    Logger.error("Failed to show template status:", error);
    process.exit(1);
  }
}

// Create the templates command
export function createTemplatesCommand(): Command {
  return new Command("templates")
    .description("Manage legal template versions for KDP compliance")
  .addCommand(
    new Command("list")
      .description("List all available template versions")
      .option("-v, --verbose", "Show detailed information")
      .action(listTemplateVersions)
  )
  .addCommand(
    new Command("status") 
      .description("Show current template version status")
      .option("-v, --verbose", "Show detailed information")
      .action(showTemplateStatus)
  )
  .addCommand(
    new Command("set")
      .description("Set the template version to use")
      .argument("<version>", "Version to use (e.g., 'legal-templates-v1.0.0' or 'latest')")
      .option("-v, --verbose", "Show detailed information")
      .action(setTemplateVersion)
  )
  .addCommand(
    new Command("tag")
      .description("Create a new template version tag")
      .argument("<version>", "Version number (e.g., '1.1.0')")
      .option("-m, --message <message>", "Tag message")
      .option("-v, --verbose", "Show detailed information")
      .action(tagTemplateVersion)
  )
  .addCommand(
    new Command("rollback")
      .description("Rollback to a previous template version")
      .argument("<version>", "Version to rollback to (e.g., 'legal-templates-v1.0.0')")
      .option("-v, --verbose", "Show detailed information")
      .action(rollbackTemplateVersion)
  )
  .addCommand(
    new Command("test")
      .description("Test template generation with current version")
      .option("--version <version>", "Test specific version")
      .option("-v, --verbose", "Show full generated content")
      .action(testTemplateGeneration)
  );
}