import { chromium, Browser, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../utils/logger.js';
import inquirer from 'inquirer';

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
  publishingRights?: 'worldwide' | 'territories';
  territories?: string[];
}

interface ManuscriptDetails {
  filePath: string;
  format: 'pdf' | 'epub' | 'docx';
}

interface CoverDetails {
  filePath: string;
  format: 'jpg' | 'tiff';
}

interface PricingDetails {
  price: number;
  currency: string;
  marketplaces: string[];
  royaltyOption: '35%' | '70%';
  kdpSelect?: boolean;
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
      screenshotDir: 'screenshots',
      timeout: 30000,
      ...config
    };
  }

  /**
   * Initialize browser and context
   */
  private async initBrowser(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info('[MOCK] Browser initialized');
      return;
    }

    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: ['--disable-blink-features=AutomationControlled']
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    this.page = await this.context.newPage();
    
    // Set default timeout
    this.page.setDefaultTimeout(this.config.timeout || 30000);

    Logger.debug('Browser initialized successfully');
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info('[MOCK] Browser closed');
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
        `${this.screenshotCounter++}-${name}.png`
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
      Logger.info('[MOCK] Logged in to KDP successfully');
      return;
    }

    await this.initBrowser();
    
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      Logger.info('Navigating to KDP login page...');
      await this.page.goto('https://kdp.amazon.com/', { waitUntil: 'networkidle' });
      
      // Click Sign In button
      await this.page.click('a[data-action="sign-in-button"]');
      
      // Enter email
      await this.page.fill('input[type="email"]', this.config.email);
      await this.page.click('input#continue');
      
      // Enter password
      await this.page.fill('input[type="password"]', this.config.password);
      await this.page.click('input#signInSubmit');
      
      // Check for 2FA
      if (await this.page.isVisible('text="Two-Step Verification"', { timeout: 5000 }).catch(() => false)) {
        Logger.info('2FA required. Please check your authentication method.');
        
        // Handle OTP input
        if (await this.page.isVisible('input#auth-mfa-otpcode')) {
          const { otp } = await inquirer.prompt([
            {
              type: 'input',
              name: 'otp',
              message: 'Enter your 2FA code:',
              validate: (input) => /^\d{6}$/.test(input) || 'Please enter a valid 6-digit code'
            }
          ]);
          
          await this.page.fill('input#auth-mfa-otpcode', otp);
          await this.page.click('input#auth-signin-button');
        }
        
        // Handle SMS/Call verification
        if (await this.page.isVisible('text="Get OTP on SMS"')) {
          await this.page.click('text="Get OTP on SMS"');
          
          const { smsCode } = await inquirer.prompt([
            {
              type: 'input',
              name: 'smsCode',
              message: 'Enter the code sent to your phone:',
              validate: (input) => /^\d{6}$/.test(input) || 'Please enter a valid 6-digit code'
            }
          ]);
          
          await this.page.fill('input[name="otpCode"]', smsCode);
          await this.page.click('input[type="submit"]');
        }
      }
      
      // Wait for dashboard to load
      await this.page.waitForSelector('text="Bookshelf"', { timeout: 30000 });
      Logger.success('Successfully logged in to KDP');
      
      await this.takeScreenshot('login-success');
    } catch (error) {
      await this.takeScreenshot('login-error');
      throw new Error(`Login failed: ${error}`);
    }
  }

  /**
   * Navigate to new book creation page
   */
  async navigateToNewBook(): Promise<void> {
    if (this.config.mockMode) {
      Logger.info('[MOCK] Navigated to new book page');
      return;
    }

    if (!this.page) {
      throw new Error('Not logged in. Please call login() first.');
    }

    try {
      // Click "Create" button
      await this.page.click('a:has-text("Create")');
      
      // Select Kindle eBook or Paperback
      await this.page.click('button:has-text("Kindle eBook")');
      
      // Wait for book details form
      await this.page.waitForSelector('input[name="title"]');
      
      Logger.info('Navigated to new book creation page');
      await this.takeScreenshot('new-book-page');
    } catch (error) {
      await this.takeScreenshot('navigate-error');
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
      throw new Error('Not on book creation page. Please navigate first.');
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
        await this.page.selectOption('select[name="language"]', details.language);
      }
      
      // ISBN (if provided)
      if (details.isbn) {
        await this.page.fill('input[name="isbn"]', details.isbn);
      }
      
      // Publishing rights
      if (details.publishingRights === 'worldwide') {
        await this.page.check('input[value="all_territories"]');
      } else {
        await this.page.check('input[value="specific_territories"]');
        // Territory selection would require additional logic
      }
      
      Logger.info('Book details filled successfully');
      await this.takeScreenshot('book-details-filled');
    } catch (error) {
      await this.takeScreenshot('fill-details-error');
      throw new Error(`Failed to fill book details: ${error}`);
    }
  }

  /**
   * Upload manuscript file
   */
  async uploadManuscript(manuscript: ManuscriptDetails): Promise<void> {
    if (this.config.mockMode) {
      Logger.info(`[MOCK] Uploaded manuscript: ${path.basename(manuscript.filePath)}`);
      return;
    }

    if (!this.page) {
      throw new Error('Not on book creation page.');
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
      await this.page.waitForSelector('text="Upload complete"', { timeout: 60000 });
      
      // Wait for processing
      await this.page.waitForSelector('text="Processing complete"', { timeout: 120000 });
      
      Logger.info('Manuscript uploaded and processed successfully');
      await this.takeScreenshot('manuscript-uploaded');
    } catch (error) {
      await this.takeScreenshot('upload-manuscript-error');
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
      throw new Error('Not on book creation page.');
    }

    try {
      // Click upload cover button
      await this.page.click('button:has-text("Upload cover")');
      
      // Set file input
      const fileInput = await this.page.$('input[type="file"][accept*="image"]');
      if (fileInput) {
        await fileInput.setInputFiles(cover.filePath);
      }
      
      // Wait for upload to complete
      await this.page.waitForSelector('text="Cover uploaded"', { timeout: 60000 });
      
      // Check for dimension warnings
      const warnings = await this.page.$$('text=/dimension|resolution|quality/i');
      if (warnings.length > 0) {
        Logger.warn('Cover may have dimension or quality issues');
      }
      
      Logger.info('Cover uploaded successfully');
      await this.takeScreenshot('cover-uploaded');
    } catch (error) {
      await this.takeScreenshot('upload-cover-error');
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
      throw new Error('Not on book creation page.');
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
      if (pricing.royaltyOption === '70%') {
        await this.page.click('input[value="70"]');
      } else {
        await this.page.click('input[value="35"]');
      }
      
      // Set price for each marketplace
      for (const marketplace of pricing.marketplaces) {
        const priceInput = await this.page.$(`input[name="price_${marketplace}"]`);
        if (priceInput) {
          await priceInput.fill(pricing.price.toString());
        }
      }
      
      Logger.info('Pricing and rights configured successfully');
      await this.takeScreenshot('pricing-set');
    } catch (error) {
      await this.takeScreenshot('set-pricing-error');
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
      throw new Error('Not on book creation page.');
    }

    try {
      // Click save as draft
      await this.page.click('button:has-text("Save as Draft")');
      
      // Wait for confirmation
      await this.page.waitForSelector('text="Draft saved"');
      
      // Extract book ID from URL or page
      const url = this.page.url();
      const bookIdMatch = url.match(/book[iI]d=([^&]+)/);
      const bookId = bookIdMatch ? bookIdMatch[1] : 'unknown';
      
      Logger.info(`Book saved as draft: ${bookId}`);
      await this.takeScreenshot('draft-saved');
      
      return bookId;
    } catch (error) {
      await this.takeScreenshot('save-draft-error');
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
      throw new Error('Not on book creation page.');
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
      await this.page.waitForSelector('text="Your book is live"', { timeout: 300000 });
      
      // Extract ASIN
      const asinElement = await this.page.$('text=/ASIN: (B[0-9A-Z]{9})/');
      let asin = 'unknown';
      if (asinElement) {
        const text = await asinElement.textContent();
        const match = text?.match(/B[0-9A-Z]{9}/);
        if (match) {
          asin = match[0];
        }
      }
      
      Logger.success(`Book published successfully! ASIN: ${asin}`);
      await this.takeScreenshot('book-published');
      
      return asin;
    } catch (error) {
      await this.takeScreenshot('publish-error');
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
    publish: boolean = false
  ): Promise<{ bookId: string; asin?: string }> {
    if (this.config.mockMode) {
      Logger.info('[MOCK] Starting complete book publishing workflow');
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