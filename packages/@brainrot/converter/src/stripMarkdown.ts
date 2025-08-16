import removeMd from 'remove-markdown';

/**
 * Strip markdown formatting from text while preserving line breaks
 * @param markdown - The markdown text to convert
 * @returns Plain text with markdown formatting removed
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) {
    return '';
  }

  // Use remove-markdown library to strip formatting
  let text = removeMd(markdown);

  // Preserve paragraph breaks (double newlines)
  text = text.replace(/\n\n+/g, '\n\n');

  // Remove excessive whitespace while preserving intended formatting
  text = text.replace(/[ \t]+/g, ' ');

  // Trim each line
  text = text
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  // Remove empty lines at start and end
  text = text.trim();

  return text;
}

/**
 * Strip markdown from an array of content strings
 * @param contents - Array of markdown strings
 * @returns Array of plain text strings
 */
export function stripMarkdownBatch(contents: string[]): string[] {
  return contents.map(content => stripMarkdown(content));
}