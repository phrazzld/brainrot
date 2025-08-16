import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { stripMarkdown } from './stripMarkdown';
import { chapterToText, ChapterContent } from './markdownToText';
import { markdownToEpub, markdownToPdf, markdownToKindle, ConversionOptions } from './pandocConverters';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);

export interface BookConversionOptions extends ConversionOptions {
  inputDir: string;
  outputDir: string;
  formats?: ('text' | 'epub' | 'pdf' | 'kindle')[];
  chapterPattern?: RegExp;
}

export interface ConversionResult {
  format: string;
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Convert an entire book from markdown files to multiple formats
 * @param options - Book conversion options
 * @returns Array of conversion results
 */
export async function convertBook(options: BookConversionOptions): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  const formats = options.formats || ['text'];

  try {
    // Ensure output directory exists
    await mkdir(options.outputDir, { recursive: true });

    // Read all markdown files from input directory
    const files = await readdir(options.inputDir);
    const markdownFiles = files
      .filter(file => file.endsWith('.md'))
      .sort(); // Ensure chapters are in order

    // Read and combine all markdown content
    const chapters: ChapterContent[] = [];
    let combinedMarkdown = '';

    for (const file of markdownFiles) {
      const filePath = path.join(options.inputDir, file);
      const content = await readFile(filePath, 'utf8');
      
      // Extract chapter title from filename or content
      const chapterTitle = extractChapterTitle(file, content);
      const chapterNumber = extractChapterNumber(file);

      chapters.push({
        title: chapterTitle,
        content: content,
        number: chapterNumber
      });

      combinedMarkdown += `\n\n# ${chapterTitle}\n\n${content}`;
    }

    // Convert to each requested format
    for (const format of formats) {
      try {
        let outputPath: string;

        switch (format) {
          case 'text':
            outputPath = path.join(options.outputDir, 'book.txt');
            const textContent = chapters.map(ch => chapterToText(ch)).join('\n\n---\n\n');
            await writeFile(outputPath, textContent, 'utf8');
            break;

          case 'epub':
            outputPath = await markdownToEpub(combinedMarkdown, {
              ...options,
              outputPath: path.join(options.outputDir, 'book.epub')
            });
            break;

          case 'pdf':
            outputPath = await markdownToPdf(combinedMarkdown, {
              ...options,
              outputPath: path.join(options.outputDir, 'book.pdf')
            });
            break;

          case 'kindle':
            outputPath = await markdownToKindle(combinedMarkdown, {
              ...options,
              outputPath: path.join(options.outputDir, 'book.mobi')
            });
            break;

          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        results.push({
          format,
          path: outputPath,
          success: true
        });
      } catch (error) {
        results.push({
          format,
          path: '',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Book conversion failed: ${error}`);
  }
}

/**
 * Convert individual chapter files to text format
 * @param inputDir - Directory containing markdown chapter files
 * @param outputDir - Directory to save text files
 * @returns Array of output file paths
 */
export async function convertChaptersToText(
  inputDir: string,
  outputDir: string
): Promise<string[]> {
  const outputPaths: string[] = [];

  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Read all markdown files
    const files = await readdir(inputDir);
    const markdownFiles = files
      .filter(file => file.endsWith('.md'))
      .sort();

    for (const file of markdownFiles) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file.replace('.md', '.txt'));
      
      const content = await readFile(inputPath, 'utf8');
      const textContent = stripMarkdown(content);
      
      await writeFile(outputPath, textContent, 'utf8');
      outputPaths.push(outputPath);
    }

    return outputPaths;
  } catch (error) {
    throw new Error(`Chapter conversion failed: ${error}`);
  }
}

/**
 * Extract chapter title from filename or content
 */
function extractChapterTitle(filename: string, content: string): string {
  // Try to extract from content first (e.g., # Chapter 1: Title)
  const match = content.match(/^#\s+(.+)/m);
  if (match) {
    return match[1];
  }

  // Fall back to filename
  return filename
    .replace('.md', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Extract chapter number from filename
 */
function extractChapterNumber(filename: string): number | undefined {
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}