// Create mock functions first
const mockExecAsync = jest.fn();
const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();

// Mock the promisify function to return our mocks
jest.mock('util', () => ({
  promisify: (fn: any) => {
    // Use the mock functions created above
    if (fn.name === 'exec') return mockExecAsync;
    if (fn.name === 'writeFile') return mockWriteFile;
    if (fn.name === 'unlink') return mockUnlink;
    return fn;
  },
}));

import { markdownToEpub, markdownToPdf, markdownToKindle, ConversionOptions } from './pandocConverters';

describe('pandocConverters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementations
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' });
  });

  describe('markdownToEpub', () => {
    it('should convert markdown to EPUB with default options', async () => {
      const markdown = '# Test Book\n\nThis is content.';
      
      const result = await markdownToEpub(markdown);
      
      expect(result).toMatch(/\.epub$/);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockExecAsync).toHaveBeenCalled();
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

      const command = mockExecAsync.mock.calls[0][0];
      expect(command).toContain('--metadata title="Test Book"');
      expect(command).toContain('--metadata author="Test Author"');
      expect(command).toContain('--metadata date="2024-01-01"');
      expect(command).toContain('--metadata lang="en"');
      expect(command).toContain('--metadata publisher="Test Publisher"');
    });

    it('should use custom output path when provided', async () => {
      const markdown = '# Book';
      const outputPath = '/custom/path/book.epub';
      
      const result = await markdownToEpub(markdown, { outputPath });
      
      expect(result).toBe(outputPath);
    });

    it('should handle pandoc execution errors', async () => {
      const markdown = '# Book';
      const error = new Error('Pandoc not found');
      mockExecAsync.mockRejectedValueOnce(error);

      await expect(markdownToEpub(markdown)).rejects.toThrow('Pandoc not found');
      expect(mockUnlink).toHaveBeenCalled(); // Should still try to clean up
    });

    it('should clean up temp file even on error', async () => {
      const markdown = '# Book';
      mockExecAsync.mockRejectedValueOnce(new Error('Conversion failed'));

      await expect(markdownToEpub(markdown)).rejects.toThrow();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  describe('markdownToPdf', () => {
    it('should convert markdown to PDF with xelatex', async () => {
      const markdown = '# Test Book\n\nContent';
      
      const result = await markdownToPdf(markdown);
      
      expect(result).toMatch(/\.pdf$/);
      const command = mockExecAsync.mock.calls[0][0];
      expect(command).toContain('--pdf-engine=xelatex');
    });

    it('should include PDF-specific metadata', async () => {
      const markdown = '# Book';
      const options: ConversionOptions = {
        title: 'PDF Book',
        metadata: {
          papersize: 'letter',
          margin: '1in',
        },
      };

      await markdownToPdf(markdown, options);

      const command = mockExecAsync.mock.calls[0][0];
      expect(command).toContain('--metadata title="PDF Book"');
      expect(command).toContain('--metadata papersize="letter"');
      expect(command).toContain('--metadata margin="1in"');
    });

    it('should handle PDF conversion errors', async () => {
      const markdown = '# Book';
      mockExecAsync.mockRejectedValueOnce(new Error('LaTeX error'));

      await expect(markdownToPdf(markdown)).rejects.toThrow('LaTeX error');
    });

    it('should use custom temp directory', async () => {
      const markdown = '# Book';
      const tempDir = '/custom/temp';
      
      await markdownToPdf(markdown, { tempDir });
      
      const writePath = mockWriteFile.mock.calls[0][0] as string;
      expect(writePath).toContain(tempDir);
    });
  });

  describe('markdownToKindle', () => {
    it('should convert markdown to Kindle format via EPUB', async () => {
      const markdown = '# Kindle Book';
      
      const result = await markdownToKindle(markdown);
      
      expect(result).toMatch(/\.mobi$/);
      expect(mockExecAsync).toHaveBeenCalledTimes(2); // pandoc + ebook-convert
    });

    it('should pass options to EPUB conversion', async () => {
      const markdown = '# Book';
      const options: ConversionOptions = {
        title: 'Kindle Book',
        author: 'Author',
      };

      await markdownToKindle(markdown, options);

      const pandocCommand = mockExecAsync.mock.calls[0][0];
      expect(pandocCommand).toContain('--metadata title="Kindle Book"');
      expect(pandocCommand).toContain('--metadata author="Author"');
    });

    it('should use custom output path for MOBI file', async () => {
      const markdown = '# Book';
      const outputPath = '/kindle/book.mobi';
      
      const result = await markdownToKindle(markdown, { outputPath });
      
      expect(result).toBe(outputPath);
    });

    it('should clean up temporary EPUB file', async () => {
      const markdown = '# Book';
      
      await markdownToKindle(markdown);
      
      // Should delete both the input markdown and intermediate EPUB
      expect(mockUnlink).toHaveBeenCalledTimes(2);
    });

    it('should handle Calibre not installed error', async () => {
      const markdown = '# Book';
      // First call succeeds (pandoc), second fails (ebook-convert)
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Success', stderr: '' });
      mockExecAsync.mockRejectedValueOnce(new Error('ebook-convert: command not found'));

      await expect(markdownToKindle(markdown)).rejects.toThrow('ebook-convert: command not found');
    });

    it('should clean up files even when conversion fails', async () => {
      const markdown = '# Book';
      mockExecAsync.mockResolvedValueOnce({ stdout: 'Success', stderr: '' });
      mockExecAsync.mockRejectedValueOnce(new Error('Conversion failed'));

      await expect(markdownToKindle(markdown)).rejects.toThrow();
      expect(mockUnlink).toHaveBeenCalled(); // Should still try to clean up
    });
  });
});