# TODO

## 🎯 KDP Account Management CLI - Phase 1 MVP

**Goal:** Read-only operations to check status of published books via CLI
**Files:** `apps/publisher/src/services/kdp.ts`, `apps/publisher/src/commands/kdp.ts`
**Success criteria:** Can list all books, view details, and check sales data without manual KDP login

### 1. Type Definitions & Data Structures

- [x] Create `packages/@brainrot/types/src/kdp.ts` with core KDP domain types
  ```typescript
  export type BookStatus = 'draft' | 'in_review' | 'live' | 'unpublished' | 'blocked';
  export type BookFormat = 'ebook' | 'paperback' | 'hardcover';

  export interface KdpBook {
    asin: string;
    title: string;
    author: string;
    status: BookStatus;
    formats: BookFormat[];
    publishedDate?: Date;
    lastModified: Date;
  }

  export interface KdpBookDetails extends KdpBook {
    subtitle?: string;
    description: string;
    keywords: string[];
    categories: string[];
    pricing: MarketplacePricing[];
    salesRank?: number;
  }

  export interface MarketplacePricing {
    marketplace: string; // 'US', 'UK', 'DE', etc.
    currency: string;
    listPrice: number;
    royaltyRate: 0.35 | 0.70;
  }

  export interface SalesData {
    asin: string;
    date: Date;
    marketplace: string;
    unitsOrdered: number;
    royalty: number;
    currency: string;
    kenpRead?: number;
    kenpRoyalty?: number;
  }
  ```
  Note: Export from `packages/@brainrot/types/src/index.ts` for monorepo access

- [x] Add KDP-specific error types to `packages/@brainrot/types/src/errors.ts`
  ```typescript
  export class KdpAuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'KdpAuthenticationError';
    }
  }

  export class KdpScrapingError extends Error {
    constructor(message: string, public readonly url: string) {
      super(message);
      this.name = 'KdpScrapingError';
    }
  }

  export class KdpSessionExpiredError extends Error {
    constructor() {
      super('KDP session expired. Please login again.');
      this.name = 'KdpSessionExpiredError';
    }
  }
  ```

### 2. Browser Automation - Book Listing

- [x] Implement `KdpService.listBooks()` in `apps/publisher/src/services/kdp.ts`
  - Navigate to `https://kdp.amazon.com/bookshelf` after successful login
  - Wait for bookshelf grid to load: `await page.waitForSelector('[data-testid="book-card"]', { timeout: 30000 })`
  - Extract book cards using: `const cards = await page.$$('[data-testid="book-card"]')`
  - For each card, extract: ASIN (from data attributes or href), title (h3 text), status (badge text), formats (icon presence)
  - Handle pagination: Check for "Next" button, iterate until no more pages
  - Return `KdpBook[]` array sorted by lastModified desc
  - Success criteria: Returns correct count of books matching KDP dashboard, includes all visible metadata fields
  - Error handling: Screenshot on failure, throw `KdpScrapingError` with URL and selector details

- [x] Implement `KdpService.navigateToBookshelf()` helper method
  - Check if already on bookshelf page: `page.url().includes('/bookshelf')`
  - If not, click bookshelf link: `await page.click('a[href*="/bookshelf"]')`
  - Wait for grid load: `await page.waitForSelector('[data-testid="book-card"]')`
  - Handle redirect if login expired: Detect login page, throw `KdpSessionExpiredError`
  - Success criteria: Page URL contains '/bookshelf' and book cards are visible

- [x] Add caching layer for `listBooks()` results
  - Create simple in-memory cache with 5-minute TTL: `private bookListCache: { data: KdpBook[], timestamp: number } | null`
  - Check cache before scraping: `if (this.bookListCache && Date.now() - this.bookListCache.timestamp < 5 * 60 * 1000)`
  - Add `--no-cache` option to force refresh
  - Success criteria: Second call within 5 minutes returns instantly without page navigation

### 3. Browser Automation - Book Details

- [x] Implement `KdpService.getBookDetails(asin: string)` in `apps/publisher/src/services/kdp.ts`
  - Navigate to book details page: `await page.goto(\`https://kdp.amazon.com/en_US/title-setup/${asin}\`)`
  - Extract metadata fields:
    - Title/subtitle: Multiple selector strategies with fallbacks
    - Description: Extracted from textarea with multiple selector options
    - Keywords: Iterate through keyword inputs (up to 7)
    - Categories: Best-effort parsing from category display
  - Extract pricing: Navigate to pricing tab, scrape marketplace pricing table rows with currency mapping
  - Extract formats: Defaulted (real implementation would need format tab detection)
  - Return complete `KdpBookDetails` object
  - Success criteria: All fields populated, matches data visible in KDP UI
  - Error handling: 404 detection, session expiration, screenshots on failure, proper error types

- [x] Add selector configuration object for maintainability
  - Extended `selectors` object with `bookDetails` section
  - Multiple selector strategies per field for resilience
  - Includes: title, subtitle, author, description, keywords, categories, pricing tab, pricing table, marketplace rows
  - Centralized location makes KDP UI changes easier to handle

### 4. Browser Automation - Sales Data

- [x] Implement `KdpService.getSalesData(asin: string, options?: { startDate?: Date, endDate?: Date })` in `apps/publisher/src/services/kdp.ts`
  - Navigate to reports section: `await page.goto('https://kdp.amazon.com/reports')`
  - Set date filter using date picker: `await page.fill('input[name="start-date"]', startDate.toISOString().split('T')[0])`
  - Filter by ASIN: Enter ASIN in search/filter field
  - Wait for table to update: `await page.waitForResponse(resp => resp.url().includes('/reports/data'))`
  - Scrape sales table rows: Extract date, marketplace, units, royalty, KENP data
  - Parse numeric values: Handle currency formatting, remove commas: `parseFloat(text.replace(/[$,]/g, ''))`
  - Return `SalesData[]` array sorted by date desc
  - Success criteria: Data matches KDP reports dashboard, includes all marketplaces
  - Performance note: Limit default to last 30 days to avoid long scraping times

- [x] Add report download fallback method `KdpService.downloadSalesReport()`
  - Click "Download" button: `await page.click('button:has-text("Download")')`
  - Wait for download: Use Playwright's `page.waitForEvent('download')` listener
  - Save CSV to temp directory: `const path = await download.path()`
  - Parse CSV using `csv-parse`: Extract same fields as scraping approach
  - Delete temp file after parsing
  - Success criteria: Returns same data structure as scraping method, works when table scraping fails
  - Use case: Backup method if table selectors change

### 5. CLI Commands - Book Management

- [x] Extend `apps/publisher/src/commands/kdp.ts` with `list` command
  ```typescript
  kdpCommand
    .command('list')
    .description('List all books in KDP account')
    .option('--format <format>', 'Output format: table|json|csv', 'table')
    .option('--status <status>', 'Filter by status: draft|live|all', 'all')
    .option('--no-cache', 'Force refresh from KDP')
    .action(async (options) => {
      const kdp = new KdpService({ /* config */ });
      await kdp.login();
      const books = await kdp.listBooks();

      // Filter by status if specified
      const filtered = options.status !== 'all'
        ? books.filter(b => b.status === options.status)
        : books;

      // Format output
      if (options.format === 'table') {
        console.table(filtered.map(b => ({
          ASIN: b.asin,
          Title: b.title.substring(0, 40),
          Status: b.status,
          Formats: b.formats.join(', '),
        })));
      } else if (options.format === 'json') {
        console.log(JSON.stringify(filtered, null, 2));
      } else if (options.format === 'csv') {
        console.log('asin,title,status,formats');
        filtered.forEach(b => {
          console.log(`${b.asin},"${b.title}",${b.status},"${b.formats.join(';')}"`);
        });
      }

      await kdp.close();
    });
  ```
  Success criteria: Displays all books in clean table format, JSON/CSV exports work correctly

- [x] Add `show` command for book details
  ```typescript
  kdpCommand
    .command('show <asin>')
    .description('Show detailed information for a specific book')
    .option('--format <format>', 'Output format: table|json', 'table')
    .action(async (asin: string, options) => {
      const kdp = new KdpService({ /* config */ });
      await kdp.login();
      const details = await kdp.getBookDetails(asin);

      if (options.format === 'table') {
        console.log('\n📖 Book Details\n');
        console.log(`ASIN:        ${details.asin}`);
        console.log(`Title:       ${details.title}`);
        console.log(`Author:      ${details.author}`);
        console.log(`Status:      ${details.status}`);
        console.log(`Formats:     ${details.formats.join(', ')}`);
        console.log(`Keywords:    ${details.keywords.join(', ')}`);
        console.log(`\n💰 Pricing\n`);
        details.pricing.forEach(p => {
          console.log(`${p.marketplace}: ${p.currency} ${p.listPrice} (${p.royaltyRate * 100}%)`);
        });
      } else {
        console.log(JSON.stringify(details, null, 2));
      }

      await kdp.close();
    });
  ```
  Success criteria: Shows all book metadata in readable format, works with valid ASIN

- [x] Add `sales` command for sales data
  ```typescript
  kdpCommand
    .command('sales <asin>')
    .description('Show sales data for a specific book')
    .option('--days <days>', 'Number of days to show', '30')
    .option('--format <format>', 'Output format: table|json|csv', 'table')
    .action(async (asin: string, options) => {
      const kdp = new KdpService({ /* config */ });
      await kdp.login();

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(options.days));

      const sales = await kdp.getSalesData(asin, { startDate, endDate });

      if (options.format === 'table') {
        console.log(`\n📊 Sales for ${asin} (Last ${options.days} days)\n`);
        console.table(sales.map(s => ({
          Date: s.date.toISOString().split('T')[0],
          Marketplace: s.marketplace,
          Units: s.unitsOrdered,
          Royalty: `${s.currency} ${s.royalty.toFixed(2)}`,
          KENP: s.kenpRead || 0,
        })));

        const total = sales.reduce((sum, s) => sum + s.royalty, 0);
        console.log(`\nTotal Royalty: $${total.toFixed(2)}`);
      } else {
        console.log(JSON.stringify(sales, null, 2));
      }

      await kdp.close();
    });
  ```
  Success criteria: Shows sales breakdown by date and marketplace, calculates totals correctly

### 6. Error Handling & UX Polish

- [x] Add retry logic for transient failures in `KdpService` base methods
  - Wrap navigation in `p-retry` from existing dependency: `await pRetry(() => page.goto(url), { retries: 3 })`
  - Retry on network errors, timeout errors
  - Do NOT retry on authentication errors (fail fast)
  - Success criteria: Handles intermittent network issues without user intervention

- [x] Add progress indicators for slow operations
  - Use `ora` spinner (already in dependencies) for login, book listing, sales scraping
  - Show current operation: `spinner.text = 'Fetching book details...'`
  - Success/failure states: `spinner.succeed('Found 14 books')` or `spinner.fail('Login failed')`
  - Success criteria: User sees progress during 5+ second operations
  - Note: Already implemented in all CLI commands (login, list, show, sales)

- [x] Improve error messages with actionable guidance
  ```typescript
  catch (error) {
    if (error instanceof KdpAuthenticationError) {
      Logger.error('Failed to login to KDP');
      Logger.info('Troubleshooting:');
      Logger.info('  1. Verify KDP_EMAIL and KDP_PASSWORD are correct');
      Logger.info('  2. Check if 2FA is required (use --headed mode to see browser)');
      Logger.info('  3. Ensure account is not locked due to failed login attempts');
    } else if (error instanceof KdpScrapingError) {
      Logger.error(`Failed to scrape data from ${error.url}`);
      Logger.info('This may be due to KDP UI changes. Please report this issue.');
      Logger.info(`Screenshot saved to: ${screenshotPath}`);
    }
  }
  ```
  Success criteria: Error messages clearly explain problem and next steps
  Implemented via handleKdpError() helper with 6 error types covered

### 7. Testing

- [ ] Create `apps/publisher/src/services/kdp.test.ts` with unit tests
  - Mock Playwright page/browser for isolated testing
  - Test `listBooks()` with various HTML fixtures (empty bookshelf, paginated results)
  - Test `getBookDetails()` with complete and partial data fixtures
  - Test `getSalesData()` with multi-marketplace data
  - Test error handling (expired session, missing selectors)
  - Success criteria: 80%+ code coverage for KdpService methods

- [ ] Add integration test in mock mode
  ```typescript
  describe('KDP Integration (Mock Mode)', () => {
    it('should list books without real KDP connection', async () => {
      const kdp = new KdpService({ mockMode: true, email: 'test@example.com', password: 'mock' });
      await kdp.login();
      const books = await kdp.listBooks();
      expect(books).toHaveLength(2); // Mock data returns 2 books
      expect(books[0]).toHaveProperty('asin');
    });
  });
  ```
  Success criteria: Can run tests without KDP credentials or network access

- [ ] Add manual E2E test documentation in `apps/publisher/README.md`
  ```markdown
  ## Manual Testing Checklist

  Before release, verify these commands with real KDP account:

  1. `pnpm publisher kdp list` - Shows all your books
  2. `pnpm publisher kdp list --status=live` - Filters correctly
  3. `pnpm publisher kdp show <ASIN>` - Shows book details
  4. `pnpm publisher kdp sales <ASIN>` - Shows sales data
  5. Verify data matches KDP dashboard exactly
  6. Test with expired session (clear cookies, should fail gracefully)
  7. Test with invalid ASIN (should show helpful error)
  ```

### 8. Documentation

- [ ] Update `apps/publisher/README.md` with new KDP management commands
  - Add "KDP Account Management" section
  - Document all new commands with examples
  - Add troubleshooting section for common issues
  - Include screenshot showing example output
  - Note: Keep existing publishing commands documentation intact

- [ ] Add inline JSDoc comments to public methods
  ```typescript
  /**
   * Lists all books in the KDP account
   *
   * @param options.noCache - If true, bypasses cache and fetches fresh data from KDP
   * @returns Array of books sorted by last modified date (newest first)
   * @throws {KdpAuthenticationError} If not logged in or session expired
   * @throws {KdpScrapingError} If bookshelf page structure has changed
   *
   * @example
   * const books = await kdp.listBooks();
   * console.log(`You have ${books.length} books`);
   */
  async listBooks(options?: { noCache?: boolean }): Promise<KdpBook[]>
  ```

- [ ] Create `docs/KDP_CLI_GUIDE.md` with comprehensive usage guide
  - Getting started: Setting up credentials
  - Command reference: All commands with full options
  - Use cases: Common workflows (checking sales, monitoring status)
  - Troubleshooting: FAQ and common errors
  - Architecture notes: How scraping works, when to expect updates
