import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export interface ConversionOptions {
  title?: string;
  author?: string;
  date?: string;
  language?: string;
  publisher?: string;
  metadata?: Record<string, string>;
  outputPath?: string;
  tempDir?: string;
}

/**
 * Convert markdown to EPUB using pandoc
 * @param markdown - The markdown content to convert
 * @param options - Conversion options including metadata
 * @returns Path to the generated EPUB file
 */
export async function markdownToEpub(
  markdown: string,
  options: ConversionOptions = {}
): Promise<string> {
  const tempDir = options.tempDir || '/tmp';
  const inputFile = path.join(tempDir, `input-${Date.now()}.md`);
  const outputFile = options.outputPath || path.join(tempDir, `output-${Date.now()}.epub`);

  try {
    // Write markdown to temporary file
    await writeFile(inputFile, markdown, 'utf8');

    // Build pandoc command with metadata
    const metadataArgs = [];
    if (options.title) metadataArgs.push(`--metadata title="${options.title}"`);
    if (options.author) metadataArgs.push(`--metadata author="${options.author}"`);
    if (options.date) metadataArgs.push(`--metadata date="${options.date}"`);
    if (options.language) metadataArgs.push(`--metadata lang="${options.language}"`);
    if (options.publisher) metadataArgs.push(`--metadata publisher="${options.publisher}"`);

    // Add custom metadata
    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        metadataArgs.push(`--metadata ${key}="${value}"`);
      });
    }

    const command = `pandoc "${inputFile}" -o "${outputFile}" ${metadataArgs.join(' ')} --toc --toc-depth=2`;

    // Execute pandoc
    await execAsync(command);

    // Clean up input file
    await unlink(inputFile);

    return outputFile;
  } catch (error) {
    // Clean up on error
    try {
      await unlink(inputFile);
    } catch {}
    throw new Error(`EPUB conversion failed: ${error}`);
  }
}

/**
 * Convert markdown to PDF using pandoc with xelatex
 * @param markdown - The markdown content to convert
 * @param options - Conversion options including metadata
 * @returns Path to the generated PDF file
 */
export async function markdownToPdf(
  markdown: string,
  options: ConversionOptions = {}
): Promise<string> {
  const tempDir = options.tempDir || '/tmp';
  const inputFile = path.join(tempDir, `input-${Date.now()}.md`);
  const outputFile = options.outputPath || path.join(tempDir, `output-${Date.now()}.pdf`);

  try {
    // Write markdown to temporary file
    await writeFile(inputFile, markdown, 'utf8');

    // Build pandoc command with metadata
    const metadataArgs = [];
    if (options.title) metadataArgs.push(`--metadata title="${options.title}"`);
    if (options.author) metadataArgs.push(`--metadata author="${options.author}"`);
    if (options.date) metadataArgs.push(`--metadata date="${options.date}"`);

    // Add custom metadata
    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        metadataArgs.push(`--metadata ${key}="${value}"`);
      });
    }

    // Use xelatex for better font support
    const command = `pandoc "${inputFile}" -o "${outputFile}" ${metadataArgs.join(' ')} --pdf-engine=xelatex --toc`;

    // Execute pandoc
    await execAsync(command);

    // Clean up input file
    await unlink(inputFile);

    return outputFile;
  } catch (error) {
    // Clean up on error
    try {
      await unlink(inputFile);
    } catch {}
    throw new Error(`PDF conversion failed: ${error}`);
  }
}

/**
 * Convert EPUB to Kindle format (KPF/MOBI)
 * Note: This requires KindleGen or Calibre's ebook-convert to be installed
 * @param epubPath - Path to the EPUB file
 * @param outputPath - Optional output path for the Kindle file
 * @returns Path to the generated Kindle file
 */
export async function markdownToKindle(
  markdown: string,
  options: ConversionOptions = {}
): Promise<string> {
  // First convert to EPUB
  const epubPath = await markdownToEpub(markdown, {
    ...options,
    outputPath: undefined // Let it use temp path
  });

  const outputFile = options.outputPath || epubPath.replace('.epub', '.mobi');

  try {
    // Try to use ebook-convert (from Calibre)
    const command = `ebook-convert "${epubPath}" "${outputFile}"`;
    await execAsync(command);

    // Clean up EPUB file if it was temporary
    if (!options.outputPath) {
      await unlink(epubPath);
    }

    return outputFile;
  } catch (error) {
    // Clean up on error
    try {
      await unlink(epubPath);
    } catch {}
    throw new Error(`Kindle conversion failed. Make sure Calibre is installed: ${error}`);
  }
}