/**
 * End-to-End Conversion Pipeline Test
 * Tests complete book conversion with security measures
 * Verifies all output formats (text, epub, pdf)
 */

// Set up all mocks BEFORE imports
import { vi } from "vitest";

// Mock fs functions first
const mockWriteFile = vi.fn();
const mockUnlink = vi.fn();

// Mock util before importing modules that use it
vi.mock("util", () => {
  // Create mocks inside factory to avoid hoisting issues
  const writeFileMock = vi.fn();
  const unlinkMock = vi.fn();

  // Store references globally for test access
  (globalThis as any).__mockWriteFile = writeFileMock;
  (globalThis as any).__mockUnlink = unlinkMock;

  return {
    promisify: (fn: any) => {
      if (fn.name === "writeFile") return writeFileMock;
      if (fn.name === "unlink") return unlinkMock;
      return fn;
    },
  };
});

// Mock child_process
vi.mock("child_process");

// Mock fs operations
vi.mock("fs", async () => ({
  ...(await vi.importActual("fs")),
  promises: {
    writeFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Now import everything else after mocks are set up
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { convertBook, BookConversionOptions } from "./batchConverter";
import { markdownToText } from "./markdownToText";
import { markdownToEpub, markdownToPdf } from "./pandocConverters";

const mockSpawn = vi.mocked(spawn);

describe("End-to-End Conversion Pipeline", () => {
  // Sample book content
  const sampleBookChapters = [
    {
      title: "Chapter 1: The Beginning",
      content: `# Chapter 1: The Beginning

In the quiet town of Millbrook, nothing ever seemed to change. The old clock tower chimed every hour, marking time in its steady, predictable way.

Sarah walked down Main Street, her footsteps echoing on the cobblestones. She had lived here all her life, yet today something felt different.

"Change is coming," whispered the wind, but Sarah didn't hear it. Not yet.`,
    },
    {
      title: "Chapter 2: The Discovery",
      content: `# Chapter 2: The Discovery

The library was Sarah's sanctuary. Row upon row of ancient books lined the walls, their leather spines cracked with age.

Hidden between two volumes of forgotten poetry, she found it - a thin manuscript bound in midnight blue cloth.

The title read simply: "The Brainrot Chronicles"

Sarah's hands trembled as she opened the first page...`,
    },
    {
      title: "Chapter 3: The Transformation",
      content: `# Chapter 3: The Transformation

The words on the page began to shift and change. What had been elegant prose transformed into something... different.

"yo fam, this hits different fr fr no cap," the text now read. "the vibes were absolutely immaculate, lowkey bussin even."

Sarah blinked. The library suddenly felt less like a sanctuary and more like a TikTok comment section.

She was experiencing the brainrot firsthand, and there was no going back.`,
    },
  ];

  const bookMetadata = {
    title: "The Brainrot Chronicles",
    author: "Test Author",
    date: "2025-08-27",
    language: "en-US",
    publisher: "Brainrot Publishing House",
  };

  beforeAll(() => {
    // Setup mock implementations using global references
    const writeFileMock = (globalThis as any).__mockWriteFile;
    const unlinkMock = (globalThis as any).__mockUnlink;

    if (writeFileMock) writeFileMock.mockResolvedValue(undefined);
    if (unlinkMock) unlinkMock.mockResolvedValue(undefined);

    // Setup successful mock processes
    const createMockProcess = () => ({
      stderr: {
        on: vi.fn((event, callback) => {
          if (event === "data") {
            // Don't send any stderr data for success case
          }
        }),
      },
      on: vi.fn((event, callback) => {
        if (event === "close") {
          setTimeout(() => callback(0), 0); // Simulate async completion
        }
      }),
    });

    mockSpawn.mockImplementation((command: string) => {
      if (command === "pandoc") {
        return createMockProcess() as any;
      }
      if (command === "ebook-convert") {
        return createMockProcess() as any;
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    // Setup file system mocks
    const mockFs = fs as any;
    mockFs.promises.readdir.mockResolvedValue([
      "chapter-1.md",
      "chapter-2.md",
      "chapter-3.md",
    ]);
    mockFs.promises.readFile.mockImplementation((filePath: string) => {
      const chapterIndex =
        parseInt(filePath.match(/chapter-(\d+)/)?.[1] || "1") - 1;
      return Promise.resolve(sampleBookChapters[chapterIndex]?.content || "");
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe("Complete Book Conversion", () => {
    it("should convert a book to all formats (text, epub, pdf) with security measures", async () => {
      // Combine chapters into full markdown
      const fullMarkdown = sampleBookChapters
        .map((ch) => ch.content)
        .join("\n\n---\n\n");

      // Test 1: Text conversion (no pandoc required)
      const textResult = markdownToText(fullMarkdown);

      expect(textResult).toContain("CHAPTER 1");
      expect(textResult).toContain("The Beginning");
      expect(textResult).toContain("CHAPTER 2");
      expect(textResult).toContain("The Discovery");
      expect(textResult).toContain("CHAPTER 3");
      expect(textResult).toContain("The Transformation");
      expect(textResult).toContain("the vibes were absolutely immaculate");

      // Verify text formatting
      expect(textResult).not.toContain("#"); // Headers converted
      expect(textResult).not.toContain("*"); // Emphasis removed
      expect(textResult).toContain("CHAPTER 1"); // Uppercase headers

      // Test 2: EPUB conversion with security validation
      const epubPromise = markdownToEpub(fullMarkdown, bookMetadata);
      await expect(epubPromise).resolves.toBeInstanceOf(Buffer);

      // Verify security measures are applied
      const epubSpawnCall = mockSpawn.mock.calls.find(
        (call) => call[0] === "pandoc" && call[1]?.includes("--to=epub"),
      );

      expect(epubSpawnCall).toBeDefined();
      const epubArgs = epubSpawnCall?.[1] as string[];

      // Security checks
      expect(epubArgs[0]).toBe("--sandbox"); // Sandbox mode enabled
      expect(epubArgs).toContain("--metadata");
      expect(epubArgs).toContain("title=The Brainrot Chronicles");
      expect(epubArgs).toContain("author=Test Author");
      expect(epubArgs).not.toContain("$("); // No command substitution
      expect(epubArgs).not.toContain("`"); // No backticks
      expect(epubArgs).not.toContain(";"); // No command chaining

      // Verify spawn options
      const epubSpawnOptions = epubSpawnCall?.[2];
      expect(epubSpawnOptions).toHaveProperty("shell", false); // Critical security

      // Test 3: PDF conversion with security validation
      const pdfPromise = markdownToPdf(fullMarkdown, bookMetadata);
      await expect(pdfPromise).resolves.toBeInstanceOf(Buffer);

      const pdfSpawnCall = mockSpawn.mock.calls.find(
        (call) => call[0] === "pandoc" && call[1]?.includes("--to=pdf"),
      );

      expect(pdfSpawnCall).toBeDefined();
      const pdfArgs = pdfSpawnCall?.[1] as string[];

      // Security and format checks
      expect(pdfArgs[0]).toBe("--sandbox");
      expect(pdfArgs).toContain("--pdf-engine=xelatex");
      expect(pdfArgs).toContain("title=The Brainrot Chronicles");
      expect(pdfArgs).not.toContain("|"); // No pipe
      expect(pdfArgs).not.toContain("&&"); // No command chaining
    });

    it("should reject malicious metadata in all formats", async () => {
      const maliciousMetadata = {
        title: "Title; rm -rf /",
        author: "Author | cat /etc/passwd",
        date: "2024 && echo hacked",
        publisher: "Publisher$(whoami)",
        language: "en-US`touch /tmp/pwned`",
      };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation();

      // Attempt EPUB conversion with malicious metadata
      await markdownToEpub("# Test Content", maliciousMetadata);

      // Check that malicious values were rejected
      const spawnCalls = mockSpawn.mock.calls;
      const lastPandocCall = spawnCalls[spawnCalls.length - 1];
      const args = lastPandocCall?.[1] as string[];

      // Verify no malicious content made it through
      const argsString = args.join(" ");
      expect(argsString).not.toContain("rm -rf");
      expect(argsString).not.toContain("cat /etc/passwd");
      expect(argsString).not.toContain("echo hacked");
      expect(argsString).not.toContain("whoami");
      expect(argsString).not.toContain("touch /tmp/pwned");

      // Verify security logs
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[SECURITY] Rejected"),
      );

      consoleSpy.mockRestore();
    });

    it("should handle conversion errors gracefully", async () => {
      // Test that errors in one format don't break others
      const fullMarkdown = sampleBookChapters
        .map((ch) => ch.content)
        .join("\n\n---\n\n");

      // Make next pandoc call fail
      let callCount = 0;
      const failingProcess = {
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === "data") {
              callback(Buffer.from("Pandoc error"));
            }
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(1), 10); // Exit code 1 = failure
          }
        }),
      };

      mockSpawn.mockImplementationOnce(() => failingProcess as any);

      // This should fail
      await expect(markdownToEpub(fullMarkdown, bookMetadata)).rejects.toThrow(
        "Pandoc failed with code 1",
      );

      // But next conversion should work (reset to success mock)
      mockSpawn.mockImplementation((command: string) => {
        if (command === "pandoc") {
          return {
            stderr: { on: vi.fn() },
            on: vi.fn((event, callback) => {
              if (event === "close") callback(0);
            }),
          } as any;
        }
        return {} as any;
      });

      const pdfResult = await markdownToPdf(fullMarkdown, bookMetadata);
      expect(pdfResult).toBeInstanceOf(Buffer);
    });

    it("should maintain content integrity through conversion pipeline", async () => {
      const originalContent = `# Test Book

## Special Characters Test
Here's some content with special characters: O'Reilly's "Book" (2nd Edition)
Jean-Pierre Smith, Jr. wrote this on 2024-08-27.

## Code Block Test
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Formatting Test
This is **bold** and this is *italic*.
- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2

## Link Test
Visit [our website](https://example.com) for more info.`;

      // Test text conversion maintains content
      const textResult = markdownToText(originalContent);

      expect(textResult).toContain("O'Reilly's \"Book\" (2nd Edition)");
      expect(textResult).toContain("Jean-Pierre Smith, Jr.");
      expect(textResult).toContain("function hello()");
      expect(textResult).toContain("Hello, World!");
      expect(textResult).toContain("bold");
      expect(textResult).toContain("italic");
      expect(textResult).toContain("Bullet point 1");
      expect(textResult).toContain("our website");

      // Test EPUB/PDF preserve content (via spawn args)
      await markdownToEpub(originalContent, {
        title: "O'Reilly's \"Book\" (2nd Edition)",
        author: "Jean-Pierre Smith, Jr.",
        date: "2024-08-27",
      });

      const epubCall = mockSpawn.mock.calls[mockSpawn.mock.calls.length - 1];
      const epubArgs = epubCall?.[1] as string[];

      // Safe special characters should be preserved
      expect(epubArgs).toContain("title=O'Reilly's \"Book\" (2nd Edition)");
      expect(epubArgs).toContain("author=Jean-Pierre Smith, Jr.");
    });

    it("should complete full pipeline in reasonable time", async () => {
      const startTime = performance.now();

      // Run all conversions concurrently
      const [textResult, epubResult, pdfResult] = await Promise.all([
        Promise.resolve(markdownToText(sampleBookChapters[0].content)),
        markdownToEpub(sampleBookChapters[0].content, bookMetadata),
        markdownToPdf(sampleBookChapters[0].content, bookMetadata),
      ]);

      const duration = performance.now() - startTime;

      // All should complete
      expect(textResult).toBeTruthy();
      expect(epubResult).toBeInstanceOf(Buffer);
      expect(pdfResult).toBeInstanceOf(Buffer);

      // Should complete quickly (mocked processes)
      expect(duration).toBeLessThan(1000); // Under 1 second
    });
  });

  describe("Security Enforcement", () => {
    it("should always use --sandbox flag for pandoc", async () => {
      // Clear previous calls
      mockSpawn.mockClear();

      // Run multiple conversions
      await markdownToEpub("# Test", {});
      await markdownToPdf("# Test", {});

      // Every pandoc call should have --sandbox as first argument
      const pandocCalls = mockSpawn.mock.calls.filter(
        (call) => call[0] === "pandoc",
      );

      expect(pandocCalls.length).toBeGreaterThan(0);

      for (const call of pandocCalls) {
        const args = call[1] as string[];
        expect(args[0]).toBe("--sandbox");
      }
    });

    it("should validate metadata allowlist", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation();

      const extraMetadata = {
        title: "Safe Title",
        author: "Safe Author",
        maliciousField: "Should be rejected",
        evilProperty: "Should not appear",
        date: "2024-08-27",
        language: "en-US",
      };

      await markdownToEpub("# Content", extraMetadata);

      const lastCall = mockSpawn.mock.calls[mockSpawn.mock.calls.length - 1];
      const args = (lastCall?.[1] as string[]).join(" ");

      // Allowed fields should be present
      expect(args).toContain("title=Safe Title");
      expect(args).toContain("author=Safe Author");
      expect(args).toContain("date=2024-08-27");

      // Non-allowed fields should be rejected
      expect(args).not.toContain("maliciousField");
      expect(args).not.toContain("evilProperty");

      // Security logs should show rejection
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SECURITY] Rejected metadata field not in allowlist: maliciousField",
        ),
      );

      consoleSpy.mockRestore();
    });
  });
});
