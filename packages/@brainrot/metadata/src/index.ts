/**
 * @brainrot/metadata - Book metadata parsing and validation
 * 
 * This package provides utilities for managing book metadata including
 * ISBN validation, YAML parsing, and metadata generation.
 */

// Export ISBN utilities
export {
  validateISBN,
  validateISBN10,
  validateISBN13,
  convertISBN10to13,
  formatISBN,
  generatePlaceholderISBN,
  extractISBN,
} from './isbn';

// Export schemas and types
export type {
  BookMetadata,
  BookISBN,
  BookPricing,
  PublishingConfig,
} from './schemas';

export {
  bookMetadataSchema,
  defaultMetadata,
} from './schemas';

// Export metadata management functions
export {
  parseBookMetadata,
  generateMetadata,
  saveMetadata,
  getBookList,
  validateBookMetadata,
  applyInheritance,
  updateMetadata,
  createBookMetadata,
} from './metadata';

export type {
  ValidationError,
  ParseResult,
} from './metadata';

// Re-export commonly used functions for convenience
import { 
  parseBookMetadata as parse,
  generateMetadata as generate,
} from './metadata';
import { validateISBN as validateIsbn } from './isbn';

export const parseMetadata = parse;
export const createMetadata = generate;
export const isValidISBN = validateIsbn;