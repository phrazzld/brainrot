import { convertBook, convertChaptersToText, BookConversionOptions } from './batchConverter';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Mock modules
jest.mock('fs');
jest.mock('child_process');

describe('batchConverter', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExec = exec as jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockFs.readdir = jest.fn((path, callback) => {
      if (callback) callback(null, ['chapter-1.md', 'chapter-2.md', 'introduction.md'] as any);
    }) as any;
    
    mockFs.readFile = jest.fn((path, encoding, callback) => {
      const content = `# Chapter Title\n\nThis is chapter content with **bold** text.`;
      if (typeof encoding === 'function') {
        encoding(null, content);
      } else if (callback) {
        callback(null, content);
      }
    }) as any;
    
    mockFs.writeFile = jest.fn((path, data, encoding, callback) => {
      if (typeof encoding === 'function') {
        encoding(null);
      } else if (callback) {
        callback(null);
      }
    }) as any;
    
    mockFs.mkdir = jest.fn((path, options, callback) => {
      if (typeof options === 'function') {
        options(null);
      } else if (callback) {
        callback(null);
      }
    }) as any;
    
    mockFs.unlink = jest.fn((path, callback) => {
      if (callback) callback(null);
    }) as any;
    
    mockFs.stat = jest.fn((path, callback) => {
      if (callback) callback(null, { isDirectory: () => true } as any);
    }) as any;
    
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
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        '/output/dir',
        { recursive: true },
        expect.any(Function)
      );
    });

    it('should read all markdown files from input directory', async () => {
      await convertBook(defaultOptions);
      
      expect(mockFs.readdir).toHaveBeenCalledWith('/input/dir', expect.any(Function));
      expect(mockFs.readFile).toHaveBeenCalledTimes(3); // For 3 .md files
    });

    it('should filter and sort markdown files', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, ['file.txt', 'chapter-2.md', 'chapter-1.md', 'readme.doc'] as any);
      }) as any;

      const results = await convertBook(defaultOptions);
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(2); // Only .md files
      // Check that files are processed in sorted order
      const readFileCalls = mockFs.readFile.mock.calls;
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
      mockFs.readFile = jest.fn((path, encoding, callback) => {
        const content = `# Chapter 1: The Beginning\n\nContent here.`;
        if (typeof encoding === 'function') {
          encoding(null, content);
        } else if (callback) {
          callback(null, content);
        }
      }) as any;

      await convertBook(defaultOptions);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toContain('The Beginning');
    });

    it('should extract chapter numbers from filenames', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, ['chapter-5.md', 'chapter-10.md', 'chapter-2.md'] as any);
      }) as any;

      await convertBook(defaultOptions);
      
      // Files should be processed in sorted order
      const readFileCalls = mockFs.readFile.mock.calls;
      expect(readFileCalls[0][0]).toContain('chapter-10.md'); // Sorted alphabetically
      expect(readFileCalls[1][0]).toContain('chapter-2.md');
      expect(readFileCalls[2][0]).toContain('chapter-5.md');
    });

    it('should combine chapters with separators for text format', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, ['ch1.md', 'ch2.md'] as any);
      }) as any;

      let chapterCount = 0;
      mockFs.readFile = jest.fn((path, encoding, callback) => {
        chapterCount++;
        const content = `Chapter ${chapterCount} content`;
        if (typeof encoding === 'function') {
          encoding(null, content);
        } else if (callback) {
          callback(null, content);
        }
      }) as any;

      await convertBook(defaultOptions);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
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

      let capturedCommand = '';
      mockExec.mockImplementation((command, callback) => {
        capturedCommand = command as string;
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      await convertBook(options);
      
      expect(capturedCommand).toContain('--metadata title="Test Book"');
      expect(capturedCommand).toContain('--metadata author="Test Author"');
    });

    it('should handle individual format conversion errors gracefully', async () => {
      const options: BookConversionOptions = {
        ...defaultOptions,
        formats: ['text', 'epub', 'pdf']
      };

      mockExec.mockImplementation((command, callback) => {
        if ((command as string).includes('.epub')) {
          if (callback) callback(new Error('EPUB failed'), '', '');
        } else {
          if (callback) callback(null, 'Success', '');
        }
        return {} as any;
      });

      const results = await convertBook(options);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true); // Text succeeded
      expect(results[1].success).toBe(false); // EPUB failed
      expect(results[1].error).toContain('EPUB failed');
      expect(results[2].success).toBe(true); // PDF succeeded
    });

    it('should handle empty input directory', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, [] as any);
      }) as any;

      const results = await convertBook(defaultOptions);
      
      expect(results).toHaveLength(1);
      const writeCall = mockFs.writeFile.mock.calls[0];
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
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(new Error('Permission denied'), null as any);
      }) as any;

      await expect(convertBook(defaultOptions)).rejects.toThrow('Book conversion failed');
    });
  });

  describe('convertChaptersToText', () => {
    const inputDir = '/input/chapters';
    const outputDir = '/output/text';

    it('should convert all markdown files to text', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
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
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        outputDir,
        { recursive: true },
        expect.any(Function)
      );
    });

    it('should strip markdown from content', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, ['chapter.md'] as any);
      }) as any;

      mockFs.readFile = jest.fn((path, encoding, callback) => {
        const content = `# Title\n\n**Bold** and *italic* text with [link](url).`;
        if (typeof encoding === 'function') {
          encoding(null, content);
        } else if (callback) {
          callback(null, content);
        }
      }) as any;

      await convertChaptersToText(inputDir, outputDir);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).not.toContain('**');
      expect(writtenContent).not.toContain('*');
      expect(writtenContent).not.toContain('[');
      expect(writtenContent).toContain('Bold and italic text with link');
    });

    it('should preserve filename structure', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, ['intro.md', 'chapter-1.md', 'conclusion.md'] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results[0]).toContain('intro.txt');
      expect(results[1]).toContain('chapter-1.txt');
      expect(results[2]).toContain('conclusion.txt');
    });

    it('should filter out non-markdown files', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, ['file.txt', 'chapter.md', 'image.png', 'notes.md'] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results).toHaveLength(2); // Only .md files
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should sort files before processing', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, ['z.md', 'a.md', 'm.md'] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results[0]).toContain('a.txt');
      expect(results[1]).toContain('m.txt');
      expect(results[2]).toContain('z.txt');
    });

    it('should handle empty input directory', async () => {
      mockFs.readdir = jest.fn((path, callback) => {
        if (callback) callback(null, [] as any);
      }) as any;

      const results = await convertChaptersToText(inputDir, outputDir);
      
      expect(results).toHaveLength(0);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle read errors', async () => {
      mockFs.readFile = jest.fn((path, encoding, callback) => {
        if (typeof encoding === 'function') {
          encoding(new Error('Read failed'), null);
        } else if (callback) {
          callback(new Error('Read failed'), null);
        }
      }) as any;

      await expect(convertChaptersToText(inputDir, outputDir)).rejects.toThrow('Chapter conversion failed');
    });

    it('should handle write errors', async () => {
      mockFs.writeFile = jest.fn((path, data, encoding, callback) => {
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