import { stripMarkdown } from './stripMarkdown';

export interface ChapterContent {
  title: string;
  content: string;
  number?: number;
}

/**
 * Convert markdown to formatted text with chapter titles
 * @param markdown - The markdown text to convert
 * @param title - Optional title to add at the beginning
 * @returns Formatted plain text suitable for web display
 */
export function markdownToText(markdown: string, title?: string): string {
  if (!markdown) {
    return '';
  }

  let text = stripMarkdown(markdown);

  // Add title if provided
  if (title) {
    text = `${title.toUpperCase()}\n\n${text}`;
  }

  // Format chapter breaks
  text = text.replace(/^(CHAPTER|Chapter)\s+(\d+|[IVXLCDM]+)/gm, '\n\n$1 $2\n');

  // Ensure proper paragraph spacing
  text = text.replace(/\n\n+/g, '\n\n');

  return text.trim();
}

/**
 * Convert markdown chapter to formatted text with proper structure
 * @param chapter - Chapter content with title and markdown
 * @returns Formatted text with chapter header
 */
export function chapterToText(chapter: ChapterContent): string {
  const chapterHeader = chapter.number !== undefined
    ? `CHAPTER ${chapter.number}: ${chapter.title.toUpperCase()}`
    : chapter.title.toUpperCase();

  const content = stripMarkdown(chapter.content);

  return `${chapterHeader}\n\n${content}`;
}

/**
 * Convert multiple chapters to a single formatted text document
 * @param chapters - Array of chapter content
 * @param bookTitle - Optional book title to add at the beginning
 * @returns Complete formatted text document
 */
export function chaptersToText(chapters: ChapterContent[], bookTitle?: string): string {
  const chaptersText = chapters
    .map(chapter => chapterToText(chapter))
    .join('\n\n---\n\n');

  if (bookTitle) {
    return `${bookTitle.toUpperCase()}\n\n===\n\n${chaptersText}`;
  }

  return chaptersText;
}