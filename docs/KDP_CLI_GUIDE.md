# KDP CLI Comprehensive Usage Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Command Reference](#command-reference)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)
- [Architecture Notes](#architecture-notes)
- [FAQ](#faq)

## Getting Started

### Prerequisites

1. **KDP Account Credentials**
   - Amazon KDP account (https://kdp.amazon.com)
   - Email address associated with your KDP account
   - Password for your KDP account

2. **Environment Setup**

   Create a `.env` file in the project root:

   ```bash
   KDP_EMAIL=your-email@example.com
   KDP_PASSWORD=<your-secure-password-here>
   ```

   **Security Note:** Never commit `.env` to version control. This file is already in `.gitignore`.

3. **Build the Publisher CLI**

   ```bash
   cd apps/publisher
   pnpm install
   pnpm build
   ```

### First Run

Test your setup with mock mode (no credentials required):

```bash
node dist/index.js kdp list --mock
```

Expected output:
```
✔ Logged in to KDP successfully
✔ Found 2 books

ASIN         Title                                      Status   Formats
B0MOCK123    The Great Gatsby (Brainrot Edition)       live     ebook
B0MOCK456    The Republic (Brainrot Edition)           live     ebook, paperback
```

### Authenticating with Real KDP Account

```bash
# Set credentials (Linux/macOS)
export KDP_EMAIL="your-email@example.com"
export KDP_PASSWORD="<your-password-here>"

# Set credentials (Windows PowerShell)
$env:KDP_EMAIL="your-email@example.com"
$env:KDP_PASSWORD="<your-password-here>"

# Run a command
node dist/index.js kdp list
```

## Command Reference

All commands follow the pattern: `node dist/index.js kdp <command> [options]`

### `kdp list` - List All Books

Lists all books in your KDP account with summary information.

**Usage:**
```bash
node dist/index.js kdp list [options]
```

**Options:**
- `--format <format>` - Output format: `table` (default), `json`, or `csv`
- `--status <status>` - Filter by status: `all` (default), `live`, `draft`, `in_review`, `unpublished`, `blocked`
- `--no-cache` - Force refresh from KDP (bypass 5-minute cache)
- `--mock` - Run in mock mode (testing only)
- `--headed` - Show browser UI (for debugging)

**Examples:**

```bash
# List all books in table format
node dist/index.js kdp list

# Filter by status
node dist/index.js kdp list --status=live
node dist/index.js kdp list --status=draft

# Export to JSON
node dist/index.js kdp list --format=json > books.json

# Export to CSV
node dist/index.js kdp list --format=csv > books.csv

# Force fresh data (bypass cache)
node dist/index.js kdp list --no-cache
```

**Output Fields:**
- `ASIN` - Amazon Standard Identification Number
- `Title` - Book title (truncated to 40 characters)
- `Status` - Current publication status
- `Formats` - Available formats (ebook, paperback, hardcover)

**Cache Behavior:**
Results are cached for 5 minutes to improve performance. Use `--no-cache` to force a fresh fetch.

---

### `kdp show` - Show Book Details

Displays detailed information for a specific book, including metadata, pricing, and keywords.

**Usage:**
```bash
node dist/index.js kdp show <ASIN> [options]
```

**Options:**
- `--format <format>` - Output format: `table` (default) or `json`
- `--mock` - Run in mock mode (testing only)
- `--headed` - Show browser UI (for debugging)

**Examples:**

```bash
# View book details in table format
node dist/index.js kdp show B0ABC123DEF

# Export to JSON for processing
node dist/index.js kdp show B0ABC123DEF --format=json > book-details.json
```

**Sample Output (Table Format):**
```
📖 Book Details

ASIN:        B0ABC123DEF
Title:       The Great Gatsby (Brainrot Edition)
Author:      F. Scott Fitzgerald, trans. Brainrot Classics
Status:      live
Formats:     ebook
Keywords:    classic literature, gen z, brainrot, gatsby, american dream

💰 Pricing

US: USD 2.99 (70%)
UK: GBP 1.99 (70%)
DE: EUR 2.49 (70%)
```

**Output Fields:**
- Basic info: ASIN, Title, Author, Status, Formats
- Content: Description, Keywords (up to 7), Categories
- Pricing: Marketplace, Currency, List Price, Royalty Rate

---

### `kdp sales` - Show Sales Data

Retrieves and displays sales data for a specific book, with options for date filtering and export.

**Usage:**
```bash
node dist/index.js kdp sales <ASIN> [options]
```

**Options:**
- `--days <days>` - Number of days to show (default: 30)
- `--format <format>` - Output format: `table` (default), `json`, or `csv`
- `--mock` - Run in mock mode (testing only)
- `--headed` - Show browser UI (for debugging)

**Examples:**

```bash
# Show last 30 days (default)
node dist/index.js kdp sales B0ABC123DEF

# Show last 90 days
node dist/index.js kdp sales B0ABC123DEF --days=90

# Export to JSON for analysis
node dist/index.js kdp sales B0ABC123DEF --format=json > sales.json

# Export to CSV for spreadsheet
node dist/index.js kdp sales B0ABC123DEF --format=csv > sales.csv

# Last 7 days only
node dist/index.js kdp sales B0ABC123DEF --days=7
```

**Sample Output (Table Format):**
```
📊 Sales for B0ABC123DEF (Last 30 days)

Date          Marketplace   Units   Royalty        KENP
2024-01-15    US           5       USD 17.45      1250
2024-01-14    UK           2       GBP 8.40       0

Total Royalty: $25.85
```

**Output Fields:**
- `Date` - Order date (YYYY-MM-DD)
- `Marketplace` - Two-letter country code (US, UK, DE, etc.)
- `Units` - Number of units ordered
- `Royalty` - Royalty earned (with currency)
- `KENP` - Kindle Edition Normalized Pages read (KDP Select only)

**Notes:**
- Data is sorted by date (newest first)
- KENP fields appear only for books enrolled in KDP Select
- Totals are calculated across all marketplaces

---

## Common Workflows

### Workflow 1: Daily Sales Check

Check sales for all your live books:

```bash
#!/bin/bash
# save as check-sales.sh

# Get all live books as JSON
books=$(node dist/index.js kdp list --status=live --format=json)

# Extract ASINs and check sales
echo "$books" | jq -r '.[].asin' | while read asin; do
  echo "Checking sales for $asin..."
  node dist/index.js kdp sales "$asin" --days=1
done
```

### Workflow 2: Monthly Report Generation

Generate a comprehensive monthly report:

```bash
#!/bin/bash
# save as monthly-report.sh

YEAR=$(date +%Y)
MONTH=$(date +%m)
OUTPUT_DIR="reports/${YEAR}-${MONTH}"

mkdir -p "$OUTPUT_DIR"

# Export book list
node dist/index.js kdp list --format=json > "$OUTPUT_DIR/books.json"

# Export sales for each book (last 30 days)
node dist/index.js kdp list --format=json | jq -r '.[].asin' | while read asin; do
  node dist/index.js kdp sales "$asin" --days=30 --format=csv > "$OUTPUT_DIR/sales-${asin}.csv"
done

echo "Monthly report saved to $OUTPUT_DIR"
```

### Workflow 3: Book Status Monitoring

Monitor book status changes:

```bash
#!/bin/bash
# save as monitor-status.sh

SNAPSHOT="book-status-snapshot.json"

# Create initial snapshot if it doesn't exist
if [ ! -f "$SNAPSHOT" ]; then
  node dist/index.js kdp list --format=json > "$SNAPSHOT"
  echo "Initial snapshot created"
  exit 0
fi

# Get current status
node dist/index.js kdp list --format=json > "book-status-current.json"

# Compare and report changes
jq -s '
  (.[0] | map({key: .asin, value: .status}) | from_entries) as $old |
  (.[1] | map({key: .asin, value: .status}) | from_entries) as $new |
  ($old | keys) as $old_keys |
  ($new | keys) as $new_keys |
  ($old_keys + $new_keys | unique) as $all_keys |
  $all_keys | map(select($old[.] != $new[.])) |
  map({asin: ., old: $old[.], new: $new[.]})
' "$SNAPSHOT" "book-status-current.json"

# Update snapshot
mv "book-status-current.json" "$SNAPSHOT"
```

### Workflow 4: Bulk Metadata Audit

Export all book details for auditing:

```bash
#!/bin/bash
# save as audit-metadata.sh

OUTPUT="metadata-audit-$(date +%Y%m%d).json"

# Get all books
ASINS=$(node dist/index.js kdp list --format=json | jq -r '.[].asin')

echo "[" > "$OUTPUT"
first=true

# Fetch details for each
for asin in $ASINS; do
  if [ "$first" = false ]; then
    echo "," >> "$OUTPUT"
  fi
  first=false

  node dist/index.js kdp show "$asin" --format=json >> "$OUTPUT"
done

echo "]" >> "$OUTPUT"

echo "Audit saved to $OUTPUT"
```

### Workflow 5: Price Comparison Analysis

Compare your pricing across marketplaces:

```bash
#!/bin/bash
# save as price-analysis.sh

node dist/index.js kdp list --format=json | jq -r '.[].asin' | while read asin; do
  echo "=== $asin ==="
  node dist/index.js kdp show "$asin" --format=json | jq -r '
    .pricing[] |
    "\(.marketplace): \(.currency) \(.listPrice) (\(.royaltyRate * 100)%)"
  '
  echo ""
done
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Login failed: Invalid credentials"

**Symptoms:**
```
✖ Login failed: Invalid credentials
```

**Solutions:**

1. **Verify credentials are correct:**
   ```bash
   echo $KDP_EMAIL
   echo $KDP_PASSWORD  # Be careful not to expose password
   ```

2. **Check for special characters in password:**
   - If your password contains `$`, `!`, or other shell special characters, quote it:
   ```bash
   export KDP_PASSWORD='<your-password-with-special-chars>'
   ```

3. **Try logging in manually to KDP:**
   - Visit https://kdp.amazon.com
   - Verify you can login with the same credentials
   - Check if your account is locked

4. **Use headed mode to see the browser:**
   ```bash
   node dist/index.js kdp list --headed
   ```
   This will show the browser window so you can see what's happening.

---

#### Issue: "2FA required but not prompted"

**Symptoms:**
- Login times out
- No prompt for 2FA code

**Solutions:**

1. **Use headed mode to complete 2FA manually:**
   ```bash
   node dist/index.js kdp list --headed
   ```

2. **Disable 2FA temporarily** (if possible):
   - Go to Amazon Account Settings → Security
   - Temporarily disable Two-Step Verification
   - Complete your KDP CLI task
   - Re-enable 2FA

3. **Use device-based 2FA instead of SMS:**
   - Authenticator apps are better supported
   - The CLI will prompt for the 6-digit code

---

#### Issue: "Session expired" errors

**Symptoms:**
```
✖ KDP session expired. Please login again.
```

**Solutions:**

1. **This is normal for long-running operations.** The CLI retries automatically.

2. **If it persists, clear cookies:**
   ```bash
   # The CLI uses a clean browser context each time
   # Just restart the command
   ```

3. **Check your internet connection:**
   - Unstable networks can cause session issues
   - Try from a different network

---

#### Issue: "No books found" when you have books

**Symptoms:**
- `kdp list` returns empty
- But KDP dashboard shows books

**Solutions:**

1. **Check filters:**
   ```bash
   # Try without filters
   node dist/index.js kdp list

   # Bypass cache
   node dist/index.js kdp list --no-cache
   ```

2. **Verify KDP UI hasn't changed:**
   - Run in headed mode: `--headed`
   - Check if page layout changed
   - [Report issue](https://github.com/phrazzld/brainrot/issues) if selectors are broken

3. **Check account permissions:**
   - Verify you're logged into the correct KDP account
   - Ensure account has books

---

#### Issue: "Scraping failed: Selector not found"

**Symptoms:**
```
✖ Failed to scrape data from https://kdp.amazon.com/...
```

**Solutions:**

1. **KDP UI may have changed.** This is expected occasionally.

2. **Use headed mode to inspect:**
   ```bash
   node dist/index.js kdp show <ASIN> --headed
   ```

3. **Take screenshots automatically saved to `screenshots/` directory**

4. **Report the issue:**
   - Include screenshot filenames
   - Mention which command failed
   - [Create GitHub issue](https://github.com/phrazzld/brainrot/issues)

---

#### Issue: Rate limiting / Too many requests

**Symptoms:**
- Commands slow down or fail after multiple runs
- "429 Too Many Requests" errors

**Solutions:**

1. **Add delays between commands:**
   ```bash
   for asin in $ASINS; do
     node dist/index.js kdp sales "$asin"
     sleep 5  # Wait 5 seconds
   done
   ```

2. **Use cache when possible:**
   - Don't use `--no-cache` unless necessary
   - Cache reduces server load

3. **Reduce concurrency:**
   - Don't run multiple instances simultaneously

---

#### Issue: ASIN not found / 404 errors

**Symptoms:**
```
✖ Book not found: B0ABC123
```

**Solutions:**

1. **Verify ASIN is correct:**
   - ASINs are case-sensitive
   - Check for typos (O vs 0, I vs 1)

2. **Confirm book is in your account:**
   ```bash
   node dist/index.js kdp list | grep B0ABC123
   ```

3. **Check if book was deleted/unpublished:**
   - Book may have been removed from your account

---

#### Issue: Sales data is empty

**Symptoms:**
- `kdp sales` returns no rows
- But you know there were sales

**Solutions:**

1. **Extend date range:**
   ```bash
   # Try last 90 days
   node dist/index.js kdp sales <ASIN> --days=90
   ```

2. **Check marketplace:**
   - Sales may be in different marketplaces
   - Export full data: `--format=json`

3. **Verify in KDP dashboard:**
   - Manually check reports section
   - Compare with CLI output

4. **CSV download fallback:**
   - The CLI supports CSV report downloads
   - This is a fallback if table scraping fails

---

### Performance Issues

#### Slow operations

**Solutions:**

1. **Use cache:**
   - Second `kdp list` call uses 5-minute cache
   - Much faster than fresh scrape

2. **Reduce date ranges:**
   - Shorter date ranges = less data to scrape
   - Use `--days=7` for recent sales only

3. **Use headless mode:**
   - Headless is faster (no UI rendering)
   - This is the default

4. **Check network speed:**
   - Slow networks affect scraping performance

---

### Debugging Tips

1. **Enable headed mode:**
   ```bash
   node dist/index.js kdp <command> --headed
   ```
   See exactly what the browser is doing.

2. **Check screenshots:**
   ```bash
   ls screenshots/
   ```
   Failed operations save screenshots automatically.

3. **Use mock mode to isolate issues:**
   ```bash
   node dist/index.js kdp list --mock
   ```
   If mock works but real doesn't, it's likely auth/network.

4. **Verbose logging (add to code if needed):**
   - Set `Logger.level = 'debug'` for detailed logs

5. **Check environment variables:**
   ```bash
   env | grep KDP_
   ```

---

## Architecture Notes

### How Scraping Works

The KDP CLI uses **Playwright** for browser automation. Here's what happens under the hood:

1. **Browser Launch:**
   - Chromium browser launched in headless mode
   - Custom user agent to avoid automation detection
   - Clean context (no cookies or history)

2. **Authentication:**
   - Navigate to https://kdp.amazon.com
   - Fill login form with credentials
   - Handle 2FA if required
   - Wait for dashboard to load

3. **Data Extraction:**
   - Navigate to target page (bookshelf, details, reports)
   - Wait for content to load (multiple selector strategies)
   - Extract data using CSS selectors
   - Parse and normalize values

4. **Error Handling:**
   - Retry on transient failures (network issues)
   - Take screenshots on errors
   - Throw typed errors (KdpAuthenticationError, KdpScrapingError)

5. **Cleanup:**
   - Close browser and free resources
   - Cache results where appropriate

### Why Scraping? (No Official API)

Amazon KDP doesn't provide a public API. This CLI uses browser automation to:
- **Read data** that's available in the KDP dashboard
- **Operate within terms of service** (read-only access to your own account)
- **Adapt to UI changes** (multiple selector strategies)

### When to Expect Updates

KDP UI changes require selector updates. Check for:
- Empty results when books exist
- "Selector not found" errors
- Incorrect data extraction

**Frequency:** KDP changes UI every 3-6 months on average.

**What to do:**
1. [Check for updates](https://github.com/phrazzld/brainrot)
2. [Report issues](https://github.com/phrazzld/brainrot/issues) with screenshots
3. [Contribute fixes](https://github.com/phrazzld/brainrot/pulls) if you're technical

### Performance Characteristics

| Operation | Cold (No Cache) | Cached | Mock Mode |
|-----------|----------------|--------|-----------|
| Login | 5-10s | N/A | <1ms |
| List Books (10 books) | 8-15s | <1ms | <1ms |
| Book Details | 5-8s | N/A | <1ms |
| Sales Data (30 days) | 10-20s | N/A | <1ms |

**Optimization Tips:**
- Use cache for repeated `list` calls
- Fetch multiple books sequentially (avoid hammering KDP)
- Use mock mode for testing workflows

### Retry Logic

The CLI automatically retries on transient failures:

| Error Type | Retries | Backoff |
|-----------|---------|---------|
| Network timeout | 3 | Exponential (1s → 5s) |
| Selector not found | 0 | N/A (immediate fail) |
| Session expired | 0 | N/A (re-login required) |
| Authentication | 0 | N/A (fail fast) |

**Why no retry on auth errors?**
- Wrong credentials won't fix themselves
- Multiple failed logins can lock account

### Cache TTL (Time to Live)

| Data Type | Cache Duration | Rationale |
|-----------|---------------|-----------|
| Book list | 5 minutes | Rarely changes |
| Book details | No cache | May change frequently |
| Sales data | No cache | Updates daily |

**Override cache:** Use `--no-cache` flag.

### Security Considerations

1. **Credentials stored in environment variables** (not in code)
2. **No persistent storage** of passwords
3. **Clean browser context** each run (no cookies saved)
4. **Screenshots** may contain sensitive data (check before sharing)

---

## FAQ

### Q: Is this against Amazon's terms of service?

**A:** The CLI uses browser automation to access your own KDP account, similar to using a browser extension. It's read-only access to data you already own. However:
- ✅ Acceptable: Reading your own data
- ❌ Not acceptable: Automated posting, bulk account creation, sharing credentials

Amazon has not explicitly prohibited browser automation for personal use, but use responsibly and don't abuse rate limits.

---

### Q: Can I use this for multiple KDP accounts?

**A:** Yes, by changing environment variables:

```bash
# Account 1
export KDP_EMAIL="account1@example.com"
export KDP_PASSWORD="<password-for-account-1>"
node dist/index.js kdp list

# Account 2
export KDP_EMAIL="account2@example.com"
export KDP_PASSWORD="<password-for-account-2>"
node dist/index.js kdp list
```

Or use a script to switch profiles.

---

### Q: Will this work if KDP changes their website?

**A:** Probably not immediately. When KDP changes their UI:
1. Selectors may break
2. You'll see "Selector not found" errors
3. Update required (submit issue or PR)

The CLI uses multiple selector strategies to be resilient, but major redesigns need updates.

---

### Q: Can I scrape data for books I don't own?

**A:** No. You can only access data from your own KDP account. This is by design and enforced by KDP's authentication.

---

### Q: How often can I run these commands?

**A:** Use reasonable rate limits:
- ✅ Good: Once per hour for monitoring
- ✅ Acceptable: Multiple times per day
- ⚠️ Risky: Every few minutes
- ❌ Bad: Continuous polling

Amazon may rate-limit or flag excessive automation.

---

### Q: Can I use this in CI/CD pipelines?

**A:** Yes, but consider:
- Store credentials securely (GitHub Secrets, environment variables)
- Use mock mode for tests that don't need real data
- Cache results to reduce KDP load
- Add delays between operations

Example GitHub Actions:
```yaml
- name: Check KDP Sales
  env:
    KDP_EMAIL: ${{ secrets.KDP_EMAIL }}
    KDP_PASSWORD: ${{ secrets.KDP_PASSWORD }}
  run: |
    node dist/index.js kdp sales B0ABC123 --format=json > sales.json
```

---

### Q: What happens if my 2FA method isn't supported?

**A:** The CLI supports:
- ✅ Authenticator app (TOTP) - Prompted for 6-digit code
- ✅ SMS - Prompted for code sent to phone
- ❌ Hardware key (YubiKey) - Not supported (use headed mode to complete manually)

For unsupported methods, use `--headed` to complete 2FA in visible browser.

---

### Q: Can I get historical sales data from years ago?

**A:** Yes, but:
- Large date ranges take longer to scrape
- KDP reports section has limits (usually 365 days max)
- Use CSV download for bulk historical data

```bash
node dist/index.js kdp sales <ASIN> --days=365
```

---

### Q: Why is mock mode so much faster?

**A:** Mock mode:
- Skips browser launch
- Skips authentication
- Returns hardcoded test data instantly

It's designed for testing workflows without network access.

---

### Q: Can I contribute to this project?

**A:** Absolutely! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

Common contributions:
- Selector updates when KDP UI changes
- New commands (e.g., bulk operations)
- Bug fixes
- Documentation improvements
- Test coverage

---

### Q: Where can I get help?

**A:**
1. **Documentation:** Read this guide + [README](../apps/publisher/README.md)
2. **GitHub Issues:** [Report bugs](https://github.com/phrazzld/brainrot/issues)
3. **GitHub Discussions:** [Ask questions](https://github.com/phrazzld/brainrot/discussions)

---

### Q: What's the difference between `kdp list` and `kdp show`?

**A:**

| Command | Purpose | Data | Performance |
|---------|---------|------|-------------|
| `kdp list` | Overview | Summary only | Fast (1 page) |
| `kdp show <ASIN>` | Details | Full metadata + pricing | Slower (multiple tabs) |

Use `list` for bulk operations, `show` for detailed analysis.

---

### Q: Can I export all books at once?

**A:** Sort of. Use this workflow:

```bash
# Get all ASINs
ASINS=$(node dist/index.js kdp list --format=json | jq -r '.[].asin')

# Fetch details for each
echo "[" > all-books.json
first=true
for asin in $ASINS; do
  [ "$first" = false ] && echo "," >> all-books.json
  first=false
  node dist/index.js kdp show "$asin" --format=json >> all-books.json
  sleep 2  # Be nice to KDP servers
done
echo "]" >> all-books.json
```

---

### Q: What if I don't have Node.js installed?

**A:** The CLI requires Node.js 22+. Install from:
- **Official:** https://nodejs.org/
- **nvm (Linux/macOS):** `nvm install 22`
- **Homebrew (macOS):** `brew install node`
- **Chocolatey (Windows):** `choco install nodejs`

---

## Additional Resources

- **Project README:** [apps/publisher/README.md](../apps/publisher/README.md)
- **Architecture Docs:** [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Publishing Guide:** [docs/PUBLISHING.md](./PUBLISHING.md)
- **GitHub Repository:** https://github.com/phrazzld/brainrot

---

**Last Updated:** 2025-08-21
**CLI Version:** Phase 1 MVP (Read-Only Operations)
**Maintained by:** Brainrot Publishing House
