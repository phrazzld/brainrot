import { markdownToEpub, markdownToPdf, markdownToKindle } from './pandocConverters';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Mock child_process spawn
jest.mock('child_process');
const mockSpawn = jest.mocked(spawn);

// Mock fs functions
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('pandocConverters Security Tests', () => {
  let mockPandocProcess: any;
  let mockEbookConvertProcess: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock successful pandoc process
    mockPandocProcess = {
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success
        }
      })
    };

    // Mock successful ebook-convert process
    mockEbookConvertProcess = {
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success
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

  describe('Command Injection Prevention', () => {
    it('should reject metadata fields not in allowlist', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await markdownToEpub('# Test', {
        metadata: {
          'malicious': 'value',
          'evil-field': 'bad',
          'title': 'Safe Title' // This should pass
        }
      });

      // Check that spawn was called with safe arguments only
      const spawnCalls = mockSpawn.mock.calls;
      const pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
      const args = pandocCall?.[1] as string[];

      // Should have --sandbox flag
      expect(args).toContain('--sandbox');

      // Should have safe title metadata
      expect(args).toContain('--metadata');
      expect(args).toContain('title=Safe Title');

      // Should NOT have malicious fields
      expect(args).not.toContain('malicious=value');
      expect(args).not.toContain('evil-field=bad');

      // Should log security warnings
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY] Rejected metadata field not in allowlist: malicious'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY] Rejected metadata field not in allowlist: evil-field'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY] Skipping unsafe metadata field: malicious'));

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should reject shell metacharacters in metadata values', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const dangerousInputs = [
        { title: 'Title; rm -rf /' },
        { author: 'Author | cat /etc/passwd' },
        { date: '2024 && echo hacked' },
        { publisher: 'Publisher$(whoami)' },
        { title: 'Title`touch /tmp/pwned`' },
        { author: 'Author\nmalicious\ncommand' }
      ];

      for (const dangerousInput of dangerousInputs) {
        jest.clearAllMocks();
        
        await markdownToEpub('# Test', dangerousInput);

        const spawnCalls = mockSpawn.mock.calls;
        const pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
        const args = pandocCall?.[1] as string[];

        // Should have --sandbox but no dangerous metadata
        expect(args).toContain('--sandbox');
        
        // Should not contain any of the dangerous values
        for (const value of Object.values(dangerousInput)) {
          expect(args.join(' ')).not.toContain(value);
        }

        // Should log security rejection
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY] Rejected'));
      }

      consoleSpy.mockRestore();
    });

    it('should allow safe metadata values', async () => {
      const safeMetadata = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        date: '2024-08-24',
        language: 'en-US',
        publisher: 'Brainrot Publishing House'
      };

      await markdownToEpub('# Test', safeMetadata);

      const spawnCalls = mockSpawn.mock.calls;
      const pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
      const args = pandocCall?.[1] as string[];

      // Should have all safe metadata
      expect(args).toContain('title=The Great Gatsby');
      expect(args).toContain('author=F. Scott Fitzgerald');
      expect(args).toContain('date=2024-08-24');
      expect(args).toContain('lang=en-US');
      expect(args).toContain('publisher=Brainrot Publishing House');
    });

    it('should always use spawn with shell:false', async () => {
      await markdownToEpub('# Test', { title: 'Safe Title' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'pandoc',
        expect.any(Array),
        expect.objectContaining({
          shell: false // Critical security setting
        })
      );
    });

    it('should always include --sandbox flag for pandoc', async () => {
      // Test EPUB
      await markdownToEpub('# Test', {});
      let spawnCalls = mockSpawn.mock.calls;
      let pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
      let args = pandocCall?.[1] as string[];
      expect(args[0]).toBe('--sandbox');

      jest.clearAllMocks();

      // Test PDF
      await markdownToPdf('# Test', {});
      spawnCalls = mockSpawn.mock.calls;
      pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
      args = pandocCall?.[1] as string[];
      expect(args[0]).toBe('--sandbox');
    });

    it('should handle special characters in safe patterns correctly', async () => {
      const metadata = {
        title: "O'Reilly's Book (2nd Edition)",
        author: 'Jean-Pierre Smith, Jr.',
        date: '2024-08-24'
      };

      await markdownToEpub('# Test', metadata);

      const spawnCalls = mockSpawn.mock.calls;
      const pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
      const args = pandocCall?.[1] as string[];

      // Should allow these safe special characters
      expect(args).toContain("title=O'Reilly's Book (2nd Edition)");
      expect(args).toContain('author=Jean-Pierre Smith, Jr.');
    });

    it('should reject backslash and other escape characters', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const escapeAttempts = [
        { title: 'Title\\nNewline' },
        { author: 'Author\\rCarriageReturn' },
        { date: '2024\\0NullByte' },
        { publisher: 'Publisher\\x00Hex' }
      ];

      for (const escapeAttempt of escapeAttempts) {
        jest.clearAllMocks();
        
        await markdownToEpub('# Test', escapeAttempt);

        const spawnCalls = mockSpawn.mock.calls;
        const pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
        const args = pandocCall?.[1] as string[];

        // Should not contain any escape sequences
        expect(args.join(' ')).not.toContain('\\');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY] Rejected'));
      }

      consoleSpy.mockRestore();
    });

    it('should trim whitespace from metadata values', async () => {
      const metadata = {
        title: '  Padded Title  ',
        author: '\tTabbed Author\t',
        date: ' 2024-08-24 '
      };

      await markdownToEpub('# Test', metadata);

      const spawnCalls = mockSpawn.mock.calls;
      const pandocCall = spawnCalls.find(call => call[0] === 'pandoc');
      const args = pandocCall?.[1] as string[];

      // Should trim whitespace
      expect(args).toContain('title=Padded Title');
      expect(args).toContain('author=Tabbed Author');
      expect(args).toContain('date=2024-08-24');
    });
  });

  describe('Error Handling', () => {
    it('should handle pandoc execution errors gracefully', async () => {
      mockPandocProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          callback(new Error('Pandoc not found'));
        }
      });

      await expect(markdownToEpub('# Test', {})).rejects.toThrow('Pandoc execution failed: Pandoc not found');
    });

    it('should handle pandoc non-zero exit codes', async () => {
      mockPandocProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          callback(1); // Non-zero exit code
        }
      });

      mockPandocProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          callback(Buffer.from('Pandoc error details'));
        }
      });

      await expect(markdownToEpub('# Test', {})).rejects.toThrow('Pandoc failed with code 1: Pandoc error details');
    });
  });
});