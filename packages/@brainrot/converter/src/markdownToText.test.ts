import { markdownToText, chapterToText, chaptersToText, ChapterContent } from './markdownToText';

describe('markdownToText', () => {
  describe('markdownToText function', () => {
    it('should return empty string for empty input', () => {
      expect(markdownToText('')).toBe('');
      expect(markdownToText('', 'Title')).toBe('');
    });

    it('should convert basic markdown to text', () => {
      const markdown = '**bold** and *italic* text';
      const result = markdownToText(markdown);
      expect(result).toBe('bold and italic text');
    });

    it('should add title when provided', () => {
      const markdown = 'Some content here';
      const result = markdownToText(markdown, 'My Title');
      expect(result).toContain('MY TITLE');
      expect(result).toContain('Some content here');
    });

    it('should format chapter breaks', () => {
      const markdown = 'Chapter 1\n\nSome text\n\nChapter 2\n\nMore text';
      const result = markdownToText(markdown);
      expect(result).toContain('CHAPTER 1');
      expect(result).toContain('CHAPTER 2');
    });

    it('should handle Roman numerals in chapters', () => {
      const markdown = 'Chapter IV\n\nText here';
      const result = markdownToText(markdown);
      expect(result).toContain('CHAPTER IV');
    });

    it('should ensure proper paragraph spacing', () => {
      const markdown = 'Para 1\n\n\n\nPara 2\n\nPara 3';
      const result = markdownToText(markdown);
      expect(result).toBe('Para 1\n\nPara 2\n\nPara 3');
    });

    it('should handle markdown with headers and lists', () => {
      const markdown = `
# Header 1

- Item 1
- Item 2

## Header 2

Regular paragraph here.
`;
      const result = markdownToText(markdown);
      expect(result).not.toContain('#');
      expect(result).not.toContain('-');
      expect(result).toContain('Header 1');
      expect(result).toContain('Item 1');
    });
  });

  describe('chapterToText function', () => {
    it('should format chapter with number', () => {
      const chapter: ChapterContent = {
        title: 'Introduction',
        content: 'This is the introduction.',
        number: 1
      };
      const result = chapterToText(chapter);
      expect(result).toBe('CHAPTER 1: INTRODUCTION\n\nThis is the introduction.');
    });

    it('should format chapter without number', () => {
      const chapter: ChapterContent = {
        title: 'Epilogue',
        content: 'The end of the story.'
      };
      const result = chapterToText(chapter);
      expect(result).toBe('EPILOGUE\n\nThe end of the story.');
    });

    it('should strip markdown from content', () => {
      const chapter: ChapterContent = {
        title: 'The Beginning',
        content: '**Bold** start with *italic* middle.',
        number: 1
      };
      const result = chapterToText(chapter);
      expect(result).toBe('CHAPTER 1: THE BEGINNING\n\nBold start with italic middle.');
    });

    it('should handle empty content', () => {
      const chapter: ChapterContent = {
        title: 'Empty Chapter',
        content: '',
        number: 0
      };
      const result = chapterToText(chapter);
      expect(result).toBe('CHAPTER 0: EMPTY CHAPTER\n\n');
    });

    it('should handle markdown content with multiple paragraphs', () => {
      const chapter: ChapterContent = {
        title: 'Complex Chapter',
        content: `
# Section 1

First paragraph with **emphasis**.

## Section 2

- List item 1
- List item 2

Final paragraph.
`,
        number: 5
      };
      const result = chapterToText(chapter);
      expect(result).toContain('CHAPTER 5: COMPLEX CHAPTER');
      expect(result).toContain('Section 1');
      expect(result).toContain('First paragraph with emphasis');
      expect(result).toContain('List item 1');
      expect(result).not.toContain('**');
      expect(result).not.toContain('#');
    });
  });

  describe('chaptersToText function', () => {
    const sampleChapters: ChapterContent[] = [
      {
        title: 'Introduction',
        content: 'This is the intro.',
        number: 1
      },
      {
        title: 'Main Content',
        content: 'The main story goes here.',
        number: 2
      },
      {
        title: 'Conclusion',
        content: 'The end.',
        number: 3
      }
    ];

    it('should combine multiple chapters with separators', () => {
      const result = chaptersToText(sampleChapters);
      expect(result).toContain('CHAPTER 1: INTRODUCTION');
      expect(result).toContain('CHAPTER 2: MAIN CONTENT');
      expect(result).toContain('CHAPTER 3: CONCLUSION');
      expect(result).toContain('---');
      expect(result.match(/---/g)).toHaveLength(2); // 2 separators for 3 chapters
    });

    it('should add book title when provided', () => {
      const result = chaptersToText(sampleChapters, 'My Book');
      expect(result).toContain('MY BOOK\n\n===');
      expect(result).toContain('CHAPTER 1: INTRODUCTION');
    });

    it('should handle empty chapter array', () => {
      const result = chaptersToText([]);
      expect(result).toBe('');
    });

    it('should handle single chapter', () => {
      const singleChapter: ChapterContent[] = [
        {
          title: 'Only Chapter',
          content: 'All content here.'
        }
      ];
      const result = chaptersToText(singleChapter);
      expect(result).toBe('ONLY CHAPTER\n\nAll content here.');
    });

    it('should handle chapters with markdown content', () => {
      const markdownChapters: ChapterContent[] = [
        {
          title: 'First',
          content: '**Bold** text',
          number: 1
        },
        {
          title: 'Second',
          content: '*Italic* text',
          number: 2
        }
      ];
      const result = chaptersToText(markdownChapters);
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).toContain('Bold text');
      expect(result).toContain('Italic text');
    });

    it('should preserve chapter order', () => {
      const result = chaptersToText(sampleChapters);
      const introIndex = result.indexOf('INTRODUCTION');
      const mainIndex = result.indexOf('MAIN CONTENT');
      const conclusionIndex = result.indexOf('CONCLUSION');
      expect(introIndex).toBeLessThan(mainIndex);
      expect(mainIndex).toBeLessThan(conclusionIndex);
    });
  });
});