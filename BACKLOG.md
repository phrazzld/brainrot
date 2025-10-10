# BACKLOG

## High Priority (HIGH)

Code health issues, security enhancements, and architectural improvements with significant quality impact.

### Security & Compliance

- [ ] [HIGH] [SECURITY] Implement rate limiting for download API with @vercel/rate-limit | Effort: S | Quality: 8/10 | Target: 100 req/min per IP
- [ ] [HIGH] [SECURITY] Add Content Security Policy headers in Next.js config | Effort: S | Quality: 9/10 | Target: Block XSS and injection attacks
- [ ] [HIGH] [SECURITY] Strengthen input validation in download API with allowlist patterns | Effort: M | Quality: 8/10 | Target: Zero path traversal vulnerabilities

### Quality & Testing

- [ ] [HIGH] [QUALITY] Eliminate 97 ESLint disable statements across codebase | Effort: M | Quality: 8/10 | Target: Zero eslint-disable except legacy files
- [ ] [HIGH] [QUALITY] Remove 114 console.log debug statements and implement structured logging | Effort: S | Quality: 7/10 | Target: Replace with proper logger
- [ ] [HIGH] [QUALITY] Standardize on ESLint v9 flat config across all packages | Effort: M | Quality: 7/10 | Target: Single ESLint version
- [ ] [HIGH] [DX] Fix failing ISBN tests blocking CI pipeline | Effort: S | ROI: 30 min/dev/day saved + unblocked deployments

### Architecture & Simplification

- [ ] [HIGH] [SIMPLIFY] Delete 68 migration scripts (archive directory) | Effort: S | Reduction: 30% code removed, 15k+ lines eliminated
- [ ] [HIGH] [SIMPLIFY] Remove audio infrastructure (@aws-sdk, wavesurfer) | Effort: M | Reduction: 25% bundle size, 8k+ lines removed
- [ ] [HIGH] [SIMPLIFY] Focus on KDP only, remove Lulu + IngramSpark automation | Effort: L | Reduction: 60% publishing complexity
- [ ] [HIGH] [ALIGN] Refactor download route into focused services with explicit contracts | Effort: M | Principle: Modularity over monolithic magic

### Performance & Developer Experience

- [ ] [HIGH] [PERF] Enable Turborepo remote caching for CI builds | Effort: S | ROI: 80% faster CI builds, 10-15 min saved per build
- [ ] [HIGH] [DX] Consolidate 166 web app scripts into categorized commands | Effort: M | ROI: 15 min/task saved + better discoverability
- [ ] [HIGH] [FEATURE] AI Translation Consistency Engine for quality control | Effort: M | Quality: 9/10 | Innovation: Automated style fingerprinting

## Medium Priority (MEDIUM)

Valuable improvements, features, and optimizations with measurable impact.

### Security & Infrastructure

- [ ] [MEDIUM] [SECURITY] Configure GitHub Actions secrets with pull_request_target | Effort: S | Impact: Prevent secret exposure via malicious PRs
- [ ] [MEDIUM] [SECURITY] Add automated dependency scanning with Dependabot/Snyk | Effort: S | Impact: Early detection of vulnerable dependencies
- [ ] [MEDIUM] [SECURITY] Implement OAuth2 authentication for publisher CLI | Effort: L | Impact: Prevent unauthorized publishing access

### Quality & Documentation

- [ ] [MEDIUM] [QUALITY] Implement type safety - eliminate 108 'any' usages | Effort: M | Quality: 7/10 | Target: <10 any usages in core packages
- [ ] [MEDIUM] [QUALITY] Extract migration scripts to separate archived package | Effort: L | Quality: 8/10 | Target: Web app <50% current LOC
- [ ] [MEDIUM] [QUALITY] Add comprehensive JSDoc to 12+ undocumented public functions | Effort: S | Quality: 6/10 | Target: 100% public API documentation

### Simplification & Performance

- [ ] [MEDIUM] [SIMPLIFY] Consolidate 5 @brainrot packages into 2 (core + templates) | Effort: M | Reduction: 40% package complexity
- [ ] [MEDIUM] [SIMPLIFY] Replace Turborepo with standard Next.js build | Effort: M | Reduction: 30% build complexity for 2 apps
- [ ] [MEDIUM] [PERF] Add progressive image loading with Next.js Image | Effort: M | ROI: 30% bundle reduction, 2-3x faster loads
- [ ] [MEDIUM] [PERF] Parallelize content processing to use all CPU cores | Effort: L | ROI: 50% faster generation for 124 files

### Features & Innovation

- [ ] [MEDIUM] [FEATURE] Smart Content Validation Pipeline with pre-commit hooks | Effort: M | Quality: 8/10 | Innovation: Automated quality gates
- [ ] [MEDIUM] [FEATURE] Interactive Translation Workspace with live preview | Effort: L | Quality: 7/10 | Innovation: Streamlined content creation
- [ ] [MEDIUM] [FEATURE] Gen Z Glossary with contextual definitions | Effort: S | Quality: 9/10 | Innovation: Bridge generational gaps
- [ ] [MEDIUM] [FEATURE] Unified Content API (GraphQL/tRPC) | Effort: S | Quality: 9/10 | Innovation: Single endpoint for all formats

### Technical Debt

- [ ] [MEDIUM] [ALIGN] Implement bounded caching with TTL in BlobService | Effort: M | Principle: Resource efficiency, prevent memory leaks
- [ ] [MEDIUM] [ALIGN] Create centralized credential management layer | Effort: M | Principle: Security by design, not scattered obscurity
- [ ] [MEDIUM] [DX] Create automated environment setup script with validation | Effort: M | ROI: 10 min/onboarding saved

## Low Priority (LOW)

Nice-to-have improvements and future considerations.

### Optimizations

- [ ] [LOW] [SIMPLIFY] Remove unused dependencies (Puppeteer, GSAP) | Effort: S | Reduction: 15% bundle size
- [ ] [LOW] [SIMPLIFY] Direct blob conversion instead of generated files | Effort: L | Reduction: 40% storage complexity
- [ ] [LOW] [PERF] Implement CDN layer for blob storage | Effort: M | Value: Better global performance

### Features

- [ ] [LOW] [FEATURE] Community Translation Suggestions via GitHub Issues | Effort: M | Quality: 7/10 | Innovation: Crowdsourced improvements
- [ ] [LOW] [FEATURE] Universal Reading Progress Sync with Vercel KV | Effort: S | Quality: 7/10 | Innovation: Privacy-first bookmarks
- [ ] [LOW] [FEATURE] Automated Platform Intelligence for publishing strategy | Effort: L | Quality: 8/10 | Innovation: AI-driven insights

### Future Enhancements

- [ ] [LOW] Create apps/studio for web-based translation editor | Effort: L | Note: Consider after core platform stabilizes
- [ ] [LOW] Add public API for translations | Effort: M | Note: Evaluate demand first
- [ ] [LOW] Implement subscription system | Effort: L | Note: After reaching 50+ books

## Quality Gates & Automation

Dedicated section for quality enforcement mechanisms and automation.

### Pre-commit Hooks

- [ ] [HIGH] Add TypeScript strict mode enforcement | Effort: S | Impact: Prevent type errors before commit
- [ ] [HIGH] Add complexity threshold checks (CC <10) | Effort: S | Impact: Maintain code simplicity
- [ ] [MEDIUM] Add bundle size monitoring | Effort: S | Impact: Track growth per commit

### CI/CD Improvements

- [ ] [HIGH] Parallelize lint/typecheck/test jobs | Effort: S | Time saved: 5-8 minutes per build
- [ ] [MEDIUM] Add performance regression detection | Effort: M | Impact: Catch slowdowns early
- [ ] [MEDIUM] Add documentation coverage tracking | Effort: S | Impact: Maintain docs quality

### Monitoring & Observability

- [ ] [MEDIUM] Set up Vercel Analytics | Effort: S | Impact: Privacy-first usage insights
- [ ] [LOW] Implement error tracking with Sentry | Effort: M | Impact: Proactive issue detection
- [ ] [LOW] Create publishing success dashboard | Effort: M | Impact: Track platform performance

## Documentation & Knowledge

Inline comments, README updates, architectural documentation, and knowledge management.

- [ ] [MEDIUM] Document security best practices and threat model | Effort: M | Value: Team security awareness
- [ ] [MEDIUM] Create runbooks for common operations | Effort: M | Value: Reduced support burden
- [ ] [LOW] Add architecture decision records (ADRs) | Effort: M | Value: Historical context

---

## KDP CLI Future Enhancements

### Phase 2: Analytics & Advanced Reporting (MEDIUM Priority)

- [ ] [MEDIUM] Add `kdp reports monthly` command with CSV/JSON export | Effort: M | Value: Automated reporting workflow
  - Navigate to reports section, filter by date range
  - Download monthly royalty reports automatically
  - Parse CSV and present in terminal tables
  - Export to JSON for further processing
  - Estimated time: 6-8 hours

- [ ] [MEDIUM] Add `kdp analytics` command with deep dive insights | Effort: M | Value: Better sales visibility
  - Aggregate sales across all books and marketplaces
  - Calculate trends (week-over-week, month-over-month)
  - Show best/worst performing books
  - KENP vs purchase breakdown
  - Estimated time: 8-10 hours

- [ ] [MEDIUM] Add `kdp reports download` for bulk report retrieval | Effort: M | Value: Historical data analysis
  - Download all available report types (sales, tax, royalty)
  - Save to local directory with organized naming
  - Support date range filtering
  - Estimated time: 4-6 hours

### Phase 3: Write Operations & Book Updates (HIGH Priority)

- [ ] [HIGH] Add `kdp book update` command for metadata changes | Effort: L | Value: Critical for book management
  - Update pricing: `kdp book update <asin> --price-us=9.99 --price-uk=7.99`
  - Update keywords: `kdp book update <asin> --keywords="gatsby,classic,brainrot"`
  - Update description: `kdp book update <asin> --description-file=new-desc.txt`
  - Navigate to book edit page, fill forms, save changes
  - Verify changes were applied successfully
  - Estimated time: 10-12 hours

- [ ] [HIGH] Add `kdp book unpublish` command | Effort: M | Value: Book lifecycle management
  - Navigate to book page
  - Click unpublish/take offline button
  - Confirm action
  - Verify status changed to 'unpublished'
  - Estimated time: 4-6 hours

- [ ] [MEDIUM] Add `kdp book clone` command | Effort: M | Value: Speed up similar book creation
  - Clone existing book metadata to new listing
  - Useful for creating series or similar translations
  - Prompts for fields that must change (title, ASIN, etc.)
  - Estimated time: 6-8 hours

### Phase 4: Performance Optimization via API Interception (HIGH Priority)

- [ ] [HIGH] Implement network request interception layer | Effort: L | Value: 10x faster operations
  - Add Playwright request/response interception
  - Log all API calls during manual navigation
  - Extract GraphQL/REST endpoint patterns
  - Document discovered endpoints in codebase
  - Estimated time: 8-10 hours

- [ ] [HIGH] Build direct API client for hot paths | Effort: L | Value: Sub-second response times
  - Extract session cookies and CSRF tokens
  - Implement `KdpApiClient` class for direct HTTP calls
  - Migrate `listBooks()` to use GraphQL (if available)
  - Migrate `getSalesData()` to use REST endpoint (if available)
  - Fallback to browser automation if API calls fail
  - Estimated time: 12-16 hours

- [ ] [MEDIUM] Implement session token refresh mechanism | Effort: M | Value: Avoid re-login overhead
  - Detect token expiration (401/403 responses)
  - Silently refresh session via headless browser
  - Cache tokens with 30-minute TTL
  - Estimated time: 6-8 hours

- [ ] [MEDIUM] Add request/response caching with Redis/local file | Effort: M | Value: Offline-capable reads
  - Cache book list, details, sales data locally
  - Configurable TTL per data type
  - `--no-cache` flag to force refresh
  - Estimated time: 6-8 hours

### Phase 5: Bulk Operations & Advanced Workflows (MEDIUM Priority)

- [ ] [MEDIUM] Add `kdp bulk update` command with CSV input | Effort: L | Value: Manage 10+ books efficiently
  - Read CSV file with columns: asin, field, new_value
  - Batch update multiple books
  - Progress bar showing N/M updates complete
  - Error handling: Continue on failure, report errors at end
  - Estimated time: 10-12 hours

- [ ] [MEDIUM] Add `kdp bulk export` command | Effort: M | Value: Backup entire catalog
  - Export all books to JSON/CSV
  - Include all metadata, pricing, sales data
  - Creates snapshot of entire KDP account
  - Useful for migrations, backups, analysis
  - Estimated time: 6-8 hours

- [ ] [LOW] Add `kdp watch` daemon mode | Effort: L | Value: Automated monitoring
  - Run in background, periodically sync KDP data
  - Detect changes (new sales, status changes)
  - Send notifications (terminal, email, webhook)
  - Configurable sync interval (hourly, daily)
  - Estimated time: 12-16 hours

- [ ] [LOW] Add interactive TUI mode with `ink` | Effort: L | Value: Better UX for frequent users
  - Terminal UI with keyboard navigation
  - Real-time updates, live tables
  - Multi-pane view (books list + details)
  - Vim-style keybindings
  - Estimated time: 16-20 hours

### Phase 6: Local Database & Offline Support (LOW Priority)

- [ ] [LOW] Implement SQLite local database for KDP data | Effort: XL | Value: Blazing fast queries
  - Schema: books, formats, pricing, sales tables
  - Sync engine: Bidirectional sync with KDP
  - Conflict resolution: Last-write-wins strategy
  - All reads from local DB (instant), periodic background sync
  - Estimated time: 20-24 hours

- [ ] [LOW] Add `kdp sync` command for manual sync triggers | Effort: M | Value: User control over sync
  - Pull latest from KDP, update local DB
  - Push pending local changes to KDP
  - Show sync summary (added/updated/deleted)
  - Estimated time: 6-8 hours

- [ ] [LOW] Add SQL query support for advanced filtering | Effort: M | Value: Power user workflows
  - `kdp query "SELECT * FROM books WHERE status='live' AND royalty > 100"`
  - Direct SQL access to local database
  - Export results to CSV/JSON
  - Estimated time: 4-6 hours

### Technical Debt & Infrastructure

- [ ] [MEDIUM] Extract KDP client into standalone NPM package | Effort: L | Value: Reusable across projects
  - Create `@brainrot/kdp-client` or `playwright-kdp-automation`
  - Publish to npm registry
  - Separate from publisher CLI (single responsibility)
  - Enables other developers to use KDP automation
  - Potential revenue: Consulting, support contracts
  - Estimated time: 12-16 hours

- [ ] [LOW] Add Playwright test fixtures for KDP pages | Effort: M | Value: Faster test development
  - Create reusable page object models
  - Mock KDP responses for integration tests
  - Snapshot testing for UI structure changes
  - Estimated time: 8-10 hours

- [ ] [LOW] Implement rate limiting to avoid KDP throttling | Effort: S | Value: Prevent account issues
  - Max 10 requests/minute to KDP
  - Queue-based request management
  - Backoff strategy on 429 responses
  - Estimated time: 4-6 hours
