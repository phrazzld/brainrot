import { convertBook, convertChaptersToText, BookConversionOptions } from './batchConverter';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { markdownToEpub, markdownToPdf, markdownToKindle } from './pandocConverters';

// Mock modules
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  existsSync: jest.fn(),
}));
jest.mock('child_process');
jest.mock('./pandocConverters', () => ({
  markdownToEpub: jest.fn().mockResolvedValue('/output/book.epub'),
  markdownToPdf: jest.fn().mockResolvedValue('/output/book.pdf'),
  markdownToKindle: jest.fn().mockResolvedValue('/output/book.mobi'),
}));

describe('batchConverter', () => {
  const mockReaddir = jest.mocked(fs.readdir);
  const mockReadFile = jest.mocked(fs.readFile);
  const mockWriteFile = jest.mocked(fs.writeFile);
  const mockMkdir = jest.mocked(fs.mkdir);
  const mockExistsSync = jest.mocked(fs.existsSync);
  const mockExec = jest.mocked(exec);
  const mockMarkdownToEpub = jest.mocked(markdownToEpub);
  const mockMarkdownToPdf = jest.mocked(markdownToPdf);
  const mockMarkdownToKindle = jest.mocked(markdownToKindle);

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockReaddir.mockImplementation((path, callback) => {
      if (callback) callback(null, ['chapter-1.md', 'chapter-2.md', 'introduction.md'] as any);
    }) as any;
    
    // Reset pandoc converter mocks
    mockMarkdownToEpub.mockResolvedValue('/output/book.epub');
    mockMarkdownToPdf.mockResolvedValue('/output/book.pdf');
    mockMarkdownToKindle.mockResolvedValue('/output/book.mobi');
    
    mockReadFile.mockImplementation((path, encoding, callback) => {
      const content = `# Chapter Title\n\nThis is chapter content with **bold** text.`;
      const cb = typeof encoding === 'function' ? encoding : callback;
      if (cb) cb(null, content);
    }) as any;
    
    mockWriteFile.mockImplementation((path, data, encoding, callback) => {
      const cb = typeof encoding === 'function' ? encoding : callback;
      if (cb) cb(null);
    }) as any;
    
    mockMkdir.mockImplementation((path, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (cb) cb(null);
    }) as any;
    
    mockExistsSync.mockReturnValue(false);
    
    mockExec.mockImplementation((command, callback) => {
      if (callback) callback(null, 'Success', '');
      return {} as any;
    });
  });

  describe('convertBook', () => {
    const defaultOptions: BookConversionOptions = {
      inputDir: '/input/dir',
      outputDir: '/output/dir'
    };

    it('should create output directory if it does not exist', async () => {
      await convertBook(defaultOptions);
      
      expect(mockMkdir).toHaveBeenCalledWith(
        '/output/dir',
        { recursive: true },
        expect.any(Function)
      );
    });

    it('should read all markdown files from input directory', async () => {
      await convertBook(defaultOptions);
      
      expect(mockReaddir).toHaveBeenCalledWith('/input/dir', expect.any(Function));
      expect(mockReadFile).toHaveBeenCalledTimes(3); // For 3 .md files
    });

    it('should filter and sort markdown files', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['file.txt', 'chapter-2.md', 'chapter-1.md', 'readme.doc'] as any);
      }) as any;

      const results = await convertBook(defaultOptions);
      
      expect(mockReadFile).toHaveBeenCalledTimes(2); // Only .md files
      // Check that files are processed in sorted order
      const readFileCalls = mockReadFile.mock.calls;
      expect(readFileCalls[0][0]).toContain('chapter-1.md');
      expect(readFileCalls[1][0]).toContain('chapter-2.md');
    });

    it('should convert to text format by default', async () => {
      const results = await convertBook(defaultOptions);
      
      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('text');
      expect(results[0].path).toContain('book.txt');
      expect(results[0].success).toBe(true);
    });

    it('should convert to multiple formats when specified', async () => {
      const options: BookConversionOptions = {
        ...defaultOptions,
        formats: ['text', 'epub', 'pdf']
      };

      const results = await convertBook(options);
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.format)).toEqual(['text', 'epub', 'pdf']);
      expect(results[0].path).toContain('book.txt');
      expect(results[1].path).toContain('book.epub');
      expect(results[2].path).toContain('book.pdf');
    });

    it('should handle Kindle format conversion', async () => {
      const options: BookConversionOptions = {
        ...defaultOptions,
        formats: ['kindle']
      };

      const results = await convertBook(options);
      
      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('kindle');
      expect(results[0].path).toContain('book.mobi');
    });

    it('should extract chapter titles from content', async () => {
      mockReadFile.mockImplementation((path, encoding, callback) => {
        const content = `# Chapter 1: The Beginning\n\nContent here.`;
        if (typeof encoding === 'function') {
          encoding(null, content);
        } else if (callback) {
          callback(null, content);
        }
      }) as any;

      await convertBook(defaultOptions);
      
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toContain('The Beginning');
    });

    it('should extract chapter numbers from filenames', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['chapter-5.md', 'chapter-10.md', 'chapter-2.md'] as any);
      }) as any;

      await convertBook(defaultOptions);
      
      // Files should be processed in sorted order
      const readFileCalls = mockReadFile.mock.calls;
      expect(readFileCalls[0][0]).toContain('chapter-10.md'); // Sorted alphabetically
      expect(readFileCalls[1][0]).toContain('chapter-2.md');
      expect(readFileCalls[2][0]).toContain('chapter-5.md');
    });

    it('should combine chapters with separators for text format', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['ch1.md', 'ch2.md'] as any);
      }) as any;

      let chapterCount = 0;
      mockReadFile.mockImplementation((path, encoding, callback) => {
        chapterCount++;
        const content = `Chapter ${chapterCount} content`;
        if (typeof encoding === 'function') {
          encoding(null, content);
        } else if (callback) {
          callback(null, content);
        }
      }) as any;

      await convertBook(defaultOptions);
      
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toContain('---'); // Chapter separator
      expect(writtenContent).toContain('Chapter 1 content');
      expect(writtenContent).toContain('Chapter 2 content');
    });

    it('should pass metadata to format converters', async () => {
      const options: BookConversionOptions = {
        ...defaultOptions,
        formats: ['epub'],
        title: 'Test Book',
        author: 'Test Author'
      };

      await convertBook(options);
      
      // Check that the EPUB converter was called with the metadata
      expect(mockMarkdownToEpub).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Test Book',
          author: 'Test Author'
        })
      );
    });

    it('should handle individual format conversion errors gracefully', async () => {
      const options: BookConversionOptions = {
        ...defaultOptions,
        formats: ['text', 'epub', 'pdf']
      };

      // Make EPUB conversion fail
      mockMarkdownToEpub.mockRejectedValueOnce(new Error('EPUB failed'));

      const results = await convertBook(options);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true); // Text succeeded
      expect(results[1].success).toBe(false); // EPUB failed
      expect(results[1].error).toContain('EPUB failed');
      expect(results[2].success).toBe(true); // PDF succeeded
    });

    it('should handle empty input directory', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, [] as any);
      }) as any;

      const results = await convertBook(defaultOptions);
      
      expect(results).toHaveLength(1);
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toBe(''); // Empty book
    });

    it('should throw error for unsupported format', async () => {
      const options: BookConversionOptions = {
        ...defaultOptions,
        formats: ['text', 'unknown' as any]
      };

      const results = await convertBook(options);
      
      const unknownResult = results.find(r => r.format === 'unknown');
      expect(unknownResult?.success).toBe(false);
      expect(unknownResult?.error).toContain('Unsupported format');
    });

    it('should handle directory read errors', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(new Error('Permission denied'), null as any);
      }) as any;

      await expect(convertBook(defaultOptions)).rejects.toThrow('Book conversion failed');
    });
  });

  describe('convertChaptersToText', () => {
    const inputDir = '/input/chapters';
    const outputDir = '/output/text';

    it('should convert all markdown files to text', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['ch1.md', 'ch2.md', 'ch3.md'] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toContain('ch1.txt');
      expect(results[1]).toContain('ch2.txt');
      expect(results[2]).toContain('ch3.txt');
    });

    it('should create output directory if it does not exist', async () => {
      await convertChaptersToText(inputDir, outputDir);
      
      expect(mockMkdir).toHaveBeenCalledWith(
        outputDir,
        { recursive: true },
        expect.any(Function)
      );
    });

    it('should strip markdown from content', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['chapter.md'] as any);
      }) as any;

      mockReadFile.mockImplementation((path, encoding, callback) => {
        const content = `# Title\n\n**Bold** and *italic* text with [link](url).`;
        if (typeof encoding === 'function') {
          encoding(null, content);
        } else if (callback) {
          callback(null, content);
        }
      }) as any;

      await convertChaptersToText(inputDir, outputDir);
      
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).not.toContain('**');
      expect(writtenContent).not.toContain('*');
      expect(writtenContent).not.toContain('[');
      expect(writtenContent).toContain('Bold and italic text with link');
    });

    it('should preserve filename structure', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['intro.md', 'chapter-1.md', 'conclusion.md'] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      // Files are sorted alphabetically
      expect(results[0]).toContain('chapter-1.txt');
      expect(results[1]).toContain('conclusion.txt');
      expect(results[2]).toContain('intro.txt');
    });

    it('should filter out non-markdown files', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['file.txt', 'chapter.md', 'image.png', 'notes.md'] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results).toHaveLength(2); // Only .md files
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it('should sort files before processing', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, ['z.md', 'a.md', 'm.md'] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results[0]).toContain('a.txt');
      expect(results[1]).toContain('m.txt');
      expect(results[2]).toContain('z.txt');
    });

    it('should handle empty input directory', async () => {
      mockReaddir.mockImplementation((path, callback) => {
        if (callback) callback(null, [] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results).toHaveLength(0);
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should handle read errors', async () => {
      mockReadFile.mockImplementation((path, encoding, callback) => {
        if (typeof encoding === 'function') {
          encoding(new Error('Read failed'), null);
        } else if (callback) {
          callback(new Error('Read failed'), null);
        }
      }) as any;

      await expect(convertChaptersToText(inputDir, outputDir)).rejects.toThrow('Chapter conversion failed');
    });

    it('should handle write errors', async () => {
      mockWriteFile.mockImplementation((path, data, encoding, callback) => {
        if (typeof encoding === 'function') {
          encoding(new Error('Write failed'));
        } else if (callback) {
          callback(new Error('Write failed'));
        }
      }) as any;

      await expect(convertChaptersToText(inputDir, outputDir)).rejects.toThrow('Chapter conversion failed');
    });
  });
});