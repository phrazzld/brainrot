import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Security: Allowed metadata fields to prevent arbitrary command injection
const ALLOWED_METADATA_FIELDS = new Set([
  'title',
  'author',
  'date',
  'language',
  'publisher'
]);

// Security: Safe characters for metadata values (alphanumeric + basic punctuation)
const SAFE_CHAR_REGEX = /^[a-zA-Z0-9\s\-.,!?'"()]+$/;

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
 * Sanitize metadata to prevent command injection
 * @param key - The metadata field name
 * @param value - The metadata value
 * @returns Object with safe flag and sanitized value if safe
 */
function sanitizeMetadata(key: string, value: string): { safe: boolean; sanitized?: string } {
  // Check if field is allowed
  if (!ALLOWED_METADATA_FIELDS.has(key)) {
    console.error(`[SECURITY] Rejected metadata field not in allowlist: ${key}`);
    return { safe: false };
  }

  // Check for safe characters only
  if (!SAFE_CHAR_REGEX.test(value)) {
    console.error(`[SECURITY] Rejected unsafe metadata value for ${key}: contains forbidden characters`);
    return { safe: false };
  }

  // Additional check for shell metacharacters
  const dangerousChars = [';', '|', '&', '$', '`', '\\', '\n', '\r', '\0'];
  if (dangerousChars.some(char => value.includes(char))) {
    console.error(`[SECURITY] Rejected metadata value with shell metacharacters for ${key}`);
    return { safe: false };
  }

  return { safe: true, sanitized: value.trim() };
}

/**
 * Execute pandoc command safely using spawn
 * @param args - Command arguments array
 * @returns Promise that resolves when command completes
 */
function executePandoc(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const pandoc = spawn('pandoc', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false // Security: Never use shell
    });

    let stderr = '';
    
    pandoc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pandoc.on('error', (error) => {
      reject(new Error(`Pandoc execution failed: ${error.message}`));
    });

    pandoc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Pandoc failed with code ${code}: ${stderr}`));
      }
    });
  });
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

    // Build pandoc command arguments safely
    const args = [
      '--sandbox', // Security: Enable pandoc sandbox mode
      inputFile,
      '-o', outputFile,
      '--toc',
      '--toc-depth=2'
    ];

    // Safely add metadata after sanitization
    if (options.title) {
      const { safe, sanitized } = sanitizeMetadata('title', options.title);
      if (safe && sanitized) {
        args.push('--metadata', `title=${sanitized}`);
      }
    }

    if (options.author) {
      const { safe, sanitized } = sanitizeMetadata('author', options.author);
      if (safe && sanitized) {
        args.push('--metadata', `author=${sanitized}`);
      }
    }

    if (options.date) {
      const { safe, sanitized } = sanitizeMetadata('date', options.date);
      if (safe && sanitized) {
        args.push('--metadata', `date=${sanitized}`);
      }
    }

    if (options.language) {
      const { safe, sanitized } = sanitizeMetadata('language', options.language);
      if (safe && sanitized) {
        args.push('--metadata', `lang=${sanitized}`);
      }
    }

    if (options.publisher) {
      const { safe, sanitized } = sanitizeMetadata('publisher', options.publisher);
      if (safe && sanitized) {
        args.push('--metadata', `publisher=${sanitized}`);
      }
    }

    // Handle custom metadata with strict validation
    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        const { safe, sanitized } = sanitizeMetadata(key, value);
        if (safe && sanitized) {
          args.push('--metadata', `${key}=${sanitized}`);
        } else {
          console.warn(`[SECURITY] Skipping unsafe metadata field: ${key}`);
        }
      }
    }

    // Execute pandoc securely
    await executePandoc(args);

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

    // Build pandoc command arguments safely
    const args = [
      '--sandbox', // Security: Enable pandoc sandbox mode
      inputFile,
      '-o', outputFile,
      '--pdf-engine=xelatex',
      '--toc'
    ];

    // Safely add metadata after sanitization
    if (options.title) {
      const { safe, sanitized } = sanitizeMetadata('title', options.title);
      if (safe && sanitized) {
        args.push('--metadata', `title=${sanitized}`);
      }
    }

    if (options.author) {
      const { safe, sanitized } = sanitizeMetadata('author', options.author);
      if (safe && sanitized) {
        args.push('--metadata', `author=${sanitized}`);
      }
    }

    if (options.date) {
      const { safe, sanitized } = sanitizeMetadata('date', options.date);
      if (safe && sanitized) {
        args.push('--metadata', `date=${sanitized}`);
      }
    }

    // Handle custom metadata with strict validation
    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        const { safe, sanitized } = sanitizeMetadata(key, value);
        if (safe && sanitized) {
          args.push('--metadata', `${key}=${sanitized}`);
        } else {
          console.warn(`[SECURITY] Skipping unsafe metadata field: ${key}`);
        }
      }
    }

    // Execute pandoc securely
    await executePandoc(args);

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
 * @param markdown - The markdown content to convert
 * @param options - Conversion options including metadata
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
    // Use spawn for ebook-convert as well
    const args = [epubPath, outputFile];
    
    await new Promise<void>((resolve, reject) => {
      const convert = spawn('ebook-convert', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false // Security: Never use shell
      });

      let stderr = '';
      
      convert.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      convert.on('error', (error) => {
        reject(new Error(`ebook-convert execution failed: ${error.message}`));
      });

      convert.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ebook-convert failed with code ${code}: ${stderr}`));
        }
      });
    });

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