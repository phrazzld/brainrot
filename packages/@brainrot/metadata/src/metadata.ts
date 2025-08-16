/**
 * Book metadata parsing and management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import { promisify } from 'util';
import { BookMetadata, bookMetadataSchema, defaultMetadata } from './schemas';
import { validateISBN, formatISBN, generatePlaceholderISBN } from './isbn';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Initialize AJV for JSON schema validation
const ajv = new Ajv({ allErrors: true, strict: false });
const validateMetadata = ajv.compile(bookMetadataSchema);

export interface ValidationError {
  field: string;
  message: string;
}

export interface ParseResult {
  metadata?: BookMetadata;
  errors?: ValidationError[];
  warnings?: string[];
}

/**
 * Parse book metadata from a YAML file
 * @param filePath Path to the metadata.yaml file
 * @param applyDefaults Whether to apply default values for missing fields
 * @returns Parsed metadata or errors
 */
export async function parseBookMetadata(
  filePath: string,
  applyDefaults: boolean = true
): Promise<ParseResult> {
  const result: ParseResult = {
    warnings: [],
  };

  try {
    // Read the YAML file
    const content = await readFile(filePath, 'utf8');
    
    // Parse YAML
    let rawMetadata: any;
    try {
      rawMetadata = yaml.load(content);
    } catch (yamlError) {
      result.errors = [{
        field: 'yaml',
        message: `Invalid YAML syntax: ${yamlError}`,
      }];
      return result;
    }

    // Apply defaults if requested
    if (applyDefaults) {
      rawMetadata = { ...defaultMetadata, ...rawMetadata };
      
      // Deep merge for nested objects
      if (defaultMetadata.publishing && rawMetadata.publishing) {
        rawMetadata.publishing = { 
          ...defaultMetadata.publishing, 
          ...rawMetadata.publishing 
        };
      }
      if (defaultMetadata.pricing && rawMetadata.pricing) {
        rawMetadata.pricing = { 
          ...defaultMetadata.pricing, 
          ...rawMetadata.pricing 
        };
      }
    }

    // Validate against schema
    const isValid = validateMetadata(rawMetadata);
    
    if (!isValid) {
      result.errors = validateMetadata.errors?.map(err => ({
        field: err.instancePath.replace(/^\//, '') || err.params.missingProperty || 'root',
        message: err.message || 'Validation error',
      }));
      return result;
    }

    const metadata = rawMetadata as BookMetadata;

    // Additional ISBN validation
    if (metadata.isbns) {
      for (const isbnEntry of metadata.isbns) {
        if (!validateISBN(isbnEntry.isbn13)) {
          if (!result.errors) result.errors = [];
          result.errors.push({
            field: `isbns.${isbnEntry.format}`,
            message: `Invalid ISBN-13: ${isbnEntry.isbn13}`,
          });
        }
      }
    }

    // Add warnings for missing recommended fields
    if (!metadata.description) {
      result.warnings?.push('Missing description field - recommended for publishing');
    }
    if (!metadata.keywords || metadata.keywords.length === 0) {
      result.warnings?.push('No keywords specified - recommended for SEO');
    }
    if (!metadata.isbns || metadata.isbns.length === 0) {
      result.warnings?.push('No ISBNs specified - required for most publishing platforms');
    }

    result.metadata = metadata;
    return result;
  } catch (error) {
    result.errors = [{
      field: 'file',
      message: `Failed to read file: ${error}`,
    }];
    return result;
  }
}

/**
 * Generate new book metadata with defaults
 * @param slug Book slug/identifier
 * @param title Book title
 * @param author Book author
 * @param options Additional metadata options
 * @returns Generated metadata
 */
export function generateMetadata(
  slug: string,
  title: string,
  author: string,
  options: Partial<BookMetadata> = {}
): BookMetadata {
  const metadata: BookMetadata = {
    ...defaultMetadata,
    slug,
    title,
    author,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...options,
  };

  // Generate placeholder ISBNs if not provided
  if (!metadata.isbns) {
    const bookNumber = Math.floor(Math.random() * 999999);
    metadata.isbns = [
      {
        isbn13: formatISBN(generatePlaceholderISBN(bookNumber)),
        format: 'ebook',
      },
      {
        isbn13: formatISBN(generatePlaceholderISBN(bookNumber + 1)),
        format: 'paperback',
      },
      {
        isbn13: formatISBN(generatePlaceholderISBN(bookNumber + 2)),
        format: 'hardcover',
      },
    ];
  }

  return metadata;
}

/**
 * Save metadata to a YAML file
 * @param metadata The metadata to save
 * @param filePath Path to save the file
 * @returns Promise that resolves when saved
 */
export async function saveMetadata(
  metadata: BookMetadata,
  filePath: string
): Promise<void> {
  // Update timestamp
  metadata.updatedAt = new Date().toISOString();
  
  // Convert to YAML
  const yamlContent = yaml.dump(metadata, {
    indent: 2,
    lineWidth: 120,
    sortKeys: false,
  });
  
  // Add header comment
  const content = `# Book Metadata for Brainrot Publishing House
# Generated: ${new Date().toISOString()}
# Schema Version: 1.0.0

${yamlContent}`;
  
  await writeFile(filePath, content, 'utf8');
}

/**
 * Get a list of all books by scanning for metadata files
 * @param rootDir Root directory to scan (usually content/translations/books)
 * @returns Array of book metadata
 */
export async function getBookList(rootDir: string): Promise<BookMetadata[]> {
  const books: BookMetadata[] = [];
  
  try {
    const entries = await readdir(rootDir);
    
    for (const entry of entries) {
      const entryPath = path.join(rootDir, entry);
      const entryStat = await stat(entryPath);
      
      if (entryStat.isDirectory()) {
        // Look for metadata.yaml in the directory
        const metadataPath = path.join(entryPath, 'metadata.yaml');
        
        try {
          const metadataStat = await stat(metadataPath);
          if (metadataStat.isFile()) {
            const result = await parseBookMetadata(metadataPath);
            if (result.metadata) {
              books.push(result.metadata);
            }
          }
        } catch {
          // No metadata.yaml file, skip
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning for books in ${rootDir}:`, error);
  }
  
  // Sort by title
  books.sort((a, b) => a.title.localeCompare(b.title));
  
  return books;
}

/**
 * Validate metadata against the schema
 * @param metadata The metadata to validate
 * @returns Validation result with errors if any
 */
export function validateBookMetadata(metadata: any): ParseResult {
  const result: ParseResult = {};
  
  const isValid = validateMetadata(metadata);
  
  if (!isValid) {
    result.errors = validateMetadata.errors?.map(err => ({
      field: err.instancePath.replace(/^\//, '') || err.params.missingProperty || 'root',
      message: err.message || 'Validation error',
    }));
  } else {
    result.metadata = metadata as BookMetadata;
  }
  
  return result;
}

/**
 * Apply metadata inheritance from a base template
 * @param metadata The metadata to enhance
 * @param template The template to inherit from
 * @returns Merged metadata
 */
export function applyInheritance(
  metadata: Partial<BookMetadata>,
  template: Partial<BookMetadata> = defaultMetadata
): BookMetadata {
  // Deep merge with template
  const merged: any = { ...template };
  
  for (const key in metadata) {
    const value = (metadata as any)[key];
    
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Deep merge objects
        merged[key] = { ...(merged[key] || {}), ...value };
      } else {
        // Direct assignment for primitives and arrays
        merged[key] = value;
      }
    }
  }
  
  return merged as BookMetadata;
}

/**
 * Update specific fields in existing metadata
 * @param filePath Path to the metadata file
 * @param updates Fields to update
 * @returns Updated metadata
 */
export async function updateMetadata(
  filePath: string,
  updates: Partial<BookMetadata>
): Promise<BookMetadata> {
  // Parse existing metadata
  const result = await parseBookMetadata(filePath, false);
  
  if (result.errors) {
    throw new Error(`Failed to parse existing metadata: ${JSON.stringify(result.errors)}`);
  }
  
  if (!result.metadata) {
    throw new Error('No metadata found');
  }
  
  // Apply updates
  const updated = { ...result.metadata, ...updates };
  
  // Save back to file
  await saveMetadata(updated, filePath);
  
  return updated;
}

/**
 * Create metadata for a new book
 * @param bookDir Directory where the book will be stored
 * @param metadata Initial metadata
 * @returns Created metadata
 */
export async function createBookMetadata(
  bookDir: string,
  metadata: Partial<BookMetadata>
): Promise<BookMetadata> {
  // Ensure required fields
  if (!metadata.slug || !metadata.title || !metadata.author) {
    throw new Error('Missing required fields: slug, title, and author');
  }
  
  // Generate full metadata with defaults
  const fullMetadata = generateMetadata(
    metadata.slug,
    metadata.title,
    metadata.author,
    metadata
  );
  
  // Create directory if it doesn't exist
  const fs = await import('fs');
  await fs.promises.mkdir(bookDir, { recursive: true });
  
  // Save metadata file
  const metadataPath = path.join(bookDir, 'metadata.yaml');
  await saveMetadata(fullMetadata, metadataPath);
  
  return fullMetadata;
}