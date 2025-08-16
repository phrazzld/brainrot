import { markdownToEpub, markdownToPdf, markdownToKindle, ConversionOptions } from './pandocConverters';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs');

describe('pandocConverters', () => {
  const mockExec = exec as jest.MockedFunction<typeof exec>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementations
    mockFs.writeFile = jest.fn((path, data, encoding, callback) => {
      if (typeof encoding === 'function') {
        encoding(null);
      } else if (callback) {
        callback(null);
      }
    }) as any;
    
    mockFs.unlink = jest.fn((path, callback) => {
      if (callback) callback(null);
    }) as any;
  });

  describe('markdownToEpub', () => {
    it('should convert markdown to EPUB with default options', async () => {
      const markdown = '# Test Book\n\nThis is content.';
      
      // Mock exec to simulate successful pandoc execution
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      const result = await markdownToEpub(markdown);
      
      expect(result).toMatch(/\.epub$/);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalled();
      expect(mockFs.unlink).toHaveBeenCalled(); // Clean up temp file
    });

    it('should include metadata in pandoc command', async () => {
      const markdown = '# Book';
      const options: ConversionOptions = {
        title: 'My Book',
        author: 'John Doe',
        date: '2024-01-01',
        language: 'en',
        publisher: 'Test Publisher',
        metadata: {
          isbn: '123456789',
          genre: 'Fiction'
        }
      };

      let capturedCommand = '';
      mockExec.mockImplementation((command, callback) => {
        capturedCommand = command as string;
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      await markdownToEpub(markdown, options);
      
      expect(capturedCommand).toContain('--metadata title="My Book"');
      expect(capturedCommand).toContain('--metadata author="John Doe"');
      expect(capturedCommand).toContain('--metadata date="2024-01-01"');
      expect(capturedCommand).toContain('--metadata lang="en"');
      expect(capturedCommand).toContain('--metadata publisher="Test Publisher"');
      expect(capturedCommand).toContain('--metadata isbn="123456789"');
      expect(capturedCommand).toContain('--metadata genre="Fiction"');
      expect(capturedCommand).toContain('--toc');
      expect(capturedCommand).toContain('--toc-depth=2');
    });

    it('should use custom output path when provided', async () => {
      const markdown = '# Test';
      const customPath = '/custom/path/book.epub';
      
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      const result = await markdownToEpub(markdown, { outputPath: customPath });
      
      expect(result).toBe(customPath);
    });

    it('should handle pandoc execution errors', async () => {
      const markdown = '# Test';
      
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(new Error('Pandoc not found'), '', 'Error');
        return {} as any;
      });

      await expect(markdownToEpub(markdown)).rejects.toThrow('EPUB conversion failed');
      expect(mockFs.unlink).toHaveBeenCalled(); // Should still try to clean up
    });

    it('should clean up temp file even on error', async () => {
      const markdown = '# Test';
      
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(new Error('Conversion failed'), '', '');
        return {} as any;
      });

      try {
        await markdownToEpub(markdown);
      } catch (error) {
        // Expected to throw
      }

      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('markdownToPdf', () => {
    it('should convert markdown to PDF with xelatex', async () => {
      const markdown = '# Test Document\n\nPDF content here.';
      
      let capturedCommand = '';
      mockExec.mockImplementation((command, callback) => {
        capturedCommand = command as string;
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      const result = await markdownToPdf(markdown);
      
      expect(result).toMatch(/\.pdf$/);
      expect(capturedCommand).toContain('--pdf-engine=xelatex');
      expect(capturedCommand).toContain('--toc');
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should include PDF-specific metadata', async () => {
      const markdown = '# Content';
      const options: ConversionOptions = {
        title: 'PDF Title',
        author: 'PDF Author',
        date: '2024-06-01'
      };

      let capturedCommand = '';
      mockExec.mockImplementation((command, callback) => {
        capturedCommand = command as string;
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      await markdownToPdf(markdown, options);
      
      expect(capturedCommand).toContain('--metadata title="PDF Title"');
      expect(capturedCommand).toContain('--metadata author="PDF Author"');
      expect(capturedCommand).toContain('--metadata date="2024-06-01"');
    });

    it('should handle PDF conversion errors', async () => {
      const markdown = '# Test';
      
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(new Error('xelatex not found'), '', 'Error');
        return {} as any;
      });

      await expect(markdownToPdf(markdown)).rejects.toThrow('PDF conversion failed');
    });

    it('should use custom temp directory', async () => {
      const markdown = '# Test';
      const customTempDir = '/custom/temp';
      
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      await markdownToPdf(markdown, { tempDir: customTempDir });
      
      const writeCallArgs = mockFs.writeFile.mock.calls[0];
      expect(writeCallArgs[0]).toContain(customTempDir);
    });
  });

  describe('markdownToKindle', () => {
    it('should convert markdown to Kindle format via EPUB', async () => {
      const markdown = '# Kindle Book\n\nContent for Kindle.';
      
      let commandCount = 0;
      let capturedCommands: string[] = [];
      mockExec.mockImplementation((command, callback) => {
        capturedCommands.push(command as string);
        commandCount++;
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      const result = await markdownToKindle(markdown);
      
      expect(result).toMatch(/\.mobi$/);
      expect(commandCount).toBe(2); // One for EPUB, one for Kindle
      expect(capturedCommands[0]).toContain('.epub'); // First creates EPUB
      expect(capturedCommands[1]).toContain('ebook-convert'); // Then converts to MOBI
    });

    it('should pass options to EPUB conversion', async () => {
      const markdown = '# Book';
      const options: ConversionOptions = {
        title: 'Kindle Title',
        author: 'Kindle Author'
      };

      let capturedCommands: string[] = [];
      mockExec.mockImplementation((command, callback) => {
        capturedCommands.push(command as string);
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      await markdownToKindle(markdown, options);
      
      expect(capturedCommands[0]).toContain('--metadata title="Kindle Title"');
      expect(capturedCommands[0]).toContain('--metadata author="Kindle Author"');
    });

    it('should use custom output path for MOBI file', async () => {
      const markdown = '# Test';
      const customPath = '/output/book.mobi';
      
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      const result = await markdownToKindle(markdown, { outputPath: customPath });
      
      expect(result).toBe(customPath);
    });

    it('should clean up temporary EPUB file', async () => {
      const markdown = '# Test';
      
      mockExec.mockImplementation((command, callback) => {
        if (callback) callback(null, 'Success', '');
        return {} as any;
      });

      await markdownToKindle(markdown);
      
      // Should have called unlink twice: once for markdown temp file, once for EPUB
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should handle Calibre not installed error', async () => {
      const markdown = '# Test';
      
      let commandCount = 0;
      mockExec.mockImplementation((command, callback) => {
        commandCount++;
        if (commandCount === 1) {
          // EPUB conversion succeeds
          if (callback) callback(null, 'Success', '');
        } else {
          // Kindle conversion fails
          if (callback) callback(new Error('ebook-convert not found'), '', 'Error');
        }
        return {} as any;
      });

      await expect(markdownToKindle(markdown)).rejects.toThrow('Kindle conversion failed. Make sure Calibre is installed');
    });

    it('should clean up files even when conversion fails', async () => {
      const markdown = '# Test';
      
      mockExec.mockImplementation((command, callback) => {
        if ((command as string).includes('ebook-convert')) {
          if (callback) callback(new Error('Conversion failed'), '', '');
        } else {
          if (callback) callback(null, 'Success', '');
        }
        return {} as any;
      });

      try {
        await markdownToKindle(markdown);
      } catch (error) {
        // Expected to throw
      }

      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });
});