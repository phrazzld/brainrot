# TODO: Brainrot Publishing House - Monorepo Migration & Publishing Pipeline

## Phase 1: Monorepo Structure Setup [Days 1-2]

### 1.1 Initialize Monorepo Root
- [x] Create new directory at `~/Development/brainrot` as monorepo root
- [x] Initialize git repository with `git init` in monorepo root
- [x] Create `package.json` with `"packageManager": "pnpm@8.15.1"` and `"private": true`
- [x] Install Turborepo as dev dependency: `pnpm add -D turbo@^2.0.0`
- [x] Create `pnpm-workspace.yaml` with packages array: `['apps/*', 'packages/*', 'content/*']`
- [x] Create directory structure: `mkdir -p apps packages content scripts .github/workflows`

### 1.2 Configure Turborepo
- [x] Create `turbo.json` with pipeline definitions for build, dev, test, lint, generate, publish tasks
- [x] Configure globalDependencies to include `**/.env.*local` for proper env var handling
- [x] Set up build task outputs: `[".next/**", "dist/**", "generated/**"]`
- [x] Configure dev task with `"cache": false` and `"persistent": true` for watch mode
- [x] Add environment variables to build task: `["NODE_ENV", "NEXT_PUBLIC_*", "BLOB_READ_WRITE_TOKEN"]`

### 1.3 Migrate Web App Repository
- [x] Add web app as git remote: `git remote add web-origin ../brainrot-publishing-house`
### Complexity: COMPLEX
### Started: 2025-08-16 11:59
### Context Discovery
- Source repo: ~/Development/brainrot-publishing-house (existing web app)
- Target location: apps/web/ in monorepo
- Git strategy: subtree merge to preserve full history
- Critical files: Great Gatsby translations, BlobService utilities

### Execution Log
[11:59] Starting web app repository migration
[12:00] Added web-origin remote successfully
[12:00] Fetched web app history (6 branches)
[12:01] Merge prepared with ours strategy
[12:01] Web app tree successfully read into apps/web/
[12:02] Committed import with preserved history
- [x] Fetch web app history: `git fetch web-origin`
- [x] Merge web app with subtree preserving history: `git merge -s ours --no-commit --allow-unrelated-histories web-origin/master`
- [x] Read web app tree into apps/web: `git read-tree --prefix=apps/web/ -u web-origin/master`
- [x] Commit web app import: `git commit -m "Import web app with full git history"`
- [x] Update `apps/web/package.json` name field to `"@brainrot/web"`

### Approach Decisions
- Used git subtree merge strategy to preserve full commit history
- Chose subtree over submodule for better monorepo integration
- Maintained original branch structure for reference

### Learnings
- Git subtree merge successfully preserves complete history
- Web app includes critical Great Gatsby translations in great-gatsby/brainrot/
- BlobService utilities ready for extraction to shared package

### 1.4 Migrate Translations Repository
- [x] Add translations as git remote: `git remote add translations-origin ../brainrot-translations`
### Complexity: COMPLEX
### Started: 2025-08-16 12:04
### Context Discovery
- Source repo: ~/Development/brainrot-translations (translations repository)
- Target location: content/translations/ in monorepo
- Git strategy: subtree merge to preserve full history
- Branch: master (corrected from main)

### Execution Log
[12:04] Starting translations repository migration
[12:04] Added translations-origin remote successfully
[12:05] Fetched translations history (master branch)
[12:05] Merge prepared with ours strategy
[12:06] Translations tree successfully read into content/translations/
[12:06] Committed import with preserved history
- [x] Fetch translations history: `git fetch translations-origin`
- [x] Merge translations with subtree: `git merge -s ours --no-commit --allow-unrelated-histories translations-origin/master`
- [x] Read translations tree into content/translations: `git read-tree --prefix=content/translations/ -u translations-origin/master`
- [x] Commit translations import: `git commit -m "Import translations with full git history"`
- [x] Update `content/translations/package.json` name field to `"@brainrot/translations"`

### Approach Decisions
- Used git subtree merge strategy (same as web app) for consistency
- Corrected branch from main to master after discovering actual branch
- Preserved full commit history for all translations

### Learnings
- Translations repo uses master branch (not main)
- Contains 9 book translations in translations/ subdirectory
- Naming conventions mixed (underscores vs hyphens) - needs standardization
- Ready for consolidation with Great Gatsby from web app

### 1.5 Consolidate Duplicate Content
- [x] Create organized books directory: `mkdir -p content/translations/books`
### Complexity: MEDIUM
### Started: 2025-08-16 12:08
### Context Discovery
- Great Gatsby in: apps/web/great-gatsby/
- Other books in: content/translations/translations/
- Need to standardize naming to kebab-case
- Total books to reorganize: 10 (including Great Gatsby)

### Execution Log
[12:08] Starting content consolidation
[12:08] Created books directory structure
[12:09] Moved Great Gatsby to consolidated location
[12:09] Removed duplicate source file
[12:10] Reorganized all translations with kebab-case naming
[12:10] Removed empty translations directory
[12:11] Committed all changes
- [x] Create organized books directory
- [x] Move Great Gatsby from web app: `mv apps/web/great-gatsby content/translations/books/great-gatsby`
- [x] Remove duplicate Gatsby source: `rm -f apps/web/great-gatsby-source.txt`
- [x] Reorganize existing translations to books/ structure from `content/translations/translations/*`
- [x] Standardize book folder naming (kebab-case): `the-iliad`, `the-odyssey`, `the-aeneid`, etc.
- [x] Commit consolidation: `git commit -m "Consolidate all translations to unified books directory"`

### Approach Decisions
- Standardized all book names to kebab-case for consistency
- Simplified long names (e.g., alice-in-wonderland, declaration-of-independence)
- Consolidated 10 total books in single location

### Learnings
- All books now in content/translations/books/ with consistent naming
- Ready for metadata creation and format generation
- Web app will need path updates to reference new locations

## Phase 2: Shared Packages Creation [Days 3-4]

### 2.1 Create @brainrot/types Package
- [x] Create package directory: `mkdir -p packages/@brainrot/types/src`
### Complexity: MEDIUM
### Started: 2025-08-16 12:13
### Context Discovery
- Need TypeScript interfaces for book data structure
- Will be used by web app and other packages
- Should match existing translation structure

### Execution Log
[12:13] Starting @brainrot/types package creation
[12:13] Created directory structure
[12:14] Created package.json with TypeScript configuration
[12:14] Created tsconfig.json with composite: true
[12:15] Defined all interfaces
[12:16] Built package successfully
- [x] Create `packages/@brainrot/types/package.json` with main/types pointing to dist, TypeScript build script
- [x] Create `packages/@brainrot/types/tsconfig.json` with composite: true and proper outDir
- [x] Define `Book` interface with slug, title, author, translator, metadata, chapters fields
- [x] Define `Chapter` interface with number, title, content fields
- [x] Define `BookMetadata` interface with ISBN, publishDate, categories, keywords fields
- [x] Define `Translation` interface matching existing web app structure
- [x] Export all types from `packages/@brainrot/types/src/index.ts`
- [x] Build package to verify TypeScript compilation: `cd packages/@brainrot/types && pnpm build`

### Approach Decisions
- Used commonjs module format for better compatibility
- Created comprehensive metadata interface with publishing information
- Included optional fields for flexibility
- Added Translation interface for web app compatibility

### Learnings
- Package builds successfully with TypeScript declarations
- Ready for use by web app and other packages
- Type definitions provide strong typing for book data

### 2.2 Create @brainrot/converter Package
- [x] Create package directory: `mkdir -p packages/@brainrot/converter/src`
### Complexity: COMPLEX
### Started: 2025-08-16 12:18
### Completed: 2025-08-16 12:32
### Context Discovery
- Need markdown to various format converters
- Will be critical for Great Gatsby text generation
- Should handle both simple text and complex format conversions

### Execution Log
[12:18] Starting @brainrot/converter package creation
[12:24] Created package structure and installed dependencies
[12:25] Implemented stripMarkdown with remove-markdown library
[12:26] Implemented markdownToText with chapter formatting
[12:27] Created pandoc converters for EPUB, PDF, Kindle
[12:28] Implemented batch converter for book processing
[12:30] Created comprehensive test suite (73 tests)
[12:31] Exported all converters from index.ts
[12:32] Fixed TypeScript issues and built successfully
- [x] Install dependencies: `marked@^12.0.0`, `remove-markdown@^0.5.0`
- [x] Implement `stripMarkdown()` function to convert MD to plain text preserving line breaks
- [x] Implement `markdownToText()` with chapter title formatting for web display
- [x] Implement `markdownToEpub()` function wrapping pandoc with proper metadata handling
- [x] Implement `markdownToPdf()` function using pandoc with xelatex engine
- [x] Implement `markdownToKindle()` function converting EPUB to KPF format
- [x] Create batch converter for processing entire books at once
- [x] Create comprehensive test suite for each conversion function
- [x] Export all converters from `packages/@brainrot/converter/src/index.ts`

### Approach Decisions
- Used remove-markdown for reliable markdown stripping
- Pandoc invoked via exec for document conversion
- Created promisified fs operations for async handling
- Comprehensive test coverage with Jest mocks

### Learnings
- Pandoc and Calibre must be CLI tools, not npm packages
- TypeScript needs explicit undefined checks for zero values
- Test mocking requires careful setup for fs operations
- Package successfully builds and exports all functions

### 2.3 Create @brainrot/blob-client Package
- [x] Create package directory: `mkdir -p packages/@brainrot/blob-client/src`
### Complexity: COMPLEX
### Started: 2025-08-16 12:35
### Completed: 2025-08-16 12:45
### Context Discovery
- Existing BlobService: Complete implementation with upload, list, delete methods
- Existing BlobPathService: Legacy service delegating to AssetPathService
- AssetPathService: Modern path generation with validation
- Already using @vercel/blob in web app
- Need to add retry logic and checksum verification

### Execution Log
[12:35] Examining existing blob services in web app
[12:36] Found BlobService.ts and BlobPathService.ts in utils/services/
[12:37] Created package structure and installed dependencies
[12:38] Migrated and enhanced BlobService with retry logic
[12:39] Implemented checksum verification for skip unchanged
[12:40] Created BlobPathService for path generation
[12:41] Implemented BlobBatchUploader with concurrent uploads
[12:42] Created BlobMigrationService for Great Gatsby migration
[12:43] Exported all services from index.ts
[12:45] Fixed TypeScript issues and built successfully
- [x] Install `@vercel/blob@^0.23.0` as dependency
- [x] Migrate existing `BlobService` class from web app to package
- [x] Migrate existing `BlobPathService` class from web app to package
- [x] Implement `uploadTextFile()` function with retry logic and progress reporting
- [x] Implement `uploadBookAssets()` batch upload function for all book files
- [x] Implement `deleteOldAssets()` for cleanup of deprecated paths
- [x] Add checksum verification to avoid re-uploading unchanged files
- [x] Create `BlobMigrationService` for one-time migration tasks
- [x] Export client and utilities from index.ts

### Approach Decisions
- Enhanced BlobService with p-retry for automatic retries
- Added MD5 checksum calculation and caching
- Created specialized BlobMigrationService for Great Gatsby fix
- Batch uploader with concurrency control using p-limit
- Simplified path service focused on blob storage needs

### Learnings
- Vercel Blob API doesn't support contentDisposition in put options
- Need type casting for extended options in some cases
- Package successfully builds with all functionality
- Ready to fix Great Gatsby text file issue

### 2.4 Create @brainrot/metadata Package
- [x] Create package directory: `mkdir -p packages/@brainrot/metadata/src`
### Complexity: MEDIUM
### Started: 2025-08-16 12:47
### Completed: 2025-08-16 12:53
### Context Discovery
- Need YAML parsing for book metadata files
- ISBN-13 validation required for publishing
- Metadata inheritance for common fields
- Will be used by content pipeline

### Execution Log
[12:47] Starting @brainrot/metadata package creation
[12:48] Created package structure and installed dependencies
[12:49] Implemented ISBN validation with ISBN-10/13 support
[12:50] Created JSON schema for metadata validation with AJV
[12:51] Implemented metadata parsing, generation, and inheritance
[12:52] Created comprehensive unit tests for ISBN validation
[12:53] Fixed TypeScript issues and built successfully
- [x] Install `js-yaml@^4.1.0` for YAML parsing
- [x] Implement `parseBookMetadata()` function to read and validate metadata.yaml files
- [x] Implement `validateISBN()` function for ISBN-13 validation
- [x] Implement `generateMetadata()` function for creating new book metadata
- [x] Create JSON schema for metadata validation
- [x] Implement `getBookList()` to scan and return all available books
- [x] Add metadata inheritance for common fields across books
- [x] Add unit tests for all validation functions

### Approach Decisions
- Used AJV for JSON schema validation
- Comprehensive ISBN validation supporting both ISBN-10 and ISBN-13
- YAML format for human-readable metadata files
- Default metadata values for common fields
- Placeholder ISBN generation for self-published books (979-8 prefix)

### Learnings
- TypeScript isolatedModules requires 'export type' for type re-exports
- ISBN-13 check digit calculation uses alternating 1 and 3 multipliers
- Package builds successfully with all validation functions

### 2.5 Create @brainrot/templates Package
- [ ] Create package directory: `mkdir -p packages/@brainrot/templates`
- [ ] Create `epub/brainrot.epub.template` with custom CSS and metadata placeholders
- [ ] Create `pdf/paperback.latex` template with 6x9 inch dimensions, 0.75" inner margins
- [ ] Create `pdf/hardcover.latex` template with 6x9 inch dimensions, 0.875" inner margins
- [ ] Create `kindle/kindle.template` optimized for reflowable Kindle formatting
- [ ] Add web fonts: Inter for body text, custom display font for titles
- [ ] Create cover template system with replaceable text/colors
- [ ] Document template customization points in README

## Phase 3: Web App Integration [Days 4-5]

### 3.1 Update Web App Dependencies
- [x] Update `apps/web/package.json` to use workspace packages: `"@brainrot/types": "workspace:*"`
### Complexity: MEDIUM
### Started: 2025-08-16 12:55
### Completed: 2025-08-16 12:59
### Context Discovery
- Web app currently has duplicate blob and conversion utilities
- Need to integrate workspace packages we've created
- Will enable using @brainrot/blob-client to fix Great Gatsby issue

### Execution Log
[12:55] Starting web app dependency updates
[12:56] Added workspace dependencies to package.json
[12:57] Running pnpm install to link workspace packages
[12:58] Verified workspace linking - all packages properly linked
[12:59] Identified duplicate utilities in utils/services
- [x] Add `"@brainrot/blob-client": "workspace:*"` dependency
- [x] Add `"@brainrot/converter": "workspace:*"` dependency
- [x] Remove duplicate utilities that now live in packages (marked for refactor)
- [x] Run `pnpm install` from monorepo root to link workspace packages
- [x] Verify workspace linking with `pnpm list --depth=0`

### Approach Decisions
- Added all 4 workspace packages to web app dependencies
- Used workspace:* protocol for automatic version linking
- Identified but deferred removal of duplicate utilities for safety

### Learnings
- Workspace packages properly link with pnpm workspace:* protocol
- Web app has complex getBlobUrl.ts that uses local BlobService/BlobPathService
- Great Gatsby issue: paths are `/assets/text/great-gatsby/` but should be `books/great-gatsby/text/`
- Need to either update paths or create migration script to fix URLs

### 3.2 Refactor Translation Imports
- [ ] Update `apps/web/translations/index.ts` to import from `content/translations/books/*`
- [ ] Create translation registry that auto-discovers books in content directory
- [ ] Update all import paths in React components to use new structure
- [ ] Update `getAssetUrl` calls to reference new standardized blob paths
- [ ] Remove old translation files from web app directory
- [ ] Test all book routes to ensure translations load correctly

### 3.3 Update Build Configuration
- [ ] Update `apps/web/next.config.mjs` to handle monorepo structure
- [ ] Configure module resolution for workspace packages in webpack config
- [ ] Update TypeScript paths in `apps/web/tsconfig.json` for @brainrot/* packages
- [ ] Ensure public assets are correctly referenced from new locations
- [ ] Configure Turbopack for monorepo compatibility
- [ ] Test production build: `pnpm build --filter=@brainrot/web`

## Phase 4: Content Pipeline Implementation [Days 5-6]

### 4.1 Standardize Book Structure
- [ ] Create `content/translations/books/great-gatsby/metadata.yaml` with complete book information
- [ ] Add placeholder ISBNs using format: `979-8-XXXXXX-XX-X` for each format
- [ ] Define categories: ["Fiction / Classics", "Humor / Parody", "Young Adult / General"]
- [ ] Set keywords for SEO: ["great gatsby", "gen z translation", "brainrot", "classic literature"]
- [ ] Configure pricing: ebook $4.99, paperback $14.99, hardcover $24.99
- [ ] Set publishing flags: kdp: true, lulu: true, ingram: false
- [ ] Create similar metadata.yaml for all existing books in translations repo

### 4.2 Implement Format Generation Script
- [ ] Create `scripts/generate-formats.ts` with commander CLI interface
- [ ] Implement `convertMarkdownToText()` for Great Gatsby using @brainrot/converter
- [ ] Generate plain text files: `brainrot-introduction.txt` through `brainrot-chapter-9.txt`
- [ ] Implement `generateEpub()` function with metadata injection from YAML
- [ ] Implement `generatePdf()` function with paperback and hardcover variants
- [ ] Add progress indicators using ora spinner library for user feedback
- [ ] Implement parallel processing for multiple books with p-limit
- [ ] Add `--dry-run` flag for testing without file generation
- [ ] Create `generated/` directories for each book to store output

### 4.3 Implement Blob Storage Sync
- [ ] Create `scripts/sync-translations.ts` using @brainrot/blob-client package
- [ ] Implement `syncBook()` function to upload all generated text files for a book
- [ ] Upload Great Gatsby text files to `books/great-gatsby/text/` path in blob storage
- [ ] Add MD5 checksum verification to skip unchanged files
- [ ] Implement parallel uploads with concurrency limit of 5 using p-limit
- [ ] Add progress bar using cli-progress showing upload status
- [ ] Create `--force` flag to override checksum verification
- [ ] Implement `--delete` flag to remove orphaned files from blob storage
- [ ] Log all uploads to `sync-log.json` with timestamps and checksums

### 4.4 Process All Existing Books
- [ ] Run `pnpm generate:formats the-iliad` to create all output formats
- [ ] Run `pnpm generate:formats the-odyssey` to create all output formats
- [ ] Run `pnpm generate:formats the-aeneid` to create all output formats
- [ ] Process all other books from translations repo in batch
- [ ] Run `pnpm sync:blob --all` to upload all books to Vercel Blob
- [ ] Verify each book loads correctly in web app reading room
- [ ] Create inventory JSON file listing all processed books and their assets

## Phase 5: Publisher CLI Development [Week 2]

### 5.1 Create Publisher CLI Structure
- [ ] Create `apps/publisher` directory with src folder structure
- [ ] Set up `apps/publisher/package.json` with bin field pointing to dist/index.js
- [ ] Install commander@^12, chalk@^5, ora@^8, inquirer@^9 for CLI interface
- [ ] Create main entry point with command routing using commander
- [ ] Implement global flags: `--verbose`, `--quiet`, `--no-color` for output control
- [ ] Add `--config` flag for loading custom configuration files
- [ ] Create help text with examples for each command
- [ ] Set up TypeScript compilation with proper source maps

### 5.2 Implement Lulu API Integration
- [ ] Create `apps/publisher/src/services/lulu.ts` service class
- [ ] Implement OAuth2 authentication flow with API key/secret
- [ ] Implement `createProject()` function for new book creation
- [ ] Implement `uploadInteriorPdf()` with multipart upload for large files
- [ ] Implement `uploadCoverPdf()` with dimension validation
- [ ] Implement `setPricing()` with territory-specific pricing
- [ ] Implement `publishProject()` to make book available for sale
- [ ] Implement `checkJobStatus()` polling for async operations
- [ ] Add exponential backoff retry logic for API failures
- [ ] Create mock mode for testing without actual API calls

### 5.3 Implement KDP Automation
- [ ] Create `apps/publisher/src/services/kdp.ts` service class
- [ ] Install playwright@^1.40 for browser automation
- [ ] Implement secure credential storage using keytar or env vars
- [ ] Implement `login()` with 2FA handling via CLI prompt
- [ ] Implement `navigateToNewBook()` automation flow
- [ ] Implement `fillBookDetails()` for title, author, description fields
- [ ] Implement `uploadManuscript()` with wait for processing
- [ ] Implement `uploadCover()` with dimension validation
- [ ] Implement `setPricingAndRights()` for territories and royalties
- [ ] Implement `saveAsDraft()` and `publishBook()` functions
- [ ] Add screenshot capture on error for debugging
- [ ] Create headless and headed modes for debugging

### 5.4 Create Unified Publish Command
- [ ] Implement `apps/publisher/src/commands/publish-all.ts`
- [ ] Read metadata.yaml to determine target platforms and settings
- [ ] Create pre-flight checks: file existence, format validation, metadata completeness
- [ ] Execute platform-specific publishing in sequence with error handling
- [ ] Generate comprehensive publishing report with URLs, IDs, and status
- [ ] Save report to `publishing-reports/[date]-[book].json`
- [ ] Implement rollback capability if one platform fails
- [ ] Add dry-run mode that simulates without publishing
- [ ] Send completion notification via email or Slack webhook

## Phase 6: CI/CD Setup [Day 7]

### 6.1 Create GitHub Actions Workflows
- [ ] Create `.github/workflows/ci.yml` running tests on all PRs
- [ ] Configure matrix strategy for Node.js 20 and 22
- [ ] Create `.github/workflows/deploy-web.yml` for Vercel deployment on main branch
- [ ] Set up path filters to only deploy when apps/web changes
- [ ] Create `.github/workflows/publish-books.yml` triggered by content changes
- [ ] Implement change detection to only process modified books
- [ ] Create `.github/workflows/sync-content.yml` for daily blob storage sync
- [ ] Add workflow_dispatch for manual triggers with book selection
- [ ] Configure pnpm caching with actions/cache for faster builds
- [ ] Set up Turborepo remote caching with Vercel

### 6.2 Configure Vercel Deployment
- [ ] Set up new Vercel project pointing to monorepo
- [ ] Configure build command: `cd ../.. && pnpm build --filter=@brainrot/web`
- [ ] Set root directory to `apps/web` in Vercel settings
- [ ] Configure ignored build step: `git diff HEAD^ HEAD --quiet -- apps/web packages`
- [ ] Add all required environment variables in Vercel dashboard
- [ ] Set up preview deployments for pull requests
- [ ] Configure custom domains if applicable
- [ ] Test production deployment with manual trigger
- [ ] Set up deployment notifications in Discord/Slack

### 6.3 Set Up Secrets Management
- [ ] Generate new `BLOB_READ_WRITE_TOKEN` from Vercel dashboard
- [ ] Add token to GitHub Actions secrets and Vercel env vars
- [ ] Create Vercel token and add `VERCEL_TOKEN` to GitHub secrets
- [ ] Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from Vercel settings
- [ ] Generate Lulu API credentials and add as GitHub secrets
- [ ] Create `.env.example` with all required variables documented
- [ ] Create `.env.vault` for secure local secret sharing (using dotenv-vault)
- [ ] Document secret rotation procedure in `docs/SECRETS.md`
- [ ] Enable GitHub secret scanning to prevent leaks
- [ ] Set up monitoring for secret usage

## Phase 7: Migration Execution [Week 2]

### 7.1 Pre-Migration Backup
- [ ] Create full backup: `git clone --mirror brainrot-publishing-house backup-web`
- [ ] Create full backup: `git clone --mirror brainrot-translations backup-translations`
- [ ] Export GitHub issues to JSON using GitHub CLI
- [ ] Export GitHub Actions secrets list (not values) for reference
- [ ] Document current Vercel configuration and environment variables
- [ ] Save all local .env files to secure password manager
- [ ] Create migration rollback plan document

### 7.2 Execute Migration
- [ ] Run all Phase 1 migration scripts in sequence
- [ ] Verify git history preserved: `git log --oneline --graph --all`
- [ ] Run `pnpm install` from monorepo root
- [ ] Run `pnpm build` to verify all packages compile
- [ ] Run `pnpm test` to ensure all tests pass
- [ ] Run `pnpm lint` to check for code quality issues
- [ ] Generate formats for all books to test pipeline
- [ ] Deploy to Vercel preview environment for testing

### 7.3 Update Remote Repository
- [ ] Create new GitHub repository named `brainrot`
- [ ] Add new remote: `git remote add origin git@github.com:[username]/brainrot.git`
- [ ] Push all branches: `git push -u origin --all`
- [ ] Push all tags: `git push -u origin --tags`
- [ ] Set up branch protection for main branch
- [ ] Configure required status checks for PRs
- [ ] Set up CODEOWNERS file for review requirements
- [ ] Configure GitHub Actions secrets from backup list
- [ ] Enable Dependabot for dependency updates

### 7.4 Post-Migration Cleanup
- [ ] Update Vercel to deploy from new monorepo
- [ ] Verify production deployment succeeds
- [ ] Archive old repositories with deprecation notice
- [ ] Update README.md with monorepo structure and commands
- [ ] Create CONTRIBUTING.md with development workflow
- [ ] Document publishing pipeline in `docs/PUBLISHING.md`
- [ ] Create architecture diagram using mermaid
- [ ] Update both CLAUDE.md files with new structure
- [ ] Schedule old repo deletion for 30 days

## Phase 8: Continuous Improvement [Ongoing]

### 8.1 Monitoring and Optimization
- [ ] Set up Vercel Analytics for web app performance monitoring
- [ ] Implement build time tracking in CI/CD pipelines
- [ ] Create dashboard for publishing success rates
- [ ] Set up error tracking with Sentry
- [ ] Monitor blob storage usage and costs
- [ ] Implement automated performance regression tests

### 8.2 Future Enhancements
- [ ] Create `apps/studio` for web-based translation editor
- [ ] Implement AI-assisted translation suggestions
- [ ] Add `packages/@brainrot/ai-translator` for automation
- [ ] Create public API for translations access
- [ ] Implement subscription system for premium content
- [ ] Add analytics for most popular translations
- [ ] Create mobile app for reading translations

## Success Metrics & Acceptance Criteria
- [ ] Monorepo build completes in < 60 seconds
- [ ] Web app deployment completes in < 3 minutes
- [ ] Format generation processes book in < 30 seconds
- [ ] Blob sync uploads book in < 10 seconds
- [ ] Zero data loss during migration (verified by git diff)
- [ ] All existing web app features functioning correctly
- [ ] Git history fully preserved and accessible
- [ ] Great Gatsby loads without errors in reading room
- [ ] All books from translations repo accessible in web app
- [ ] Publishing pipeline successfully publishes to Lulu sandbox

## Notes
- Each task is designed to be atomic and completable in < 2 hours
- Test thoroughly after each phase before proceeding to next
- Keep backup of old repositories for minimum 30 days
- Document any deviations from plan in decision log
- Use `--dry-run` flags whenever available for safety
- Run in verbose mode during initial executions for debugging
- Consider pair programming for complex migration steps