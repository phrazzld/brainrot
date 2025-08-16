import { stripMarkdown, stripMarkdownBatch } from './stripMarkdown';

describe('stripMarkdown', () => {
  describe('stripMarkdown function', () => {
    it('should return empty string for null/undefined input', () => {
      expect(stripMarkdown('')).toBe('');
      expect(stripMarkdown(null as any)).toBe('');
      expect(stripMarkdown(undefined as any)).toBe('');
    });

    it('should remove bold formatting', () => {
      expect(stripMarkdown('**bold text**')).toBe('bold text');
      expect(stripMarkdown('__bold text__')).toBe('bold text');
    });

    it('should remove italic formatting', () => {
      expect(stripMarkdown('*italic text*')).toBe('italic text');
      expect(stripMarkdown('_italic text_')).toBe('italic text');
    });

    it('should remove headers', () => {
      expect(stripMarkdown('# Header 1')).toBe('Header 1');
      expect(stripMarkdown('## Header 2')).toBe('Header 2');
      expect(stripMarkdown('### Header 3')).toBe('Header 3');
    });

    it('should remove links', () => {
      expect(stripMarkdown('[link text](https://example.com)')).toBe('link text');
      expect(stripMarkdown('[link](url)')).toBe('link');
    });

    it('should remove images', () => {
      expect(stripMarkdown('![alt text](image.jpg)')).toBe('alt text');
      expect(stripMarkdown('![](image.jpg)')).toBe('');
    });

    it('should remove code blocks', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const result = stripMarkdown(markdown);
      expect(result).not.toContain('```');
      expect(result).toContain('const x = 1;');
    });

    it('should remove inline code', () => {
      expect(stripMarkdown('This is `inline code` here')).toBe('This is inline code here');
    });

    it('should preserve paragraph breaks', () => {
      const markdown = 'Paragraph 1\n\nParagraph 2\n\n\nParagraph 3';
      const result = stripMarkdown(markdown);
      expect(result).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3');
    });

    it('should remove excessive whitespace', () => {
      const markdown = 'Text    with     spaces';
      expect(stripMarkdown(markdown)).toBe('Text with spaces');
    });

    it('should handle lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const result = stripMarkdown(markdown);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
    });

    it('should handle numbered lists', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      const result = stripMarkdown(markdown);
      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });

    it('should handle blockquotes', () => {
      expect(stripMarkdown('> This is a quote')).toBe('This is a quote');
    });

    it('should handle complex markdown', () => {
      const markdown = `
# Main Title

This is a **bold** paragraph with *italic* text and a [link](url).

## Subsection

- List item 1
- List item 2

> A quote here

\`\`\`code
function test() {}
\`\`\`

Final paragraph with \`inline code\`.
`;
      const result = stripMarkdown(markdown);
      expect(result).not.toContain('#');
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('```');
      expect(result).not.toContain('`');
      expect(result).toContain('Main Title');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('link');
    });
  });

  describe('stripMarkdownBatch function', () => {
    it('should process empty array', () => {
      expect(stripMarkdownBatch([])).toEqual([]);
    });

    it('should process array of markdown strings', () => {
      const input = [
        '**bold text**',
        '*italic text*',
        '# Header',
        '[link](url)'
      ];
      const expected = [
        'bold text',
        'italic text',
        'Header',
        'link'
      ];
      expect(stripMarkdownBatch(input)).toEqual(expected);
    });

    it('should handle mixed content array', () => {
      const input = [
        '',
        '**bold**',
        'plain text',
        '## Header 2'
      ];
      const expected = [
        '',
        'bold',
        'plain text',
        'Header 2'
      ];
      expect(stripMarkdownBatch(input)).toEqual(expected);
    });
  });
});