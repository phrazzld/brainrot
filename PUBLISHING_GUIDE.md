# 📚 KDP Publishing Guide

> Complete step-by-step guide for publishing Brainrot translations to Amazon KDP

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Publishing Workflow](#pre-publishing-workflow)
3. [Cover Preparation](#cover-preparation)
4. [Content Generation](#content-generation)
5. [Publishing Process](#publishing-process)
6. [Rate Limits & Quotas](#rate-limits--quotas)
7. [Troubleshooting](#troubleshooting)
8. [Legal Requirements](#legal-requirements)

## Prerequisites

### Environment Setup

```bash
# Ensure you have the required environment variables
KDP_EMAIL=your-kdp-email@example.com
KDP_PASSWORD=your-kdp-password
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### Required Files

Before publishing, ensure your book has:
- **Translation content**: `content/translations/books/{slug}/brainrot/` directory with markdown files
- **Metadata**: `content/translations/books/{slug}/metadata.yaml` with complete book information
- **Cover image**: High-resolution cover image (recommended: 2560×2808, JPEG format)

### System Requirements

- Node.js >= 22.0.0
- pnpm >= 8.15.1
- Pandoc (for EPUB generation)
- Sharp.js or Jimp (for image processing)

## Pre-Publishing Workflow

### 1. Content Validation

First, ensure your book content is complete:

```bash
# List all available books
ls content/translations/books/

# Check book structure
tree content/translations/books/great-gatsby/
```

Expected structure:
```
great-gatsby/
├── brainrot/
│   ├── chapter-1.md
│   ├── chapter-2.md
│   └── ... (all chapters)
├── metadata.yaml
└── original/ (optional)
```

### 2. Generate All Formats

Generate the required publishing formats:

```bash
# Generate text and EPUB formats for a specific book
pnpm generate:formats great-gatsby

# Or generate for all books
pnpm generate:formats --all
```

This creates:
- `generated/{slug}/book.epub` - Kindle ebook format
- `generated/{slug}/legal.md` - Legal pages with copyright, title page, AI disclosure
- `generated/{slug}/chapter-*.txt` - Individual text files
- `generated/{slug}/.cache.json` - Build cache for future runs

### 3. Verify Generated Files

Check that all required files were created:

```bash
# Check generated files
ls generated/great-gatsby/
# Should show: book.epub, legal.md, chapter-*.txt files

# Check file sizes (EPUB should be reasonable size)
ls -lh generated/great-gatsby/book.epub
```

## Cover Preparation

### Understanding KDP Cover Requirements

**Minimum Requirements:**
- **Dimensions**: At least 1600×2560 pixels
- **Format**: JPEG, PNG, or TIFF
- **File Size**: Maximum 50MB (recommended: 1-3MB)
- **DPI**: 300 DPI for print quality
- **Aspect Ratio**: Approximately 1:1.6 (allow ±10% tolerance)

**Optimal Specifications:**
- **Dimensions**: 2560×2808 pixels
- **Format**: JPEG with high quality
- **DPI**: 300 DPI
- **File Size**: 1-3MB

### 1. Cover Validation

Always validate your cover before processing:

```bash
# Validate cover against KDP requirements
pnpm kdp:validate-cover great-gatsby

# For strict validation (warnings become errors)
pnpm kdp:validate-cover great-gatsby --strict
```

**Sample Output:**
```
✓ Cover dimensions: 2560×2808 (meets requirements)
✓ File format: JPEG (supported)
⚠ File size: 4.2MB (recommended: 1-3MB)
✓ Aspect ratio: 1.60 (within tolerance)

Summary: 3 passed, 0 failed, 1 warning
Suggestions:
• Consider optimizing file size to 1-3MB for faster uploads
```

### 2. Auto-Processing Covers

If your cover doesn't meet requirements, use auto-processing:

```bash
# Auto-process cover (resize, optimize, set DPI)
pnpm kdp:process-cover great-gatsby /path/to/your-cover.jpg

# Advanced options
pnpm kdp:process-cover great-gatsby /path/to/cover.jpg \
  --dpi 300 \
  --quality 90 \
  --format jpeg \
  --force
```

**What Auto-Processing Does:**
- **Upscaling**: Automatically resizes small images to meet KDP minimums
- **Format Conversion**: Converts to optimal JPEG format
- **DPI Correction**: Sets metadata to 300 DPI
- **Size Optimization**: Uses mozjpeg compression for smaller file sizes
- **Validation Report**: Generates detailed processing report

**Sample Processing Result:**
```
Original: 521×475, PNG, 150 DPI, 847KB
Processed: 2808×2560, JPEG, 300 DPI, 1.1MB
Status: ✅ Ready for KDP upload
```

### 3. Manual Cover Guidelines

If you prefer to prepare covers manually:

**Adobe Photoshop/GIMP:**
1. Create new document: 2560×2808 pixels, 300 DPI
2. Design your cover within safe margins
3. Export as high-quality JPEG (quality 90-95%)
4. Keep file size under 3MB

**Canva/Online Tools:**
1. Use "Book Cover" template
2. Set custom dimensions: 2560×2808
3. Export as PNG or JPEG
4. Run through auto-processing if needed

## Content Generation

### Legal Pages Integration

Your EPUB automatically includes required legal pages:

**Title Page:**
- Book title and subtitle
- Author attribution
- Edition information
- Publishing house details

**Copyright Page:**
- Copyright notice
- Publishing rights and permissions
- Contact information
- Legal disclaimers

**AI Disclosure:**
- 2025 KDP-compliant AI usage disclosure
- Details about AI assistance in translation
- Human oversight acknowledgment

**Table of Contents:**
- Automatic chapter navigation
- Front and back matter sections

### Metadata Requirements

Ensure your `metadata.yaml` includes:

```yaml
title: "The Great Gatsby: Brainrot Edition"
subtitle: "F. Scott Fitzgerald's Classic, No Cap Fr Fr"
author: "F. Scott Fitzgerald (Brainrot Translation)"
translator: "Brainrot Publishing House"
description: |
  Experience Fitzgerald's masterpiece like never before...
isbn: "978-0-123456-78-9"
publication_year: 2024
genre: "Fiction"
language: "en-US"
page_count: 180
price: 
  ebook: 2.99
  paperback: 12.99
keywords:
  - "classic literature"
  - "gen z translation"
  - "modern adaptation"
```

## Publishing Process

### 1. Pre-Flight Checks

Run comprehensive validation before publishing:

```bash
# Check all validation requirements
pnpm kdp:check great-gatsby

# Run in mock mode to preview without publishing
pnpm kdp:check great-gatsby --mock
```

**What Gets Validated:**
- ✅ EPUB file exists and is valid
- ✅ Cover meets KDP requirements
- ✅ Metadata is complete
- ✅ Legal pages are included
- ✅ Rate limits not exceeded
- ✅ Credentials configured

### 2. Check Rate Limits

Before publishing, verify your daily quota:

```bash
# Check current publishing status
pnpm kdp:status
```

**Sample Output:**
```
📊 KDP PUBLISHING STATUS

✅ Daily Quota: 2/3 books published today
⏰ Next Reset: Tomorrow at 12:00 AM (in 8h 23m)
📅 Last Publish: great-gatsby (2 hours ago)

RECENT ACTIVITY:
• 14:30 - Published: pride-and-prejudice ✓
• 12:15 - Published: frankenstein ✓

STATUS: Ready to publish (1 remaining today)
```

### 3. Publish to KDP

Once everything is validated:

```bash
# Publish to Amazon KDP
pnpm publish:kdp great-gatsby

# Run in mock mode first (recommended)
pnpm publish:kdp great-gatsby --mock
```

**Publishing Steps:**
1. **Login**: Automated KDP login
2. **Create Book**: Sets up new title
3. **Upload Manuscript**: EPUB file upload
4. **Upload Cover**: Processed cover image
5. **Set Metadata**: Title, description, keywords
6. **Configure Pricing**: Based on metadata.yaml
7. **Submit for Review**: Sends to KDP review queue

### 4. Mock Mode Testing

Always test with mock mode first:

```bash
# Full mock publishing workflow
pnpm publish:kdp great-gatsby --mock
```

**Mock Mode Features:**
- ✅ Real validation (no side effects)
- ✅ Rate limit checking
- ✅ File analysis and verification
- ✅ Workflow preview with timing estimates
- ✅ Comprehensive reporting
- ✅ JSON report generation

**Sample Mock Output:**
```
📋 PUBLISHING PREVIEW REPORT
========================================
📚 Book: great-gatsby
🏷️ Platform: KDP
⚙️ Mode: MOCK

🔍 VALIDATION RESULTS
• ✓ Cover dimensions (2560×2808)
• ✓ EPUB file exists (301KB)
• ⚠ File size could be optimized

📁 FILE ANALYSIS
• ✓ MANUSCRIPT: book.epub (301KB, EPUB3)
• ✓ COVER: cover.jpg (1.1MB, JPEG, 300 DPI)
• ✓ METADATA: metadata.yaml (2.1KB)

⚡ WORKFLOW PREVIEW
• ✓ Login to KDP (~15s)
• ✓ Upload Cover (~30s)
• ✓ Upload Manuscript (~45s)
• ✓ Set Metadata (~20s)

📊 SUMMARY
✅ Overall Status: READY TO PUBLISH
Estimated publish time: 2m 30s
```

## Rate Limits & Quotas

### Understanding KDP Limits

**Daily Quotas:**
- **KDP**: 3 books per day
- **Reset Time**: Midnight UTC
- **Tracking**: Persistent across restarts

### Managing Your Publishing Schedule

```bash
# Check status before publishing
pnpm kdp:status

# Plan your publishing queue
pnpm publish:kdp book-1    # Uses 1/3 quota
pnpm publish:kdp book-2    # Uses 2/3 quota  
pnpm publish:kdp book-3    # Uses 3/3 quota
# pnpm publish:kdp book-4  # Would fail - quota exceeded
```

### Rate Limit Recovery

If you exceed your quota:

```bash
# Check when quota resets
pnpm kdp:status

# Wait for midnight UTC reset, then continue
# Or schedule publishing for next day
```

## Troubleshooting

### Common Issues

#### 1. EPUB Generation Fails

**Error**: `Pandoc conversion failed`

**Solutions:**
```bash
# Check pandoc installation
pandoc --version

# Verify content structure
tree content/translations/books/your-book/

# Check for malformed markdown
pnpm generate:formats your-book --verbose

# Clear cache and retry
rm generated/your-book/.cache.json
pnpm generate:formats your-book --force
```

#### 2. Cover Validation Fails

**Error**: `Cover dimensions too small (1200×1600, minimum 1600×2560)`

**Solutions:**
```bash
# Auto-process to fix dimensions
pnpm kdp:process-cover your-book /path/to/cover.jpg

# Check requirements
pnpm kdp:validate-cover your-book

# Manual resize in image editor to 2560×2808
```

#### 3. Rate Limit Exceeded

**Error**: `Rate limit exceeded: 3/3 books published today`

**Solutions:**
```bash
# Check reset time
pnpm kdp:status

# Wait for quota reset at midnight UTC
# Or continue tomorrow

# Use mock mode for testing
pnpm publish:kdp your-book --mock
```

#### 4. Login Failures

**Error**: `KDP login failed: Invalid credentials`

**Solutions:**
```bash
# Verify environment variables
echo $KDP_EMAIL
echo $KDP_PASSWORD

# Update credentials
export KDP_EMAIL="your-email@example.com"
export KDP_PASSWORD="your-password"

# Test login only
pnpm kdp:login
```

#### 5. Image Processing Failures

**Error**: `Sharp.js processing failed`

**Solutions:**
```bash
# Fallback to Jimp automatically handled
# But you can force reinstall if needed:
cd packages/@brainrot/converter
pnpm install sharp --force

# Or use manual image processing
# Process cover manually in external tool
```

### Debug Commands

```bash
# Verbose generation
pnpm generate:formats your-book --verbose

# Force regeneration (ignore cache)
pnpm generate:formats your-book --force

# Dry run publishing
pnpm publish:kdp your-book --dry-run

# Check file permissions
ls -la generated/your-book/

# Test cover processing only
pnpm kdp:process-cover your-book /path/to/cover.jpg --verbose
```

### Log Files and Reports

**Generated Reports:**
- `publishing-reports/mock/` - Mock mode reports
- `generated/{slug}/.cache.json` - Build cache
- `generated/{slug}/validation.json` - Cover processing reports

**Useful for Debugging:**
```bash
# Check recent mock reports
ls -la publishing-reports/mock/

# View cover processing details
cat generated/your-book/validation.json

# Check build cache
cat generated/your-book/.cache.json
```

## Legal Requirements

### AI Disclosure Requirements

As of 2025, KDP requires disclosure of AI usage. Our legal page generator automatically includes:

**Required Elements:**
- AI assistance acknowledgment
- Human oversight statement
- Creative responsibility disclaimer
- Transparency about process

**Example Disclosure:**
```
This translation was created with AI assistance as a creative writing tool. 
All content underwent human review, editing, and oversight. The publisher 
takes full creative responsibility for the final work.
```

### Copyright Compliance

**Public Domain Sources:**
- All source texts are public domain classics
- Original authors clearly attributed
- Translation copyright belongs to Brainrot Publishing House

**Attribution Requirements:**
```
Original work: "The Great Gatsby" by F. Scott Fitzgerald (1925)
Translation: Brainrot Publishing House (2024)
Original text is in the public domain in the United States.
```

### ISBN Management

**Requirements:**
- Unique ISBN for each format (ebook, paperback, hardcover)
- ISBN must match metadata.yaml
- Register with Bowker or use KDP's free ISBNs

**Format:**
```yaml
isbn: "978-0-123456-78-9"  # 13-digit format required
```

### Content Guidelines

**KDP Compliance:**
- No explicit content (our translations are family-friendly)
- Appropriate age categorization
- Accurate content descriptions
- Proper keyword usage

## Best Practices

### 1. Workflow Optimization

**Recommended Order:**
1. Complete all translations
2. Generate formats for all books
3. Batch process covers
4. Validate everything in mock mode
5. Publish respecting rate limits

### 2. Quality Assurance

```bash
# Run comprehensive checks
pnpm generate:formats --all
pnpm kdp:validate-cover --all  # (if implemented)
pnpm test  # Run test suite

# Mock mode testing
for book in great-gatsby pride-prejudice frankenstein; do
  pnpm publish:kdp $book --mock
done
```

### 3. Automation

**Daily Publishing Script:**
```bash
#!/bin/bash
# publish-daily.sh

books=("book-1" "book-2" "book-3")

for book in "${books[@]}"; do
  echo "Publishing $book..."
  pnpm publish:kdp "$book" || echo "Failed: $book"
  sleep 60  # Brief pause between publishes
done
```

### 4. Monitoring

**Track Success Rates:**
- Monitor KDP review acceptance rates
- Track time from submission to live
- Note any common rejection reasons
- Adjust templates/process as needed

## Quick Reference

### Essential Commands

```bash
# Content Generation
pnpm generate:formats <book>          # Generate EPUB and text
pnpm generate:formats --all           # Process all books

# Cover Preparation  
pnpm kdp:validate-cover <book>        # Check cover requirements
pnpm kdp:process-cover <book> <path>  # Auto-process cover

# Publishing
pnpm kdp:check <book>                 # Pre-flight validation
pnpm kdp:status                       # Check rate limits
pnpm publish:kdp <book>               # Publish to KDP
pnpm publish:kdp <book> --mock        # Mock mode testing

# Utilities
pnpm kdp:login                        # Test KDP credentials
pnpm test                             # Run test suite
```

### File Locations

```
generated/{slug}/
├── book.epub           # Kindle ebook
├── cover.jpg           # Processed cover
├── legal.md            # Legal pages
├── chapter-*.txt       # Text files
├── .cache.json         # Build cache
└── validation.json     # Processing report

publishing-reports/mock/
└── {date}-{book}-kdp-mock-report.json
```

### Environment Variables

```bash
# Required
KDP_EMAIL=your-kdp-account@example.com
KDP_PASSWORD=your-kdp-password
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Optional
BRAINROT_MOCK_MODE=true              # Force mock mode
```

---

## Support & Resources

- **Issues**: [GitHub Issues](https://github.com/phrazzld/brainrot/issues)
- **Documentation**: [Main README](./README.md)
- **Architecture**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **KDP Requirements**: [Amazon KDP Content Guidelines](https://kdp.amazon.com/en_US/help/topic/G200634390)

---

*Last Updated: January 2025*  
*Version: 1.0.0*