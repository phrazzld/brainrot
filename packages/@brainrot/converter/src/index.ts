/**
 * @brainrot/converter - Markdown to various format converters
 *
 * This package provides utilities for converting markdown content
 * to various formats including plain text, EPUB, PDF, and Kindle.
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
  markdownToPdfWithTemplate,
  markdownToKindle,
  type ConversionOptions,
  type PdfTemplateOptions,
} from "./pandocConverters";

// Export batch conversion utilities
export {
  convertBook,
  convertChaptersToText,
  type BookConversionOptions,
  type ConversionResult,
} from "./batchConverter";

// Export cover generation utilities
export {
  generateCoverPdf,
  generateCoverSvg,
  generateFrontCoverPng,
  calculateSpineWidth,
  type CoverOptions,
  type CoverMetadata,
  type ColorScheme,
} from "./coverGenerator";
