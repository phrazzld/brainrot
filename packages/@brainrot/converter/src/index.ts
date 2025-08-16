/**
 * @brainrot/converter - Markdown to various format converters
 * 
 * This package provides utilities for converting markdown content
 * to various formats including plain text, EPUB, PDF, and Kindle.
 */

// Export markdown stripping utilities
export { 
  stripMarkdown, 
  stripMarkdownBatch 
} from './stripMarkdown';

// Export markdown to text conversion utilities
export { 
  markdownToText, 
  chapterToText, 
  chaptersToText,
  type ChapterContent 
} from './markdownToText';

// Export pandoc-based converters
export { 
  markdownToEpub, 
  markdownToPdf, 
  markdownToKindle,
  type ConversionOptions 
} from './pandocConverters';

// Export batch conversion utilities
export { 
  convertBook, 
  convertChaptersToText,
  type BookConversionOptions,
  type ConversionResult 
} from './batchConverter';

