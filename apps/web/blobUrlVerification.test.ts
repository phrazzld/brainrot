import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import translations from "./translations/index.js";

const BLOB_BASE_URL = process.env.NEXT_PUBLIC_BLOB_BASE_URL || 
  "https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com";

interface VerificationResult {
  slug: string;
  title: string;
  chapter: string;
  url: string;
  status: number | null;
  ok: boolean;
  error: string | null;
  duration: number;
}

/**
 * Test that verifies all blob URLs for available books return 200 status codes.
 * Can run in two modes:
 * - CI Mode (default): Uses mocked responses to avoid network calls
 * - Live Mode: Actually fetches URLs when VERIFY_LIVE_URLS=true
 */
describe("Blob URL Verification", () => {
  const isLiveMode = process.env.VERIFY_LIVE_URLS === "true";
  const results: VerificationResult[] = [];

  beforeAll(() => {
    if (!isLiveMode) {
      // Mock fetch for CI environment
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
        // Simulate missing files for known problematic books
        const problematicSlugs = [
          "the-iliad",
          "the-odyssey", 
          "the-aeneid",
          "declaration-of-independence"
        ];
        
        const isProblematic = problematicSlugs.some(slug => 
          url.includes(`/books/${slug}/`)
        );

        if (isProblematic) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: "Not Found",
          } as Response);
        }

        // Mock successful response for other books
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
        } as Response);
      }));
    }
  });

  async function verifyBlobUrl(
    slug: string,
    chapter: string, 
    title: string
  ): Promise<VerificationResult> {
    const url = `${BLOB_BASE_URL}/books/${slug}/text/${chapter}.txt`;
    const startTime = Date.now();
    
    const result: VerificationResult = {
      slug,
      title,
      chapter,
      url,
      status: null,
      ok: false,
      error: null,
      duration: 0,
    };

    try {
      const response = await fetch(url, { 
        method: "HEAD", // Use HEAD to avoid downloading content
      });
      
      result.status = response?.status || null;
      result.ok = response?.ok || false;
      result.duration = Date.now() - startTime;
      
      if (!response?.ok) {
        result.error = response ? `HTTP ${response.status}: ${response.statusText || "Unknown error"}` : "No response received";
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";
      result.duration = Date.now() - startTime;
    }

    results.push(result);
    return result;
  }

  describe("Available Books", () => {
    const availableBooks = translations.filter(
      book => book.status === "available"
    );

    availableBooks.forEach(book => {
      describe(`${book.title} (${book.slug})`, () => {
        // Map book chapters to expected file names
        const getChapterFiles = () => {
          if (book.slug === "hamlet") {
            // Hamlet uses act-01, act-02, etc.
            return ["act-01", "act-02", "act-03", "act-04", "act-05"];
          } else if (book.slug === "declaration-of-independence") {
            // Single file book
            return ["declaration-of-independence-complete"];
          } else if (book.chapters && book.chapters.length > 0) {
            // Generate chapter-01, chapter-02, etc.
            return Array.from(
              { length: book.chapters.length },
              (_, i) => `chapter-${String(i + 1).padStart(2, "0")}`
            );
          }
          return [];
        };

        const chapterFiles = getChapterFiles();

        if (chapterFiles.length === 0) {
          it("should have chapters defined", () => {
            expect(book.chapters).toBeDefined();
            expect(book.chapters.length).toBeGreaterThan(0);
          });
        }

        chapterFiles.forEach(chapter => {
          it(`should have accessible blob URL for ${chapter}`, async () => {
            const result = await verifyBlobUrl(book.slug, chapter, book.title);
            
            expect(result.error).toBeNull();
            expect(result.status).toBe(200);
            expect(result.ok).toBe(true);
            
            if (isLiveMode && result.duration > 5000) {
              console.warn(
                `Slow response for ${book.slug}/${chapter}: ${result.duration}ms`
              );
            }
          });
        });
      });
    });
  });

  // Summary reporting after all tests
  afterAll(() => {
    if (results.length > 0) {
      const failedUrls = results.filter(r => !r.ok);
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      
      console.log("\n📊 Blob URL Verification Summary:");
      console.log(`Total URLs tested: ${results.length}`);
      console.log(`Successful: ${results.filter(r => r.ok).length}`);
      console.log(`Failed: ${failedUrls.length}`);
      console.log(`Average response time: ${avgDuration.toFixed(2)}ms`);
      
      if (failedUrls.length > 0) {
        console.log("\n❌ Failed URLs:");
        failedUrls.forEach(r => {
          console.log(`  - ${r.slug}/${r.chapter}: ${r.error}`);
        });
      }
      
      if (isLiveMode) {
        const slowUrls = results.filter(r => r.duration > 5000);
        if (slowUrls.length > 0) {
          console.log("\n⚠️ Slow URLs (>5s):");
          slowUrls.forEach(r => {
            console.log(`  - ${r.slug}/${r.chapter}: ${r.duration}ms`);
          });
        }
      }
    }
  });
});