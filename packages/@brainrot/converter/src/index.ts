/**
 * @brainrot/converter - Markdown to various format converters
 *
 * This package provides utilities for converting markdown content
 * to various formats including plain text, EPUB, and PDF.
 */

// Export markdown stripping utilities
export { stripMarkdown, stripMarkdownBatch } from "./stripMarkdown";

// Export markdown to text conversion utilities
export {
  markdownToText,
  chapterToText,
  chaptersToText,
  type ChapterContent,
} from "./markdownToText";

// Export pandoc-based converters
export {
  markdownToEpub,
  markdownToPdf,
  type ConversionOptions,
} from "./pandocConverters";

// Export batch conversion utilities
export {
  convertBook,
  convertChaptersToText,
  type BookConversionOptions,
  type ConversionResult,
} from "./batchConverter";

// Export image processing utilities
export {
  createImageProcessor,
  getImageMetadata,
  type ImageProcessor,
  type ImageMetadata,
} from "./imageProcessor";

// Export cover validation utilities
export {
  validateDimensions,
  validateFormat,
  validateFileSize,
  validateCover,
  isCoverValid,
  getCoverSuggestions,
  type ValidationResult,
  type CoverValidationOptions,
  type CoverValidationSummary,
} from "./coverValidation";

// Export cover processing utilities
export {
  processCover,
  processCoverForBook,
  type CoverProcessingOptions,
  type ProcessingResult,
  type CoverProcessingReport,
} from "./coverProcessor";
