// Mock fs functions first before any imports
const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();

// Mock util before importing the module that uses it
jest.mock('util', () => ({
  promisify: (fn: any) => {
    if (fn.name === 'writeFile') return mockWriteFile;
    if (fn.name === 'unlink') return mockUnlink;
    return fn;
  },
}));

// Mock child_process
jest.mock('child_process');

// Now import after mocks are set up
import { spawn } from 'child_process';
import { markdownToEpub, markdownToPdf, markdownToKindle, ConversionOptions } from './pandocConverters';

const mockSpawn = jest.mocked(spawn);

describe('pandocConverters', () => {
  let mockPandocProcess: any;
  let mockEbookConvertProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);

    // Mock successful pandoc process
    mockPandocProcess = {
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0); // Success
        }
      })
    };

    // Mock successful ebook-convert process
    mockEbookConvertProcess = {
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0); // Success
        }
      })
    };

    mockSpawn.mockImplementation((command: string) => {
      if (command === 'pandoc') {
        return mockPandocProcess as any;
      }
      if (command === 'ebook-convert') {
        return mockEbookConvertProcess as any;
      }
      throw new Error(`Unexpected command: ${command}`);
    });
  });

  describe('markdownToEpub', () => {
    it('should convert markdown to EPUB with default options', async () => {
      const markdown = '# Test Book\n\nThis is content.';
      
      const result = await markdownToEpub(markdown);
      
      expect(result).toMatch(/\.epub$/);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockSpawn).toHaveBeenCalledWith('pandoc', expect.any(Array), expect.any(Object));
      expect(mockUnlink).toHaveBeenCalled(); // Clean up temp file
    });

    it('should include metadata in pandoc command', async () => {
      const markdown = '# Book';
      const options: ConversionOptions = {
        title: 'Test Book',
        author: 'Test Author',
        date: '2024-01-01',
        language: 'en',
        publisher: 'Test Publisher',
      };

      await markdownToEpub(markdown, options);

      expect(mockSpawn).toHaveBeenCalledWith(
        'pandoc',
        expect.arrayContaining([
          '--sandbox',
          expect.stringMatching(/\.md$/),
          '-o',
          expect.stringMatching(/\.epub$/),
          '--toc',
          '--toc-depth=2',
          '--metadata', 'title=Test Book',
          '--metadata', 'author=Test Author',
          '--metadata', 'date=2024-01-01',
          '--metadata', 'lang=en',
          '--metadata', 'publisher=Test Publisher',
        ]),
        expect.objectContaining({ shell: false })
      );
    });

    it('should use custom output path when provided', async () => {
      const markdown = '# Test';
      const outputPath = '/custom/path/book.epub';

      const result = await markdownToEpub(markdown, { outputPath });

      expect(result).toBe(outputPath);
      expect(mockSpawn).toHaveBeenCalledWith(
        'pandoc',
        expect.arrayContaining(['-o', outputPath]),
        expect.any(Object)
      );
    });

    it('should handle pandoc execution errors', async () => {
      const markdown = '# Test';
      
      mockPandocProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Pandoc not found')), 0);
        }
      });

      await expect(markdownToEpub(markdown)).rejects.toThrow('Pandoc execution failed: Pandoc not found');
    });

    it('should clean up temp file even on error', async () => {
      const markdown = '# Test';
      
      mockPandocProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Non-zero exit code
        }
      });

      await expect(markdownToEpub(markdown)).rejects.toThrow();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe('markdownToPdf', () => {
    it('should convert markdown to PDF with xelatex', async () => {
      const markdown = '# Test Book';
      
      const result = await markdownToPdf(markdown);
      
      expect(result).toMatch(/\.pdf$/);
      expect(mockSpawn).toHaveBeenCalledWith(
        'pandoc',
        expect.arrayContaining([
          '--sandbox',
          '--pdf-engine=xelatex',
          '--toc'
        ]),
        expect.objectContaining({ shell: false })
      );
    });

    it('should include PDF-specific metadata', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const markdown = '# Book';
      const options: ConversionOptions = {
        title: 'PDF Book',
        author: 'PDF Author',
        date: '2024-01-01',
        metadata: {
          // Note: These will be rejected by security validation now
          papersize: 'a4',
          margin: '2cm'
        }
      };

      await markdownToPdf(markdown, options);

      const callArgs = mockSpawn.mock.calls[0][1] as string[];
      
      expect(callArgs).toContain('--metadata');
      expect(callArgs).toContain('title=PDF Book');
      expect(callArgs).toContain('author=PDF Author');
      // These should be rejected due to allowlist
      expect(callArgs).not.toContain('papersize=a4');
      expect(callArgs).not.toContain('margin=2cm');
      
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle PDF conversion errors', async () => {
      const markdown = '# Test';
      
      mockPandocProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          callback(Buffer.from('LaTeX error'));
        }
      });
      
      mockPandocProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Non-zero exit code
        }
      });

      await expect(markdownToPdf(markdown)).rejects.toThrow('PDF conversion failed');
    });

    it('should use custom temp directory', async () => {
      const markdown = '# Test';
      const tempDir = '/custom/temp';

      await markdownToPdf(markdown, { tempDir });

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(tempDir),
        markdown,
        'utf8'
      );
    });
  });

  describe('markdownToKindle', () => {
    it('should convert markdown to Kindle format via EPUB', async () => {
      const markdown = '# Test Book';
      
      const result = await markdownToKindle(markdown);
      
      expect(result).toMatch(/\.mobi$/);
      expect(mockSpawn).toHaveBeenCalledTimes(2); // Once for pandoc, once for ebook-convert
      expect(mockSpawn).toHaveBeenNthCalledWith(1, 'pandoc', expect.any(Array), expect.any(Object));
      expect(mockSpawn).toHaveBeenNthCalledWith(2, 'ebook-convert', expect.any(Array), expect.any(Object));
    });

    it('should pass options to EPUB conversion', async () => {
      const markdown = '# Book';
      const options: ConversionOptions = {
        title: 'Kindle Book',
        author: 'Kindle Author'
      };

      await markdownToKindle(markdown, options);

      expect(mockSpawn).toHaveBeenNthCalledWith(
        1,
        'pandoc',
        expect.arrayContaining([
          '--metadata', 'title=Kindle Book',
          '--metadata', 'author=Kindle Author'
        ]),
        expect.any(Object)
      );
    });

    it('should use custom output path for MOBI file', async () => {
      const markdown = '# Test';
      const outputPath = '/custom/path/book.mobi';

      const result = await markdownToKindle(markdown, { outputPath });

      expect(result).toBe(outputPath);
      expect(mockSpawn).toHaveBeenNthCalledWith(
        2,
        'ebook-convert',
        expect.arrayContaining([expect.any(String), outputPath]),
        expect.any(Object)
      );
    });

    it('should clean up temporary EPUB file', async () => {
      const markdown = '# Test';
      
      await markdownToKindle(markdown);

      // Should clean up the intermediate EPUB file
      expect(mockUnlink).toHaveBeenCalledTimes(2); // Once for input MD, once for intermediate EPUB
    });

    it('should handle Calibre not installed error', async () => {
      const markdown = '# Test';
      
      mockEbookConvertProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('spawn ebook-convert ENOENT')), 0);
        }
      });

      await expect(markdownToKindle(markdown)).rejects.toThrow('Kindle conversion failed');
    });

    it('should clean up files even when conversion fails', async () => {
      const markdown = '# Test';
      
      mockEbookConvertProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Non-zero exit code
        }
      });

      await expect(markdownToKindle(markdown)).rejects.toThrow();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });
});