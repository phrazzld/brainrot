import { chromium, Browser, Page, BrowserContext, Locator } from "playwright";
import path from "path";
import fs from "fs/promises";
import pRetry from "p-retry";
import { Logger } from "../utils/logger.js";
import inquirer from "inquirer";

interface KdpConfig {
  email: string;
  password: string;
  headless?: boolean;
  mockMode?: boolean;
  screenshotDir?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
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

interface SelectorStrategy {
  type: "role" | "label" | "text" | "css" | "testid";
  selector: string | { role?: string; name?: string | RegExp; [key: string]: any };
  description: string;
}

export class KdpService {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private config: KdpConfig;
  private screenshotCounter: number = 0;

  constructor(config: KdpConfig) {
    this.config = {
      headless: true,
      mockMode: false,
      screenshotDir: "screenshots",
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
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
   * Retry wrapper for operations with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    options?: { maxRetries?: number; baseDelay?: number }
  ): Promise<T> {
    if (this.config.mockMode) {
      return operation();
    }

    return pRetry(operation, {
      retries: options?.maxRetries ?? this.config.retryAttempts!,
      factor: 2,
      minTimeout: options?.baseDelay ?? this.config.retryDelay!,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        Logger.warn(`${context} attempt ${error.attemptNumber} failed: ${error.message}`);
        const maxRetries = options?.maxRetries ?? this.config.retryAttempts!;
        const remainingAttempts = maxRetries - error.attemptNumber + 1;
        if (error.attemptNumber < maxRetries) {
          Logger.info(`Retrying in ${remainingAttempts} attempts...`);
        }
      }
    });
  }

  /**
   * Find element with multiple selector fallbacks for resilience
   */
  private async findElementWithFallbacks(
    strategies: SelectorStrategy[],
    context: string = "element"
  ): Promise<Locator> {
    if (this.config.mockMode || !this.page) {
      throw new Error("Page not initialized");
    }

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      try {
        let locator: Locator;
        
        switch (strategy.type) {
          case "role":
            const roleConfig = strategy.selector as { role: string; name?: string | RegExp };
            locator = this.page.getByRole(roleConfig.role as any, { 
              name: roleConfig.name,
              exact: false 
            });
            break;
          case "label":
            locator = this.page.getByLabel(strategy.selector as string, { exact: false });
            break;
          case "text":
            locator = this.page.getByText(strategy.selector as string, { exact: false });
            break;
          case "testid":
            locator = this.page.getByTestId(strategy.selector as string);
            break;
          case "css":
          default:
            locator = this.page.locator(strategy.selector as string);
            break;
        }
        
        // Wait for element to be visible with short timeout
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        
        Logger.debug(`${context} found using ${strategy.type} selector: ${strategy.description}`);
        return locator;
        
      } catch (error) {
        Logger.debug(`${context} selector strategy ${i + 1}/${strategies.length} failed (${strategy.type}: ${strategy.description}): ${error instanceof Error ? error.message : String(error)}`);
        
        // If this is the last strategy, take screenshot and throw
        if (i === strategies.length - 1) {
          await this.takeScreenshot(`selector-failure-${context.replace(/\s+/g, '-')}`);
          throw new Error(`All ${strategies.length} selector strategies failed for ${context}`);
        }
        
        continue;
      }
    }
    
    throw new Error(`Unexpected error in findElementWithFallbacks for ${context}`);
  }

  /**
   * Create checkpoint for recovery
   */
  private async createCheckpoint(name: string): Promise<void> {
    if (this.config.mockMode) {
      Logger.info(`[MOCK] Checkpoint created: ${name}`);
      return;
    }

    await this.takeScreenshot(`checkpoint-${name}`);
    const url = this.page?.url() || 'unknown';
    const title = await this.page?.title().catch(() => 'unknown') || 'unknown';
    
    Logger.debug(`Checkpoint '${name}': URL=${url}, Title=${title}`);
  }

  /**
   * Resilient click with retries
   */
  private async resilientClick(strategies: SelectorStrategy[], context: string): Promise<void> {
    await this.withRetry(async () => {
      const element = await this.findElementWithFallbacks(strategies, context);
      await element.click();
    }, `Click ${context}`);
  }

  /**
   * Resilient fill with retries
   */
  private async resilientFill(strategies: SelectorStrategy[], value: string, context: string): Promise<void> {
    await this.withRetry(async () => {
      const element = await this.findElementWithFallbacks(strategies, context);
      await element.clear();
      await element.fill(value);
    }, `Fill ${context}`);
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

      // Click Sign In button with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "link", name: /sign.?in/i }, description: "Sign In link by role" },
        { type: "text", selector: "Sign in", description: "Sign In text" },
        { type: "css", selector: 'a[data-action="sign-in-button"]', description: "Sign In data-action" },
        { type: "css", selector: 'a[href*="signin"]', description: "Sign In href" }
      ], "Sign In button");

      await this.createCheckpoint("sign-in-clicked");

      // Enter email with resilient selectors
      await this.resilientFill([
        { type: "label", selector: "Email", description: "Email label" },
        { type: "role", selector: { role: "textbox", name: /email/i }, description: "Email textbox role" },
        { type: "css", selector: 'input[type="email"]', description: "Email input type" },
        { type: "css", selector: 'input[name="email"]', description: "Email input name" }
      ], this.config.email, "email field");

      // Click Continue button
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /continue/i }, description: "Continue button role" },
        { type: "text", selector: "Continue", description: "Continue text" },
        { type: "css", selector: "input#continue", description: "Continue ID" },
        { type: "css", selector: 'input[type="submit"]', description: "Submit input" }
      ], "Continue button");

      await this.createCheckpoint("email-submitted");

      // Enter password with resilient selectors
      await this.resilientFill([
        { type: "label", selector: "Password", description: "Password label" },
        { type: "role", selector: { role: "textbox", name: /password/i }, description: "Password textbox role" },
        { type: "css", selector: 'input[type="password"]', description: "Password input type" },
        { type: "css", selector: 'input[name="password"]', description: "Password input name" }
      ], this.config.password, "password field");

      // Click Sign In submit button
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /sign.?in/i }, description: "Sign In submit button role" },
        { type: "text", selector: "Sign-In", description: "Sign-In text" },
        { type: "css", selector: "input#signInSubmit", description: "Sign In submit ID" },
        { type: "css", selector: 'input[value*="Sign"]', description: "Sign In submit value" }
      ], "Sign In submit button");

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
      // Click "Create" button with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "link", name: /create/i }, description: "Create link by role" },
        { type: "text", selector: "Create", description: "Create text" },
        { type: "css", selector: 'a[href*="create"]', description: "Create href" },
        { type: "css", selector: 'a:has-text("Create")', description: "Create has-text" }
      ], "Create button");

      await this.createCheckpoint("create-clicked");

      // Select Kindle eBook or Paperback with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /kindle.?ebook/i }, description: "Kindle eBook button role" },
        { type: "text", selector: "Kindle eBook", description: "Kindle eBook text" },
        { type: "css", selector: '[data-testid="kindle-ebook"]', description: "Kindle eBook data-testid" },
        { type: "css", selector: 'button:has-text("Kindle eBook")', description: "Kindle eBook button has-text" }
      ], "Kindle eBook option");

      await this.createCheckpoint("kindle-ebook-selected");

      // Wait for book details form with resilient selectors
      await this.withRetry(async () => {
        const titleField = await this.findElementWithFallbacks([
          { type: "label", selector: "Title", description: "Title label" },
          { type: "role", selector: { role: "textbox", name: /title/i }, description: "Title textbox role" },
          { type: "css", selector: 'input[name="title"]', description: "Title input name" },
          { type: "css", selector: 'input[placeholder*="title"]', description: "Title placeholder" }
        ], "title field");
        
        await titleField.waitFor({ state: 'visible', timeout: 5000 });
      }, "Wait for book details form");

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
      // Title with resilient selectors
      await this.resilientFill([
        { type: "label", selector: "Title", description: "Title label" },
        { type: "role", selector: { role: "textbox", name: /title/i }, description: "Title textbox role" },
        { type: "css", selector: 'input[name="title"]', description: "Title input name" },
        { type: "css", selector: 'input[placeholder*="title"]', description: "Title placeholder" }
      ], details.title, "title field");

      // Subtitle (if provided) with resilient selectors
      if (details.subtitle) {
        await this.resilientFill([
          { type: "label", selector: "Subtitle", description: "Subtitle label" },
          { type: "role", selector: { role: "textbox", name: /subtitle/i }, description: "Subtitle textbox role" },
          { type: "css", selector: 'input[name="subtitle"]', description: "Subtitle input name" },
          { type: "css", selector: 'input[placeholder*="subtitle"]', description: "Subtitle placeholder" }
        ], details.subtitle, "subtitle field");
      }

      // Author with resilient selectors
      await this.resilientFill([
        { type: "label", selector: "Author", description: "Author label" },
        { type: "role", selector: { role: "textbox", name: /author/i }, description: "Author textbox role" },
        { type: "css", selector: 'input[name="author"]', description: "Author input name" },
        { type: "css", selector: 'input[placeholder*="author"]', description: "Author placeholder" }
      ], details.author, "author field");

      // Description with resilient selectors
      await this.resilientFill([
        { type: "label", selector: "Description", description: "Description label" },
        { type: "role", selector: { role: "textbox", name: /description/i }, description: "Description textbox role" },
        { type: "css", selector: 'textarea[name="description"]', description: "Description textarea name" },
        { type: "css", selector: 'textarea[placeholder*="description"]', description: "Description placeholder" }
      ], details.description, "description field");

      // Keywords (up to 7) with resilient approach
      const keywordPromises: Promise<void>[] = [];
      for (let i = 0; i < Math.min(details.keywords.length, 7); i++) {
        keywordPromises.push(
          this.resilientFill([
            { type: "css", selector: `input[name="keyword${i + 1}"]`, description: `Keyword ${i + 1} name` },
            { type: "css", selector: `input[name^="keyword"]:nth-of-type(${i + 1})`, description: `Keyword ${i + 1} nth-type` },
            { type: "css", selector: `input[placeholder*="keyword"]:nth-of-type(${i + 1})`, description: `Keyword ${i + 1} placeholder` }
          ], details.keywords[i], `keyword ${i + 1} field`)
        );
      }
      await Promise.all(keywordPromises);

      // Categories with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /choose.?categories/i }, description: "Choose categories button role" },
        { type: "text", selector: "Choose categories", description: "Choose categories text" },
        { type: "css", selector: 'button[data-testid="choose-categories"]', description: "Choose categories data-testid" },
        { type: "css", selector: 'button:has-text("Choose categories")', description: "Choose categories has-text" }
      ], "Choose categories button");

      await this.createCheckpoint("categories-opened");

      // Category selection - simplified save for now
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /save/i }, description: "Save categories button role" },
        { type: "text", selector: "Save", description: "Save categories text" },
        { type: "css", selector: 'button[type="submit"]', description: "Save categories submit" },
        { type: "css", selector: 'button:has-text("Save")', description: "Save categories has-text" }
      ], "Save categories button");

      // Language (if provided) with resilient selectors
      if (details.language) {
        await this.withRetry(async () => {
          const languageSelect = await this.findElementWithFallbacks([
            { type: "label", selector: "Language", description: "Language label" },
            { type: "role", selector: { role: "combobox", name: /language/i }, description: "Language combobox role" },
            { type: "css", selector: 'select[name="language"]', description: "Language select name" },
            { type: "css", selector: 'select[data-testid="language"]', description: "Language select data-testid" }
          ], "language select");
          
          if (details.language) {
            await languageSelect.selectOption(details.language);
          }
        }, "Select language");
      }

      // ISBN (if provided) with resilient selectors
      if (details.isbn) {
        await this.resilientFill([
          { type: "label", selector: "ISBN", description: "ISBN label" },
          { type: "role", selector: { role: "textbox", name: /isbn/i }, description: "ISBN textbox role" },
          { type: "css", selector: 'input[name="isbn"]', description: "ISBN input name" },
          { type: "css", selector: 'input[placeholder*="isbn"]', description: "ISBN placeholder" }
        ], details.isbn, "ISBN field");
      }

      // Publishing rights with resilient selectors
      if (details.publishingRights === "worldwide") {
        await this.resilientClick([
          { type: "role", selector: { role: "radio", name: /worldwide/i }, description: "Worldwide radio role" },
          { type: "css", selector: 'input[value="all_territories"]', description: "All territories value" },
          { type: "css", selector: 'input[type="radio"][name="territories"]', description: "Territories radio" }
        ], "Worldwide publishing rights");
      } else {
        await this.resilientClick([
          { type: "role", selector: { role: "radio", name: /specific/i }, description: "Specific territories radio role" },
          { type: "css", selector: 'input[value="specific_territories"]', description: "Specific territories value" },
          { type: "css", selector: 'input[type="radio"][name="territories"]:last-of-type', description: "Specific territories radio" }
        ], "Specific territories publishing rights");
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
      // Click upload button with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /upload.?manuscript/i }, description: "Upload manuscript button role" },
        { type: "text", selector: "Upload manuscript", description: "Upload manuscript text" },
        { type: "css", selector: 'button[data-testid="upload-manuscript"]', description: "Upload manuscript data-testid" },
        { type: "css", selector: 'button:has-text("Upload manuscript")', description: "Upload manuscript has-text" }
      ], "Upload manuscript button");

      await this.createCheckpoint("upload-button-clicked");

      // Find and use file input with resilient approach
      await this.withRetry(async () => {
        const fileInputStrategies: SelectorStrategy[] = [
          { type: "css", selector: `input[type="file"][accept*="${manuscript.format}"]`, description: `File input for ${manuscript.format}` },
          { type: "css", selector: 'input[type="file"][accept*="epub"]', description: "EPUB file input" },
          { type: "css", selector: 'input[type="file"][accept*="pdf"]', description: "PDF file input" },
          { type: "css", selector: 'input[type="file"]', description: "Generic file input" }
        ];

        const fileInput = await this.findElementWithFallbacks(fileInputStrategies, "file input");
        await fileInput.setInputFiles(manuscript.filePath);
        Logger.info(`Uploading ${manuscript.format.toUpperCase()} manuscript: ${path.basename(manuscript.filePath)}`);
      }, "Set manuscript file input");

      // Wait for upload to complete with resilient selectors
      await this.withRetry(async () => {
        const uploadCompleteElement = await this.findElementWithFallbacks([
          { type: "text", selector: "Upload complete", description: "Upload complete text" },
          { type: "text", selector: "Uploaded successfully", description: "Uploaded successfully text" },
          { type: "css", selector: '[data-testid="upload-complete"]', description: "Upload complete data-testid" },
          { type: "css", selector: '.upload-status.success', description: "Upload success class" }
        ], "upload complete indicator");
        
        await uploadCompleteElement.waitFor({ state: 'visible', timeout: 60000 });
      }, "Wait for upload completion");

      // Wait for processing with resilient selectors
      await this.withRetry(async () => {
        const processingCompleteElement = await this.findElementWithFallbacks([
          { type: "text", selector: "Processing complete", description: "Processing complete text" },
          { type: "text", selector: "Ready to publish", description: "Ready to publish text" },
          { type: "css", selector: '[data-testid="processing-complete"]', description: "Processing complete data-testid" },
          { type: "css", selector: '.processing-status.complete', description: "Processing complete class" }
        ], "processing complete indicator");
        
        await processingCompleteElement.waitFor({ state: 'visible', timeout: 120000 });
      }, "Wait for processing completion");

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
      // Click upload cover button with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /upload.?cover/i }, description: "Upload cover button role" },
        { type: "text", selector: "Upload cover", description: "Upload cover text" },
        { type: "css", selector: 'button[data-testid="upload-cover"]', description: "Upload cover data-testid" },
        { type: "css", selector: 'button:has-text("Upload cover")', description: "Upload cover has-text" }
      ], "Upload cover button");

      await this.createCheckpoint("cover-upload-button-clicked");

      // Set file input with resilient approach
      await this.withRetry(async () => {
        const fileInput = await this.findElementWithFallbacks([
          { type: "css", selector: 'input[type="file"][accept*="image"]', description: "Image file input" },
          { type: "css", selector: 'input[type="file"][accept*="jpg"]', description: "JPG file input" },
          { type: "css", selector: 'input[type="file"][accept*="jpeg"]', description: "JPEG file input" },
          { type: "css", selector: 'input[type="file"][accept*="png"]', description: "PNG file input" },
          { type: "css", selector: 'input[type="file"]', description: "Generic file input" }
        ], "cover file input");

        await fileInput.setInputFiles(cover.filePath);
        Logger.info(`Uploading cover: ${path.basename(cover.filePath)}`);
      }, "Set cover file input");

      // Wait for upload to complete with resilient selectors
      await this.withRetry(async () => {
        const uploadCompleteElement = await this.findElementWithFallbacks([
          { type: "text", selector: "Cover uploaded", description: "Cover uploaded text" },
          { type: "text", selector: "Upload complete", description: "Upload complete text" },
          { type: "text", selector: "Cover ready", description: "Cover ready text" },
          { type: "css", selector: '[data-testid="cover-upload-complete"]', description: "Cover upload complete data-testid" },
          { type: "css", selector: '.cover-upload-status.success', description: "Cover upload success class" }
        ], "cover upload complete indicator");
        
        await uploadCompleteElement.waitFor({ state: 'visible', timeout: 60000 });
      }, "Wait for cover upload completion");

      // Check for dimension warnings with resilient selectors
      try {
        const warningElements = await this.page.locator("text=/dimension|resolution|quality/i").all();
        if (warningElements.length > 0) {
          Logger.warn("Cover may have dimension or quality issues");
          for (const warning of warningElements) {
            const warningText = await warning.textContent();
            Logger.debug(`Cover warning: ${warningText}`);
          }
        }
      } catch (warningError) {
        Logger.debug("Could not check for cover warnings - proceeding anyway");
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
      // Navigate to pricing section with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /pricing/i }, description: "Pricing button role" },
        { type: "text", selector: "Pricing", description: "Pricing text" },
        { type: "css", selector: 'button[data-testid="pricing"]', description: "Pricing data-testid" },
        { type: "css", selector: 'button:has-text("Pricing")', description: "Pricing has-text" }
      ], "Pricing section button");

      await this.createCheckpoint("pricing-section-opened");

      // KDP Select enrollment with resilient selectors
      if (pricing.kdpSelect !== undefined) {
        await this.withRetry(async () => {
          const kdpSelectCheckbox = await this.findElementWithFallbacks([
            { type: "label", selector: "KDP Select", description: "KDP Select label" },
            { type: "role", selector: { role: "checkbox", name: /kdp.?select/i }, description: "KDP Select checkbox role" },
            { type: "css", selector: 'input[name="kdp_select"]', description: "KDP Select name" },
            { type: "css", selector: 'input[type="checkbox"][data-testid="kdp-select"]', description: "KDP Select data-testid" }
          ], "KDP Select checkbox");

          if (pricing.kdpSelect) {
            await kdpSelectCheckbox.check();
          } else {
            await kdpSelectCheckbox.uncheck();
          }
        }, "Set KDP Select option");
      }

      // Royalty option with resilient selectors
      if (pricing.royaltyOption === "70%") {
        await this.resilientClick([
          { type: "role", selector: { role: "radio", name: /70/i }, description: "70% royalty radio role" },
          { type: "css", selector: 'input[value="70"]', description: "70% royalty value" },
          { type: "css", selector: 'input[type="radio"][data-value="70"]', description: "70% royalty data-value" }
        ], "70% royalty option");
      } else {
        await this.resilientClick([
          { type: "role", selector: { role: "radio", name: /35/i }, description: "35% royalty radio role" },
          { type: "css", selector: 'input[value="35"]', description: "35% royalty value" },
          { type: "css", selector: 'input[type="radio"][data-value="35"]', description: "35% royalty data-value" }
        ], "35% royalty option");
      }

      // Set price for each marketplace with resilient approach
      for (const marketplace of pricing.marketplaces) {
        await this.withRetry(async () => {
          const priceInput = await this.findElementWithFallbacks([
            { type: "label", selector: `Price (${marketplace.toUpperCase()})`, description: `${marketplace} price label` },
            { type: "css", selector: `input[name="price_${marketplace}"]`, description: `${marketplace} price name` },
            { type: "css", selector: `input[data-marketplace="${marketplace}"]`, description: `${marketplace} price data-marketplace` },
            { type: "css", selector: `input[placeholder*="${marketplace}"]`, description: `${marketplace} price placeholder` }
          ], `${marketplace} price input`);

          await priceInput.clear();
          await priceInput.fill(pricing.price.toString());
        }, `Set ${marketplace} price`);
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
      // Click save as draft with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /save.?as.?draft/i }, description: "Save as draft button role" },
        { type: "text", selector: "Save as Draft", description: "Save as draft text" },
        { type: "css", selector: 'button[data-testid="save-draft"]', description: "Save as draft data-testid" },
        { type: "css", selector: 'button:has-text("Save as Draft")', description: "Save as draft has-text" }
      ], "Save as draft button");

      await this.createCheckpoint("draft-save-clicked");

      // Wait for confirmation with resilient selectors
      await this.withRetry(async () => {
        const confirmationElement = await this.findElementWithFallbacks([
          { type: "text", selector: "Draft saved", description: "Draft saved text" },
          { type: "text", selector: "Saved successfully", description: "Saved successfully text" },
          { type: "css", selector: '[data-testid="draft-saved"]', description: "Draft saved data-testid" },
          { type: "css", selector: '.save-status.success', description: "Save success class" }
        ], "draft saved confirmation");
        
        await confirmationElement.waitFor({ state: 'visible', timeout: 30000 });
      }, "Wait for draft save confirmation");

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
      // Click publish button with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /publish.?your.?kindle.?ebook/i }, description: "Publish Kindle eBook button role" },
        { type: "text", selector: "Publish Your Kindle eBook", description: "Publish Kindle eBook text" },
        { type: "css", selector: 'button[data-testid="publish-ebook"]', description: "Publish eBook data-testid" },
        { type: "css", selector: 'button:has-text("Publish Your Kindle eBook")', description: "Publish Kindle eBook has-text" }
      ], "Publish Kindle eBook button");

      await this.createCheckpoint("publish-button-clicked");

      // Confirm publishing with resilient selectors
      await this.resilientClick([
        { type: "role", selector: { role: "button", name: /^publish$/i }, description: "Publish confirmation button role" },
        { type: "text", selector: "Publish", description: "Publish confirmation text" },
        { type: "css", selector: 'button[data-testid="confirm-publish"]', description: "Confirm publish data-testid" },
        { type: "css", selector: 'button:has-text("Publish"):not(:has-text("Your"))', description: "Publish confirmation has-text" }
      ], "Publish confirmation button");

      await this.createCheckpoint("publish-confirmed");

      // Wait for publishing confirmation with resilient selectors
      await this.withRetry(async () => {
        const liveElement = await this.findElementWithFallbacks([
          { type: "text", selector: "Your book is live", description: "Book is live text" },
          { type: "text", selector: "Successfully published", description: "Successfully published text" },
          { type: "text", selector: "Book published", description: "Book published text" },
          { type: "css", selector: '[data-testid="book-published"]', description: "Book published data-testid" },
          { type: "css", selector: '.publish-status.live', description: "Book live status class" }
        ], "book published confirmation");
        
        await liveElement.waitFor({ state: 'visible', timeout: 300000 });
      }, "Wait for book publishing confirmation");

      // Extract ASIN with resilient approach
      let asin = "unknown";
      try {
        const asinElement = await this.findElementWithFallbacks([
          { type: "text", selector: /ASIN:\s*(B[0-9A-Z]+)/i, description: "ASIN text" },
          { type: "css", selector: '[data-testid="book-asin"]', description: "ASIN data-testid" },
          { type: "css", selector: '.book-asin', description: "ASIN class" }
        ], "ASIN element");
        
        const text = await asinElement.textContent();
        const match = text?.match(/B[0-9A-Z]+/);
        if (match) {
          asin = match[0];
        }
      } catch {
        Logger.debug("Could not extract ASIN - proceeding with unknown");
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
}

export default KdpService;
