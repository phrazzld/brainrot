# Brainrot Publisher CLI

A command-line tool for automating the publication of Brainrot books to multiple platforms including Amazon KDP, Lulu, and IngramSpark.

## Installation

From the monorepo root:

```bash
pnpm install
pnpm build --filter=@brainrot/publisher
```

## Usage

### Basic Commands

```bash
# Publish a book to all configured platforms
brainrot-publish publish great-gatsby

# Publish to specific platforms
brainrot-publish publish the-iliad --platform kdp lulu

# Dry run to test without publishing
brainrot-publish publish alice-in-wonderland --dry-run

# List all available books
brainrot-publish list

# Check publishing status
brainrot-publish status great-gatsby

# Validate book before publishing
brainrot-publish validate the-odyssey
```

### Configuration

Configure platform credentials:

```bash
# Interactive configuration
brainrot-publish configure --lulu
brainrot-publish configure --kdp

# Or use environment variables
export LULU_API_KEY="your-api-key"
export LULU_API_SECRET="your-api-secret"
export KDP_EMAIL="your-email@example.com"
export KDP_PASSWORD="your-password"
```

### Global Options

- `-v, --verbose` - Show detailed output and debug information
- `-q, --quiet` - Suppress non-essential output
- `--no-color` - Disable colored output
- `-c, --config <path>` - Use custom configuration file

## Configuration Files

Configuration is loaded from (in order of precedence):

1. Path specified with `--config` flag
2. `.publishrc.json` in current directory
3. `~/.brainrot/publisher.config.json`
4. Environment variables
5. Default configuration

### Example Configuration

```json
{
  "defaults": {
    "platforms": ["kdp", "lulu"],
    "skipValidation": false,
    "dryRun": false
  },
  "paths": {
    "contentDir": "content/translations/books",
    "generatedDir": "generated",
    "reportsDir": "publishing-reports"
  },
  "lulu": {
    "sandbox": true,
    "enabled": true
  },
  "kdp": {
    "enabled": true
  },
  "ingram": {
    "enabled": false
  }
}
```

## Platform Support

### Amazon KDP (Kindle Direct Publishing)

- Automated login with 2FA support
- Manuscript and cover upload
- Pricing and territory configuration
- Draft and publish capabilities

### Lulu

- API-based integration
- Print-on-demand for paperback and hardcover
- Global distribution network
- Sandbox mode for testing

### IngramSpark

- Coming soon
- Professional print distribution
- Bookstore and library access

## KDP Account Management

In addition to publishing books, the CLI provides read-only account management commands for monitoring your KDP books, sales, and metadata.

### List All Books

```bash
# List all books in your KDP account
node dist/index.js kdp list

# Filter by status
node dist/index.js kdp list --status=live
node dist/index.js kdp list --status=draft

# Export to JSON or CSV
node dist/index.js kdp list --format=json
node dist/index.js kdp list --format=csv

# Force refresh (bypass cache)
node dist/index.js kdp list --no-cache
```

### Show Book Details

```bash
# View detailed information for a specific book
node dist/index.js kdp show B0ABC123DEF

# Export to JSON
node dist/index.js kdp show B0ABC123DEF --format=json
```

### View Sales Data

```bash
# Show sales for the last 30 days (default)
node dist/index.js kdp sales B0ABC123DEF

# Custom date range
node dist/index.js kdp sales B0ABC123DEF --days=90

# Export sales data
node dist/index.js kdp sales B0ABC123DEF --format=json
node dist/index.js kdp sales B0ABC123DEF --format=csv
```

### KDP CLI Options

All KDP commands support these options:

- `--headless` - Run browser in headless mode (default: true)
- `--headed` - Run browser with visible UI for debugging
- `--mock` - Run in mock mode without actual browser automation (for testing)

### Mock Mode Testing

Test KDP commands without credentials or network access:

```bash
# Test any KDP command in mock mode
node dist/index.js kdp list --mock
node dist/index.js kdp show B0MOCK123 --mock
node dist/index.js kdp sales B0MOCK123 --mock
```

### Manual Testing Checklist

Before release, verify these commands with a real KDP account:

**Prerequisites:**
- Set `KDP_EMAIL` and `KDP_PASSWORD` environment variables
- Have at least one book published in KDP account

**Test Cases:**

1. **List books** - `node dist/index.js kdp list`
   - ✅ Shows all your books
   - ✅ Displays correct status, formats, and dates
   - ✅ Data matches KDP dashboard

2. **Filter by status** - `node dist/index.js kdp list --status=live`
   - ✅ Filters correctly
   - ✅ Shows only live books

3. **Show book details** - `node dist/index.js kdp show <ASIN>`
   - ✅ Displays complete metadata
   - ✅ Shows pricing for all marketplaces
   - ✅ Keywords and categories visible

4. **View sales data** - `node dist/index.js kdp sales <ASIN>`
   - ✅ Shows sales breakdown by date/marketplace
   - ✅ Includes KENP data for KDP Select books
   - ✅ Totals calculated correctly

5. **Export formats** - Test JSON and CSV exports
   - ✅ `--format=json` produces valid JSON
   - ✅ `--format=csv` produces valid CSV

6. **Error handling** - Verify graceful failures
   - ✅ Invalid ASIN shows helpful error
   - ✅ Network issues retry automatically
   - ✅ Session expiration handled gracefully

7. **Authentication** - Test login scenarios
   - ✅ Correct credentials → successful login
   - ✅ 2FA prompted when enabled
   - ✅ Wrong credentials → clear error message

8. **Cache behavior** - Verify caching works
   - ✅ Second `kdp list` call is instant (cached)
   - ✅ `--no-cache` forces fresh fetch

## Book Validation

Before publishing, books must pass validation:

- ✅ Valid `metadata.yaml` file exists
- ✅ ISBN format is correct (ISBN-13)
- ✅ All required metadata fields present
- ✅ Text files generated in `generated/` directory
- ✅ Cover image available (if required)
- ✅ Pricing information configured

## Publishing Reports

After each publishing session, a detailed report is saved to `publishing-reports/`:

```json
{
  "book": "great-gatsby",
  "timestamp": "2024-01-15T10:30:00Z",
  "platforms": {
    "kdp": {
      "status": "published",
      "id": "KDP123456",
      "url": "https://kdp.amazon.com/..."
    },
    "lulu": {
      "status": "published",
      "id": "LULU789012",
      "url": "https://www.lulu.com/..."
    }
  }
}
```

## Development

```bash
# Run in development mode
pnpm dev --filter=@brainrot/publisher

# Run tests
pnpm test --filter=@brainrot/publisher

# Type checking
pnpm typecheck --filter=@brainrot/publisher

# Linting
pnpm lint --filter=@brainrot/publisher
```

## Troubleshooting

### KDP Login Issues

- Ensure 2FA is properly configured
- Check that cookies are enabled
- Try headed mode for debugging: `--debug-browser`

### Lulu API Errors

- Verify API credentials are correct
- Check sandbox vs production mode
- Review API rate limits

### Missing Files

- Run `pnpm generate:formats` first
- Ensure book has valid metadata.yaml
- Check file permissions

## License

MIT © Brainrot Publishing House
