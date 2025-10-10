import { chromium, Browser, Page, BrowserContext } from "playwright";
import path from "path";
import fs from "fs/promises";
import { Logger } from "../utils/logger.js";
import inquirer from "inquirer";
import type {
  KdpBook,
  KdpBookDetails,
  BookStatus,
  BookFormat,
  KdpScrapingError,
  KdpSessionExpiredError,
} from "@brainrot/types";

interface KdpConfig {
  email: string;
  password: string;
  headless?: boolean;
  mockMode?: boolean;
  screenshotDir?: string;
  timeout?: number;
}

interface BookDetails {
  title: string;
  subtitle?: string;
  author: string;
  description: string;
  keywords: string[];
  categories: string[];
  language?: string;
  isbn?: string;
  publishingRights?: "worldwide" | "territories";
  territories?: string[];
}

interface ManuscriptDetails {
  filePath: string;
  format: "pdf" | "epub" | "docx";
}

interface CoverDetails {
  filePath: string;
  format: "jpg" | "tiff";
}

interface PricingDetails {
  price: number;
  currency: string;
  marketplaces: string[];
  royaltyOption: "35%" | "70%";
  kdpSelect?: boolean;
}

export class KdpService {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private config: KdpConfig;
  private screenshotCounter: number = 0;
  private bookListCache: { data: KdpBook[]; timestamp: number } | null = null;

  /**
   * CSS selectors for KDP UI elements
   * Update these if KDP changes their page structure
   */
  private readonly selectors = {
    bookshelf: {
      // Multiple strategies for finding book cards
      bookCard: [
        '[data-testid="book-card"]',
        ".book-card",
        '[class*="BookCard"]',
        '[class*="book-item"]',
      ],
      title: ["h3", "h2", '[class*="title"]'],
      status: [
        '[data-testid="book-status"]',
        ".status",
        '[class*="status"]',
      ],
      asin: ["[data-asin]", '[data-id="asin"]'],
      nextButton: [
        'button:has-text("Next")',
        'a:has-text("Next")',
        '[aria-label="Next page"]',
      ],
    },
    bookDetails: {
      title: ['input[name="title"]', 'input#title', '[data-field="title"]'],
      subtitle: [
        'input[name="subtitle"]',
        'input#subtitle',
        '[data-field="subtitle"]',
      ],
      author: [
        'input[name="author"]',
        'input#author',
        '[data-field="author"]',
      ],
      description: [
        'textarea[name="description"]',
        'textarea#description',
        '[data-field="description"]',
      ],
      keywords: [
        'input[name^="keyword"]',
        'input[id^="keyword"]',
        '[data-field^="keyword"]',
      ],
      categories: [
        '[data-testid="categories"]',
        ".categories",
        '[class*="category"]',
      ],
      pricingTab: [
        'a:has-text("Pricing")',
        'button:has-text("Pricing")',
        '[data-tab="pricing"]',
      ],
      pricingTable: [
        'table.pricing-table',
        '[data-testid="pricing-table"]',
        'table[class*="pricing"]',
      ],
      marketplaceRow: ["tr[data-marketplace]", 'tr[class*="marketplace"]'],
    },
  };

  constructor(config: KdpConfig) {
    this.config = {
      headless: true,
      mockMode: false,
      screenshotDir: "screenshots",
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Initialize browser and context
   */
  private async initBrowser(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info("[MOCK] Browser initialized");
      return;
    }

    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();

    // Set default timeout
    this.page.setDefaultTimeout(this.config.timeout || 30000);

    Logger.debug("Browser initialized successfully");
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info("[MOCK] Browser closed");
      return;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
      this.context = undefined;
      this.page = undefined;
    }
  }

  /**
   * Take screenshot for debugging
   */
  private async takeScreenshot(name: string): Promise<void> {
    if (this.config.mockMode || !this.page) return;

    try {
      const screenshotPath = path.join(
        this.config.screenshotDir!,
        `${this.screenshotCounter++}-${name}.png`,
      );

      await fs.mkdir(this.config.screenshotDir!, { recursive: true });
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      Logger.debug(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      Logger.warn(`Failed to take screenshot: ${error}`);
    }
  }

  /**
   * Login to KDP with 2FA support
   */
  async login(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info("[MOCK] Logged in to KDP successfully");
      return;
    }

    await this.initBrowser();

    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    try {
      Logger.info("Navigating to KDP login page...");
      await this.page.goto("https://kdp.amazon.com/", {
        waitUntil: "networkidle",
      });

      // Click Sign In button
      await this.page.click('a[data-action="sign-in-button"]');

      // Enter email
      await this.page.fill('input[type="email"]', this.config.email);
      await this.page.click("input#continue");

      // Enter password
      await this.page.fill('input[type="password"]', this.config.password);
      await this.page.click("input#signInSubmit");

      // Check for 2FA
      if (
        await this.page
          .isVisible('text="Two-Step Verification"', { timeout: 5000 })
          .catch(() => false)
      ) {
        Logger.info("2FA required. Please check your authentication method.");

        // Handle OTP input
        if (await this.page.isVisible("input#auth-mfa-otpcode")) {
          const { otp } = await inquirer.prompt([
            {
              type: "input",
              name: "otp",
              message: "Enter your 2FA code:",
              validate: (input) =>
                /^\d{6}$/.test(input) || "Please enter a valid 6-digit code",
            },
          ]);

          await this.page.fill("input#auth-mfa-otpcode", otp);
          await this.page.click("input#auth-signin-button");
        }

        // Handle SMS/Call verification
        if (await this.page.isVisible('text="Get OTP on SMS"')) {
          await this.page.click('text="Get OTP on SMS"');

          const { smsCode } = await inquirer.prompt([
            {
              type: "input",
              name: "smsCode",
              message: "Enter the code sent to your phone:",
              validate: (input) =>
                /^\d{6}$/.test(input) || "Please enter a valid 6-digit code",
            },
          ]);

          await this.page.fill('input[name="otpCode"]', smsCode);
          await this.page.click('input[type="submit"]');
        }
      }

      // Wait for dashboard to load
      await this.page.waitForSelector('text="Bookshelf"', { timeout: 30000 });
      Logger.success("Successfully logged in to KDP");

      await this.takeScreenshot("login-success");
    } catch (error) {
      await this.takeScreenshot("login-error");
      throw new Error(`Login failed: ${error}`);
    }
  }

  /**
   * Navigate to new book creation page
   */
  async navigateToNewBook(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info("[MOCK] Navigated to new book page");
      return;
    }

    if (!this.page) {
      throw new Error("Not logged in. Please call login() first.");
    }

    try {
      // Click "Create" button
      await this.page.click('a:has-text("Create")');

      // Select Kindle eBook or Paperback
      await this.page.click('button:has-text("Kindle eBook")');

      // Wait for book details form
      await this.page.waitForSelector('input[name="title"]');

      Logger.info("Navigated to new book creation page");
      await this.takeScreenshot("new-book-page");
    } catch (error) {
      await this.takeScreenshot("navigate-error");
      throw new Error(`Navigation failed: ${error}`);
    }
  }

  /**
   * Fill book details form
   */
  async fillBookDetails(details: BookDetails): Promise<void> {
    if (this.config.mockMode) {
      Logger.info(`[MOCK] Filled book details: ${details.title}`);
      return;
    }

    if (!this.page) {
      throw new Error("Not on book creation page. Please navigate first.");
    }

    try {
      // Title
      await this.page.fill('input[name="title"]', details.title);

      // Subtitle (if provided)
      if (details.subtitle) {
        await this.page.fill('input[name="subtitle"]', details.subtitle);
      }

      // Author
      await this.page.fill('input[name="author"]', details.author);

      // Description
      await this.page.fill('textarea[name="description"]', details.description);

      // Keywords (up to 7)
      const keywordInputs = await this.page.$$('input[name^="keyword"]');
      for (let i = 0; i < Math.min(details.keywords.length, 7); i++) {
        await keywordInputs[i].fill(details.keywords[i]);
      }

      // Categories
      await this.page.click('button:has-text("Choose categories")');
      // Category selection would require more complex logic based on Amazon's category tree
      await this.page.click('button:has-text("Save")');

      // Language
      if (details.language) {
        await this.page.selectOption(
          'select[name="language"]',
          details.language,
        );
      }

      // ISBN (if provided)
      if (details.isbn) {
        await this.page.fill('input[name="isbn"]', details.isbn);
      }

      // Publishing rights
      if (details.publishingRights === "worldwide") {
        await this.page.check('input[value="all_territories"]');
      } else {
        await this.page.check('input[value="specific_territories"]');
        // Territory selection would require additional logic
      }

      Logger.info("Book details filled successfully");
      await this.takeScreenshot("book-details-filled");
    } catch (error) {
      await this.takeScreenshot("fill-details-error");
      throw new Error(`Failed to fill book details: ${error}`);
    }
  }

  /**
   * Upload manuscript file
   */
  async uploadManuscript(manuscript: ManuscriptDetails): Promise<void> {
    if (this.config.mockMode) {
      Logger.info(
        `[MOCK] Uploaded manuscript: ${path.basename(manuscript.filePath)}`,
      );
      return;
    }

    if (!this.page) {
      throw new Error("Not on book creation page.");
    }

    try {
      // Click upload button
      await this.page.click('button:has-text("Upload manuscript")');

      // Set file input
      const fileInput = await this.page.$('input[type="file"][accept*="pdf"]');
      if (fileInput) {
        await fileInput.setInputFiles(manuscript.filePath);
      }

      // Wait for upload to complete
      await this.page.waitForSelector('text="Upload complete"', {
        timeout: 60000,
      });

      // Wait for processing
      await this.page.waitForSelector('text="Processing complete"', {
        timeout: 120000,
      });

      Logger.info("Manuscript uploaded and processed successfully");
      await this.takeScreenshot("manuscript-uploaded");
    } catch (error) {
      await this.takeScreenshot("upload-manuscript-error");
      throw new Error(`Failed to upload manuscript: ${error}`);
    }
  }

  /**
   * Upload book cover
   */
  async uploadCover(cover: CoverDetails): Promise<void> {
    if (this.config.mockMode) {
      Logger.info(`[MOCK] Uploaded cover: ${path.basename(cover.filePath)}`);
      return;
    }

    if (!this.page) {
      throw new Error("Not on book creation page.");
    }

    try {
      // Click upload cover button
      await this.page.click('button:has-text("Upload cover")');

      // Set file input
      const fileInput = await this.page.$(
        'input[type="file"][accept*="image"]',
      );
      if (fileInput) {
        await fileInput.setInputFiles(cover.filePath);
      }

      // Wait for upload to complete
      await this.page.waitForSelector('text="Cover uploaded"', {
        timeout: 60000,
      });

      // Check for dimension warnings
      const warnings = await this.page.$$(
        "text=/dimension|resolution|quality/i",
      );
      if (warnings.length > 0) {
        Logger.warn("Cover may have dimension or quality issues");
      }

      Logger.info("Cover uploaded successfully");
      await this.takeScreenshot("cover-uploaded");
    } catch (error) {
      await this.takeScreenshot("upload-cover-error");
      throw new Error(`Failed to upload cover: ${error}`);
    }
  }

  /**
   * Set pricing and royalty options
   */
  async setPricingAndRights(pricing: PricingDetails): Promise<void> {
    if (this.config.mockMode) {
      Logger.info(`[MOCK] Set pricing: ${pricing.currency} ${pricing.price}`);
      return;
    }

    if (!this.page) {
      throw new Error("Not on book creation page.");
    }

    try {
      // Navigate to pricing section
      await this.page.click('button:has-text("Pricing")');

      // KDP Select enrollment
      if (pricing.kdpSelect !== undefined) {
        const kdpSelectCheckbox = await this.page.$('input[name="kdp_select"]');
        if (kdpSelectCheckbox) {
          if (pricing.kdpSelect) {
            await kdpSelectCheckbox.check();
          } else {
            await kdpSelectCheckbox.uncheck();
          }
        }
      }

      // Royalty option
      if (pricing.royaltyOption === "70%") {
        await this.page.click('input[value="70"]');
      } else {
        await this.page.click('input[value="35"]');
      }

      // Set price for each marketplace
      for (const marketplace of pricing.marketplaces) {
        const priceInput = await this.page.$(
          `input[name="price_${marketplace}"]`,
        );
        if (priceInput) {
          await priceInput.fill(pricing.price.toString());
        }
      }

      Logger.info("Pricing and rights configured successfully");
      await this.takeScreenshot("pricing-set");
    } catch (error) {
      await this.takeScreenshot("set-pricing-error");
      throw new Error(`Failed to set pricing: ${error}`);
    }
  }

  /**
   * Save book as draft
   */
  async saveAsDraft(): Promise<string> {
    if (this.config.mockMode) {
      const draftId = `mock-draft-${Date.now()}`;
      Logger.info(`[MOCK] Saved as draft: ${draftId}`);
      return draftId;
    }

    if (!this.page) {
      throw new Error("Not on book creation page.");
    }

    try {
      // Click save as draft
      await this.page.click('button:has-text("Save as Draft")');

      // Wait for confirmation
      await this.page.waitForSelector('text="Draft saved"');

      // Extract book ID from URL or page
      const url = this.page.url();
      const bookIdMatch = url.match(/book[iI]d=([^&]+)/);
      const bookId = bookIdMatch ? bookIdMatch[1] : "unknown";

      Logger.info(`Book saved as draft: ${bookId}`);
      await this.takeScreenshot("draft-saved");

      return bookId;
    } catch (error) {
      await this.takeScreenshot("save-draft-error");
      throw new Error(`Failed to save draft: ${error}`);
    }
  }

  /**
   * Publish book (make it live)
   */
  async publishBook(): Promise<string> {
    if (this.config.mockMode) {
      const bookId = `mock-book-${Date.now()}`;
      Logger.info(`[MOCK] Published book: ${bookId}`);
      return bookId;
    }

    if (!this.page) {
      throw new Error("Not on book creation page.");
    }

    try {
      // Click publish button
      await this.page.click('button:has-text("Publish Your Kindle eBook")');

      // Confirm publishing
      const confirmButton = await this.page.$('button:has-text("Publish")');
      if (confirmButton) {
        await confirmButton.click();
      }

      // Wait for publishing confirmation
      await this.page.waitForSelector('text="Your book is live"', {
        timeout: 300000,
      });

      // Extract ASIN
      const asinElement = await this.page.$("text=/ASIN: (B[0-9A-Z]{9})/");
      let asin = "unknown";
      if (asinElement) {
        const text = await asinElement.textContent();
        const match = text?.match(/B[0-9A-Z]{9}/);
        if (match) {
          asin = match[0];
        }
      }

      Logger.success(`Book published successfully! ASIN: ${asin}`);
      await this.takeScreenshot("book-published");

      return asin;
    } catch (error) {
      await this.takeScreenshot("publish-error");
      throw new Error(`Failed to publish book: ${error}`);
    }
  }

  /**
   * Complete book publishing workflow
   */
  async publishCompleteBook(
    details: BookDetails,
    manuscript: ManuscriptDetails,
    cover: CoverDetails,
    pricing: PricingDetails,
    publish: boolean = false,
  ): Promise<{ bookId: string; asin?: string }> {
    if (this.config.mockMode) {
      Logger.info("[MOCK] Starting complete book publishing workflow");
      await this.login();
      await this.navigateToNewBook();
      await this.fillBookDetails(details);
      await this.uploadManuscript(manuscript);
      await this.uploadCover(cover);
      await this.setPricingAndRights(pricing);

      if (publish) {
        const asin = await this.publishBook();
        return { bookId: `mock-book-${Date.now()}`, asin };
      } else {
        const bookId = await this.saveAsDraft();
        return { bookId };
      }
    }

    try {
      await this.login();
      await this.navigateToNewBook();
      await this.fillBookDetails(details);
      await this.uploadManuscript(manuscript);
      await this.uploadCover(cover);
      await this.setPricingAndRights(pricing);

      if (publish) {
        const asin = await this.publishBook();
        return { bookId: asin, asin };
      } else {
        const bookId = await this.saveAsDraft();
        return { bookId };
      }
    } finally {
      await this.close();
    }
  }

  /**
   * Navigate to KDP bookshelf
   *
   * @throws {KdpSessionExpiredError} If session has expired
   * @throws {KdpScrapingError} If bookshelf page fails to load
   */
  private async navigateToBookshelf(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info("[MOCK] Navigated to bookshelf");
      return;
    }

    if (!this.page) {
      throw new Error("Page not initialized. Call login() first.");
    }

    // Check if already on bookshelf
    const currentUrl = this.page.url();
    if (currentUrl.includes("/bookshelf")) {
      Logger.debug("Already on bookshelf page");
      return;
    }

    try {
      // Navigate to bookshelf
      await this.page.goto("https://kdp.amazon.com/bookshelf", {
        waitUntil: "networkidle",
        timeout: this.config.timeout,
      });

      // Check for login redirect (session expired)
      const url = this.page.url();
      if (url.includes("/signin") || url.includes("/ap/")) {
        const KdpSessionExpiredError = (
          await import("@brainrot/types")
        ).KdpSessionExpiredError;
        throw new KdpSessionExpiredError();
      }

      // Wait for bookshelf to load - try multiple selectors
      let loaded = false;
      for (const selector of this.selectors.bookshelf.bookCard) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          loaded = true;
          Logger.debug(`Bookshelf loaded (found: ${selector})`);
          break;
        } catch {
          continue;
        }
      }

      if (!loaded) {
        // Check if there's an empty state
        const emptyState = await this.page
          .locator('text=/no books|empty|get started/i')
          .first()
          .isVisible()
          .catch(() => false);

        if (emptyState) {
          Logger.debug("Bookshelf is empty (no books published)");
          return;
        }

        throw new Error("Bookshelf grid did not load");
      }
    } catch (error) {
      await this.takeScreenshot("bookshelf-navigation-error");

      if (error instanceof Error && error.name === "KdpSessionExpiredError") {
        throw error;
      }

      const { KdpScrapingError } = await import("@brainrot/types");
      const message = error instanceof Error ? error.message : String(error);
      throw new KdpScrapingError(
        `Failed to navigate to bookshelf: ${message}`,
        this.page.url(),
      );
    }
  }

  /**
   * List all books in KDP account
   *
   * Navigates to bookshelf and extracts book metadata. Results are cached
   * for 5 minutes to avoid unnecessary page loads.
   *
   * @param options.noCache - If true, bypass cache and fetch fresh data
   * @returns Array of books sorted by last modified date (newest first)
   * @throws {KdpAuthenticationError} If not logged in
   * @throws {KdpScrapingError} If unable to parse bookshelf data
   *
   * @example
   * const books = await kdp.listBooks();
   * console.log(`You have ${books.length} books`);
   */
  async listBooks(options?: { noCache?: boolean }): Promise<KdpBook[]> {
    // Return mock data in mock mode
    if (this.config.mockMode) {
      Logger.info("[MOCK] Listing books");
      return [
        {
          asin: "B0MOCK123",
          title: "The Great Gatsby (Brainrot Edition)",
          author: "F. Scott Fitzgerald, trans. Brainrot Classics",
          status: "live" as BookStatus,
          formats: ["ebook" as BookFormat],
          lastModified: new Date(),
        },
        {
          asin: "B0MOCK456",
          title: "The Republic (Brainrot Edition)",
          author: "Plato, trans. Brainrot Classics",
          status: "live" as BookStatus,
          formats: ["ebook" as BookFormat, "paperback" as BookFormat],
          publishedDate: new Date("2025-01-15"),
          lastModified: new Date(),
        },
      ];
    }

    // Check cache
    if (
      !options?.noCache &&
      this.bookListCache &&
      Date.now() - this.bookListCache.timestamp < 5 * 60 * 1000
    ) {
      Logger.debug("Returning cached book list");
      return this.bookListCache.data;
    }

    if (!this.page) {
      throw new Error("Not logged in. Call login() first.");
    }

    try {
      await this.navigateToBookshelf();

      const books: KdpBook[] = [];
      let hasNextPage = true;
      let pageNum = 1;

      while (hasNextPage) {
        Logger.debug(`Scraping bookshelf page ${pageNum}...`);

        // Find book card elements - try each selector strategy
        let cards: any[] = [];
        for (const selector of this.selectors.bookshelf.bookCard) {
          cards = await this.page.$$(selector);
          if (cards.length > 0) {
            Logger.debug(`Found ${cards.length} books using: ${selector}`);
            break;
          }
        }

        if (cards.length === 0) {
          Logger.debug("No books found on this page");
          break;
        }

        // Extract data from each book card
        for (const card of cards) {
          try {
            // Extract title
            let title = "";
            for (const selector of this.selectors.bookshelf.title) {
              const titleEl = await card.$(selector);
              if (titleEl) {
                title = (await titleEl.textContent())?.trim() || "";
                if (title) break;
              }
            }

            // Extract ASIN from href or data attribute
            let asin = "";
            for (const selector of this.selectors.bookshelf.asin) {
              asin = (await card.getAttribute(selector.replace(/[\[\]]/g, ""))) || "";
              if (asin) break;
            }

            // Fallback: extract from link href
            if (!asin) {
              const link = await card.$("a[href*='/title/']");
              if (link) {
                const href = await link.getAttribute("href");
                const match = href?.match(/\/title\/([A-Z0-9]+)/);
                if (match) asin = match[1];
              }
            }

            // Extract status
            let status: BookStatus = "draft";
            for (const selector of this.selectors.bookshelf.status) {
              const statusEl = await card.$(selector);
              if (statusEl) {
                const statusText = (await statusEl.textContent())?.toLowerCase().trim() || "";
                if (statusText.includes("live")) status = "live";
                else if (statusText.includes("review")) status = "in_review";
                else if (statusText.includes("draft")) status = "draft";
                else if (statusText.includes("unpublished")) status = "unpublished";
                else if (statusText.includes("blocked")) status = "blocked";
                if (statusText) break;
              }
            }

            // Extract formats - look for format indicators/icons
            const formats: BookFormat[] = [];
            const cardHtml = await card.innerHTML();
            if (cardHtml.includes("ebook") || cardHtml.includes("Kindle")) {
              formats.push("ebook");
            }
            if (cardHtml.includes("paperback") || cardHtml.includes("Paperback")) {
              formats.push("paperback");
            }
            if (cardHtml.includes("hardcover") || cardHtml.includes("Hardcover")) {
              formats.push("hardcover");
            }

            // Default to ebook if no formats detected
            if (formats.length === 0) {
              formats.push("ebook");
            }

            if (title && asin) {
              books.push({
                asin,
                title,
                author: "Unknown", // Not available on bookshelf cards
                status,
                formats,
                lastModified: new Date(), // Not available on bookshelf cards
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            Logger.warn(`Failed to extract book data from card: ${message}`);
          }
        }

        // Check for next page
        hasNextPage = false;
        for (const selector of this.selectors.bookshelf.nextButton) {
          const nextButton = await this.page.$(selector);
          if (nextButton) {
            const isDisabled = (await nextButton.getAttribute("disabled")) !== null ||
              (await nextButton.getAttribute("aria-disabled")) === "true";

            if (!isDisabled) {
              Logger.debug("Navigating to next page...");
              await nextButton.click();
              await this.page.waitForTimeout(2000); // Wait for page load
              hasNextPage = true;
              pageNum++;
              break;
            }
          }
        }
      }

      Logger.success(`Found ${books.length} books across ${pageNum} page(s)`);

      // Sort by last modified (most recent first)
      // Note: lastModified is placeholder; actual sorting would need real timestamps
      const sorted = books.sort((a, b) =>
        b.lastModified.getTime() - a.lastModified.getTime()
      );

      // Cache results
      this.bookListCache = {
        data: sorted,
        timestamp: Date.now(),
      };

      await this.takeScreenshot("bookshelf-scraped");

      return sorted;
    } catch (error) {
      await this.takeScreenshot("list-books-error");

      if (error instanceof Error && error.name === "KdpSessionExpiredError") {
        throw error;
      }

      const { KdpScrapingError } = await import("@brainrot/types");
      const message = error instanceof Error ? error.message : String(error);
      throw new KdpScrapingError(
        `Failed to list books: ${message}`,
        this.page?.url() || "unknown",
      );
    }
  }

  /**
   * Get detailed information for a specific book
   *
   * Navigates to the book's details page and extracts all metadata including
   * title, description, keywords, categories, and pricing information.
   *
   * @param asin - The book's Amazon Standard Identification Number
   * @returns Complete book details including pricing and metadata
   * @throws {KdpAuthenticationError} If not logged in or session expired
   * @throws {KdpScrapingError} If book details page fails to load or parse
   *
   * @example
   * const details = await kdp.getBookDetails('B0MOCK123');
   * console.log(`${details.title} - ${details.description.substring(0, 50)}...`);
   */
  async getBookDetails(asin: string): Promise<KdpBookDetails> {
    // Return mock data in mock mode
    if (this.config.mockMode) {
      Logger.info(`[MOCK] Getting details for book: ${asin}`);
      return {
        asin,
        title: "The Great Gatsby (Brainrot Edition)",
        subtitle: "no cap fr fr edition",
        author: "F. Scott Fitzgerald, trans. Brainrot Classics",
        status: "live" as BookStatus,
        formats: ["ebook" as BookFormat],
        description:
          "so back when i was a lil sus beta and way more vulnerable to getting absolutely ratio'd by life...",
        keywords: [
          "classic literature",
          "gen z",
          "brainrot",
          "gatsby",
          "american dream",
        ],
        categories: ["Literature & Fiction", "Classics"],
        pricing: [
          {
            marketplace: "US",
            currency: "USD",
            listPrice: 2.99,
            royaltyRate: 0.7,
          },
          {
            marketplace: "UK",
            currency: "GBP",
            listPrice: 1.99,
            royaltyRate: 0.7,
          },
        ],
        lastModified: new Date(),
      };
    }

    if (!this.page) {
      throw new Error("Not logged in. Call login() first.");
    }

    try {
      // Navigate to book details page
      const detailsUrl = `https://kdp.amazon.com/en_US/title-setup/${asin}`;
      Logger.debug(`Navigating to book details: ${detailsUrl}`);

      await this.page.goto(detailsUrl, {
        waitUntil: "networkidle",
        timeout: this.config.timeout,
      });

      // Check for 404 or invalid ASIN
      const pageTitle = await this.page.title();
      if (
        pageTitle.toLowerCase().includes("not found") ||
        pageTitle.toLowerCase().includes("404")
      ) {
        const { KdpScrapingError } = await import("@brainrot/types");
        throw new KdpScrapingError(
          `Book not found: ${asin}`,
          detailsUrl,
        );
      }

      // Check for session expiration
      if (this.page.url().includes("/signin") || this.page.url().includes("/ap/")) {
        const { KdpSessionExpiredError } = await import("@brainrot/types");
        throw new KdpSessionExpiredError();
      }

      // Helper to try multiple selectors and get value
      const getFieldValue = async (
        selectors: string[],
        fallback: string = "",
      ): Promise<string> => {
        for (const selector of selectors) {
          try {
            const element = await this.page!.$(selector);
            if (element) {
              const value = await element.inputValue().catch(() => null) ||
                (await element.textContent());
              if (value && value.trim()) {
                return value.trim();
              }
            }
          } catch {
            continue;
          }
        }
        return fallback;
      };

      // Extract title
      const title = await getFieldValue(
        this.selectors.bookDetails.title,
        "Unknown Title",
      );

      // Extract subtitle (optional)
      const subtitle = await getFieldValue(
        this.selectors.bookDetails.subtitle,
      );

      // Extract author
      const author = await getFieldValue(
        this.selectors.bookDetails.author,
        "Unknown Author",
      );

      // Extract description
      const description = await getFieldValue(
        this.selectors.bookDetails.description,
        "",
      );

      // Extract keywords
      const keywords: string[] = [];
      for (const selector of this.selectors.bookDetails.keywords) {
        try {
          const keywordElements = await this.page.$$(selector);
          for (const el of keywordElements) {
            const value = await el.inputValue().catch(() => "");
            if (value && value.trim()) {
              keywords.push(value.trim());
            }
          }
          if (keywords.length > 0) break;
        } catch {
          continue;
        }
      }

      // Extract categories (best effort - categories are complex)
      const categories: string[] = [];
      for (const selector of this.selectors.bookDetails.categories) {
        try {
          const categoryEl = await this.page.$(selector);
          if (categoryEl) {
            const text = await categoryEl.textContent();
            if (text) {
              // Split by common delimiters
              const cats = text
                .split(/[>\/,]/)
                .map((c) => c.trim())
                .filter((c) => c.length > 0);
              categories.push(...cats);
              if (categories.length > 0) break;
            }
          }
        } catch {
          continue;
        }
      }

      // Get basic book info (status, formats) from the current page
      const status: BookStatus = "live"; // Default, actual status detection would require more scraping
      const formats: BookFormat[] = ["ebook"]; // Default, would need format tab detection

      // Navigate to pricing tab to get pricing details
      let pricing: KdpBookDetails["pricing"] = [];

      try {
        // Try to find and click pricing tab
        let pricingTabClicked = false;
        for (const selector of this.selectors.bookDetails.pricingTab) {
          try {
            const tab = await this.page.$(selector);
            if (tab) {
              await tab.click();
              await this.page.waitForTimeout(1000); // Wait for tab to load
              pricingTabClicked = true;
              Logger.debug("Navigated to pricing tab");
              break;
            }
          } catch {
            continue;
          }
        }

        if (pricingTabClicked) {
          // Try to extract pricing from table
          for (const tableSelector of this.selectors.bookDetails.pricingTable) {
            try {
              const table = await this.page.$(tableSelector);
              if (table) {
                const rows = await this.page.$$(
                  this.selectors.bookDetails.marketplaceRow.join(", "),
                );

                for (const row of rows) {
                  try {
                    const marketplace = await row.getAttribute("data-marketplace") ||
                      await row.textContent();
                    const priceInput = await row.$('input[type="text"]');
                    const royaltySelect = await row.$("select");

                    if (priceInput && marketplace) {
                      const priceStr = await priceInput.inputValue();
                      const price = parseFloat(
                        priceStr.replace(/[^0-9.]/g, ""),
                      );

                      let royaltyRate: 0.35 | 0.7 = 0.7;
                      if (royaltySelect) {
                        const royaltyValue = await royaltySelect.inputValue();
                        if (royaltyValue.includes("35")) royaltyRate = 0.35;
                      }

                      // Infer currency from marketplace
                      const currencyMap: Record<string, string> = {
                        US: "USD",
                        UK: "GBP",
                        DE: "EUR",
                        FR: "EUR",
                        ES: "EUR",
                        IT: "EUR",
                        JP: "JPY",
                      };

                      const marketplaceCode = marketplace.trim().substring(0, 2).toUpperCase();
                      const currency = currencyMap[marketplaceCode] || "USD";

                      if (!isNaN(price) && price > 0) {
                        pricing.push({
                          marketplace: marketplaceCode,
                          currency,
                          listPrice: price,
                          royaltyRate,
                        });
                      }
                    }
                  } catch (rowError) {
                    Logger.debug(
                      `Failed to parse pricing row: ${rowError}`,
                    );
                  }
                }
                break;
              }
            } catch {
              continue;
            }
          }
        }
      } catch (pricingError) {
        Logger.debug(`Failed to extract pricing: ${pricingError}`);
        // Continue without pricing data
      }

      const bookDetails: KdpBookDetails = {
        asin,
        title,
        subtitle: subtitle || undefined,
        author,
        status,
        formats,
        description,
        keywords,
        categories,
        pricing,
        lastModified: new Date(),
      };

      Logger.success(`Retrieved details for: ${title}`);
      await this.takeScreenshot("book-details-scraped");

      return bookDetails;
    } catch (error) {
      await this.takeScreenshot("get-book-details-error");

      if (error instanceof Error && error.name === "KdpSessionExpiredError") {
        throw error;
      }

      if (error instanceof Error && error.name === "KdpScrapingError") {
        throw error;
      }

      const { KdpScrapingError } = await import("@brainrot/types");
      const message = error instanceof Error ? error.message : String(error);
      throw new KdpScrapingError(
        `Failed to get book details for ${asin}: ${message}`,
        this.page?.url() || "unknown",
      );
    }
  }
}

export default KdpService;
