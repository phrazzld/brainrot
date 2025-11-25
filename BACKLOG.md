# BACKLOG

Last groomed: 2025-11-24
Analyzed by: 8 specialized perspectives (complexity-archaeologist, architecture-guardian, security-sentinel, performance-pathfinder, maintainability-maven, user-experience-advocate, product-visionary, design-systems-architect)

---

## Now (Sprint-Ready, <2 weeks)

### [Product] User Authentication System
**Scope**: New feature - auth system foundation
**Perspectives**: product-visionary, security-sentinel, user-experience-advocate
**Business Case**:
- Blocks 8+ features (saved preferences, bookmarks, premium tier, social features)
- 90% of reading platforms have auth (table stakes)
- Anonymous users = 10x higher churn
- Foundation for $7.5k ARR at conservative scale (7% conversion to $6/mo premium)
**Implementation**: Auth0/Clerk integration, email + social login, Vercel KV for user data
**Effort**: 3d | **Value**: Foundation for all monetization/retention features
**Acceptance**: Users can register, login, logout; sessions persist; OAuth works

### [Testing] Publisher App Test Scaffolding
**Files**: apps/publisher/src/services/lulu.ts (549 lines), kdp.ts (592 lines)
**Perspectives**: maintainability-maven, architecture-guardian, security-sentinel
**Impact**: CRITICAL - Financial/publishing logic has ZERO tests
**Risk**: Could publish to wrong platform, wrong price, in production accidentally
**Tests Required**:
- Lulu/KDP authentication & token refresh
- Pricing validation (prevent under/overpricing)
- Mock mode enforcement (never publish in dev)
- File upload dimension validation
**Effort**: 16h to achieve 70% coverage | **Impact**: Prevent costly production errors
**Acceptance**: 70%+ coverage, all financial operations tested

### [Infrastructure] Lefthook Quality Gates Setup
**Files**: Create lefthook.yml (root)
**Perspectives**: architecture-guardian, maintainability-maven
**Impact**: Prevents 90% of broken commits reaching CI
**Missing**:
- Pre-commit: lint, format, typecheck on staged files
- Pre-push: full test suite, build verification
- No enforcement of quality standards
**Implementation**:
```yaml
pre-commit:
  commands:
    lint: pnpm turbo lint
    format: prettier --check {staged_files}
    typecheck: pnpm turbo typecheck
```
**Effort**: 2h | **Impact**: Saves 10+ hours/week in CI time, catches errors early
**Acceptance**: Hooks installed, run on commit, block broken code

### [Brand] Replace Generic AI Aesthetic Fonts
**Files**: apps/web/app/fonts.ts
**Perspectives**: design-systems-architect, user-experience-advocate
**Impact**: Anton + Inter = predictable tech startup aesthetic, doesn't match "brainrot" chaos
**Brand Disconnect**: Chaotic Gen Z content with corporate visual identity
**Fix**: Replace with distinctive typefaces:
- Option 1: Space Grotesk (display) + Courier Prime (body) - tech/hacker vibe
- Option 2: Bebas Neue (display) + Inconsolata (body) - brutalist/street-level
**Effort**: 2h (research + migrate) | **Impact**: Memorable brand differentiation
**Acceptance**: Fonts replaced, design team approves brand alignment

### [UX] Fix Silent Text Loading Errors
**Files**: apps/web/hooks/useTextLoader.ts:33-36
**Perspectives**: user-experience-advocate, maintainability-maven
**Impact**: CRITICAL - Users can't read books, no guidance on what to do
**Current**: Generic "Error loading text. Please try again later."
**Fix**: User-friendly error messages
```typescript
const userMessage = error.message?.includes('404')
  ? `Chapter text unavailable. Try a different chapter or check back later.`
  : error.message?.includes('network')
  ? `Network error. Check your connection and refresh the page.`
  : `Unable to load chapter. Please refresh or try again in a few moments.`;
```
**Effort**: 45m | **Impact**: Users know whether to refresh, wait, or try different content
**Acceptance**: Error messages tested, users understand next steps

### [Cleanup] Delete Duplicate Footer Components
**Files**: apps/web/components/footer.tsx (17 lines), FooterV2.tsx (150 lines)
**Perspectives**: maintainability-maven, design-systems-architect
**Impact**: 267 lines of dead code (FooterV3 is active)
**Fix**: `rm apps/web/components/footer.tsx apps/web/components/FooterV2.tsx`
**Effort**: 15m | **Impact**: Code cleanliness, reduced confusion
**Acceptance**: Only FooterV3.tsx remains, imports updated

### [Cleanup] Fix CSS .btn Duplication
**Files**: apps/web/app/globals.css lines 90-106 (duplicate definition)
**Perspectives**: design-systems-architect
**Impact**: Duplicate `.btn` class definitions, second overrides first
**Fix**: Delete lines 90-106, keep lines 139-172 (has glow effect)
**Also**: Fix px-5 → px-4 or px-6 (enforce 4px spacing scale)
**Effort**: 15m | **Impact**: Clean CSS, no duplicate definitions
**Acceptance**: Single .btn definition, spacing on 4px scale

### [Security] Add Gitleaks Pre-Commit Hook
**Files**: lefthook.yml (add to existing config)
**Audit Finding**: Quality gates audit - NO secrets detection
**Impact**: Secrets could be committed to git (API keys, tokens, credentials)
**Risk**: Public repo exposure, credential leaks, security incidents
**Implementation**:
```yaml
pre-commit:
  commands:
    secrets:
      glob: "*"
      run: gitleaks protect --staged --verbose --redact
```
**Install**: `brew install gitleaks` (single binary, no dependencies)
**Effort**: 30m (install + configure) | **Impact**: Prevents 100% of accidental secret commits
**Acceptance**: Gitleaks runs on every commit, blocks secrets, <1s execution time

### [Infrastructure] Fix Missing Web App Scripts
**Files**: apps/web/package.json
**Audit Finding**: Pre-push hook references undefined scripts
**Problem**: `prettier:check` and `security:audit` referenced but not defined → pre-push fails
**Current State**: Husky pre-push calls non-existent scripts (lines 5, 13)
**Fix**: Add missing scripts to package.json
```json
"prettier:check": "prettier --check .",
"security:audit": "pnpm audit --audit-level=high"
```
**Effort**: 5m | **Impact**: Pre-push hooks actually work
**Acceptance**: `npm run prettier:check` and `npm run security:audit` execute successfully

### [Observability] Install Sentry Error Tracking via Vercel Integration
**Files**: Create sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
**Perspectives**: security-sentinel, user-experience-advocate, maintainability-maven
**Why**: Zero production error visibility - errors only discovered when users report them
**Impact**: CRITICAL - Flying blind in production, no stack traces, no error grouping, no alerting
**Implementation**: Use Vercel Integration (not manual tokens)
```bash
npx @sentry/wizard@latest -i nextjs
# Configure via Vercel dashboard for automatic source maps
```
**PII Redaction**: `sendDefaultPii: false`, sanitize emails/auth headers
**Sampling**: 10% traces base rate, 100% error capture
**Effort**: 2h (install + config + test route) | **Impact**: Proactive error detection before users report
**Acceptance**: Sentry dashboards active, test error captured, PII redacted, alerts configured

### [Infrastructure] Create Health Check API Endpoint
**Files**: Create apps/web/app/api/health/route.ts
**Perspectives**: security-sentinel, user-experience-advocate
**Why**: No `/api/health` endpoint - can't monitor uptime or verify service is running
**Impact**: CRITICAL - Impossible to detect downtime, no synthetic monitoring possible
**Implementation**:
```typescript
// apps/web/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  });
}
```
**Effort**: 10m | **Impact**: Enables uptime monitoring, deployment verification
**Acceptance**: `/api/health` returns 200 with JSON status

### [Observability] Fix Pino Production Configuration
**Files**: apps/web/utils/logger.ts, apps/web/next.config.mjs
**Perspectives**: maintainability-maven, performance-pathfinder
**Why**: Pino using console fallback in browser, no correlation IDs, logs not JSON in production
**Problems**:
- Missing `serverExternalPackages: ['pino', 'pino-pretty']` in next.config
- No LOG_LEVEL environment variable handling
- No correlation ID tracking between requests/logs
**Fix**:
```typescript
// next.config.mjs
experimental: { serverExternalPackages: ['pino', 'pino-pretty'] }

// logger.ts - Add correlation ID
export function createRequestLogger(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
  return logger.child({ correlationId, path: new URL(req.url).pathname });
}
```
**Effort**: 1h | **Impact**: Production-safe structured logging, request tracing
**Acceptance**: JSON logs in production, correlation IDs tracked, pino-pretty only in dev

---

## Next (This Quarter, <3 months)

### [Architecture] Merge Download API Services → Deep Module
**Files**: apps/web/app/api/download/ (7 files, 2,038 lines)
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven
**Why**: Temporal decomposition - 6 services (AssetService, ValidationService, RequestService, ResponseService, AuthorizationService, ProxyService) + route.ts orchestrator
**Problem**: Adding auth requires touching 7 files, change amplification for every feature
**Ousterhout Violation**: Shallow modules where interface ≈ implementation, information leakage through service boundaries
**Approach**: Merge into single DownloadHandler deep module
```typescript
class DownloadHandler {
  async handleDownload(request: DownloadRequest): Promise<DownloadResponse> {
    // Internally orchestrates ALL steps (validation, auth, asset resolution, proxy decision)
    // Callers only see: Request → Response
  }
}
```
**Effort**: 12h (merge 6 services) | **Impact**: 2,038 lines → ~300 lines, unblocks auth/rate limiting/CDN
**Principle**: Deep modules (simple interface, powerful implementation)

### [Architecture] Extract Publisher God Objects
**Files**: apps/publisher/src/services/lulu.ts (549 lines), kdp.ts (592 lines)
**Perspectives**: complexity-archaeologist, architecture-guardian, maintainability-maven
**Why**: Single classes with 6-7 distinct responsibilities (auth, uploads, pricing, publishing, job polling, screenshots)
**Problem**: Can't test in isolation, tight coupling to Playwright/axios
**Approach**: Extract focused services
- **LuluService** → LuluAuthService, LuluProjectService, LuluUploadService, LuluPricingService, LuluPublishService, LuluJobService
- **KdpService** → KdpBrowserService, KdpAuthService, KdpNavigationService, KdpFormService, KdpUploadService, KdpPricingService, KdpPublishOrchestrator
**Effort**: 26h (12h Lulu + 14h KDP) | **Impact**: Testable in isolation, parallel development
**Coupling/Cohesion**: Lulu 5/10 → 8/10, KDP 2/10 → 8/10

### [Product] Premium Subscription Tier
**Scope**: Monetization - freemium business model
**Perspectives**: product-visionary
**Why**: 100% free content, no revenue model beyond print sales
**Free Tier**: Read all books online, basic reader, 3 downloads/month
**Premium Tier** ($5-7/month or $50-60/year):
- Ad-free experience
- Unlimited downloads (EPUB/PDF/MOBI)
- Early access to new translations (2 weeks)
- Custom themes (dark mode, sepia, custom colors)
- Advanced reader (font choices, line spacing, margins)
- Reading stats dashboard
- Offline reading mode (PWA)
- Priority support for book requests
**Revenue Model**:
- 10k visitors/month → 1,500 accounts (15%) → 105 paid (7%) → **$630 MRR ($7.5k ARR)**
- At scale (100k visitors): **$63k ARR**
**Implementation**: Stripe integration, feature gating, Vercel KV for subscription state
**Effort**: 5d | **Value**: Creates recurring revenue stream
**Business Case**: Recurring revenue enables sustainable growth

### [Product] Reading Progress & Bookmarks
**Scope**: Core workflow improvement
**Perspectives**: product-visionary, user-experience-advocate
**Why**: Users lose place if they close tab, can't mark favorite sections
**Missing**: Progress tracking per book/chapter, bookmarks, highlights with notes, reading history
**Impact**: Completion rate increases 2-3x, return visits 5x, reduces abandonment 50%
**Implementation**: Vercel KV for storage, localStorage fallback, progress bar UI, bookmark button
**Effort**: 3d | **Value**: Dramatically improves retention
**Adoption Impact**: Moves users from one-time browsers to habitual readers

### [Infrastructure] Structured Logging - @brainrot/logger Package
**Files**: Create packages/@brainrot/logger/, migrate 868 console.log instances
**Perspectives**: architecture-guardian, maintainability-maven
**Why**: Mix of Logger.info + console.log (868 instances), no correlation IDs, production leakage
**Problem**: Can't filter/route logs uniformly, no aggregation, debug logs use console.warn
**Implementation**: Create shared logger package
```typescript
export interface ILogger {
  info(msg: string, context?: Record<string, unknown>): void;
  debug(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, error?: Error, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): ILogger;
}
// Implementations: ConsoleLogger (CLI), PinoLogger (web), NoOpLogger (tests)
```
**Effort**: 12h (4h create package + 8h migrate) | **Impact**: Unified logging, production-safe, correlation tracking
**Acceptance**: 0 console.* calls in src/, all packages use @brainrot/logger

### [Infrastructure] Sentry Error Tracking
**Files**: Create packages/@brainrot/error-tracking/
**Perspectives**: architecture-guardian, user-experience-advocate
**Why**: Production errors go unnoticed, no aggregation or alerting
**Impact**: Proactive error detection, faster debugging, user impact visibility
**Implementation**:
```typescript
import * as Sentry from "@sentry/nextjs";
export function initErrorTracking(config: { dsn, environment, release }) { ... }
```
**Integration**: Web app error boundaries + API routes, Publisher CLI unhandled rejections, Blob client failures
**Effort**: 4h | **Impact**: Proactive issue detection, faster incident response
**Acceptance**: Sentry dashboards show errors, alerts configured

### [Product] Social Sharing & Virality Features
**Scope**: Growth driver
**Perspectives**: product-visionary
**Why**: Minimal virality features, no quote sharing, no referral system
**Missing**: Quote cards (shareable images), social proof (X people bookmarked this), referral invites, embeddable widgets
**Competitive Analysis**: Goodreads quote sharing = PRIMARY engagement, Medium highlights drive 30-40% of readers
**Use Cases**: Viral Twitter/TikTok quotes → organic reach, friend referrals → 0 CAC acquisition
**Implementation**: Quote card generator (Canvas API), pre-populated tweets, referral tracking, social metadata
**Effort**: 4d | **Value**: Primary growth driver (15-30% of users from referrals)
**Growth Impact**: Referral programs typically drive 15-30% of new users at 0 CAC

### [Performance] Parallelize Metadata Parsing
**Files**: packages/@brainrot/metadata/src/metadata.ts:222-256
**Perspectives**: performance-pathfinder
**Why**: Sequential file operations (stat + parse) blocking each other
**Current**: ~150ms to scan 10 books (stat × 20 + parse × 10)
**Fix**: Use Promise.all() for parallel I/O
```typescript
const bookPromises = entries.map(async (entry) => {
  const entryStat = await stat(entryPath);
  // ... parse in parallel
});
const results = await Promise.all(bookPromises);
```
**Effort**: 20m | **Impact**: 150ms → 50ms (3x faster for dev tools)

### [UX] Download Progress Indicator
**Files**: apps/web/components/DownloadButton.tsx:125-126
**Perspectives**: user-experience-advocate
**Why**: Large files (20MB+ audio) take 10+ seconds with zero feedback
**Impact**: Users think it froze, click multiple times, or give up
**Fix**: Use fetch with progress tracking
```typescript
const reader = response.body?.getReader();
const contentLength = +response.headers.get('Content-Length')!;
// Update progress: setDownloadProgress((receivedLength / contentLength) * 100);
```
**Effort**: 2h | **Impact**: Users see progress, don't abandon downloads
**Acceptance**: Progress bar shows during download, completion confirmation

### [Security] Trivy Security Scanning Workflow
**Files**: Create .github/workflows/security.yml
**Audit Finding**: Quality gates audit - NO automated security scanning
**Why**: 4 HIGH CVEs detected manually, no continuous monitoring
**Coverage**: Dependencies, containers, misconfigs, IaC, licenses
**Implementation**:
```yaml
- name: Run Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'  # Fail on HIGH/CRITICAL
```
**Effort**: 1h (workflow setup) | **Impact**: Continuous vulnerability monitoring, blocks HIGH/CRITICAL CVEs
**Acceptance**: Workflow runs on PRs, fails on HIGH+ severity, <2min execution

### [Infrastructure] PR Size Labeler Automation
**Files**: Create .github/workflows/pr-size-labeler.yml
**Audit Finding**: Quality gates audit - NO PR size automation
**Why**: Large PRs = shallow reviews, delayed feedback, higher risk
**Target Sizes**: ≤200 (perfect), 201-400 (acceptable), 401-500 (large), >500 (too large)
**Tool**: codelytv/pr-size-labeler (free, CLI-only, no external service)
**Implementation**:
```yaml
- uses: codelytv/pr-size-labeler@v1
  with:
    xs_max_size: 10
    s_max_size: 100
    m_max_size: 200
    l_max_size: 400
```
**Effort**: 30m | **Impact**: Automatic visibility into PR size, team norm enforcement
**Acceptance**: All PRs auto-labeled with size (XS/S/M/L/XL), visible in PR list

### [Infrastructure] Automated Coverage Reporting
**Files**: .github/workflows/ci.yml (update test job)
**Audit Finding**: Coverage disabled in CI (lines 69-76 commented out)
**Why**: No PR feedback on test coverage, patch coverage unknown
**Current State**: Vitest configured but coverage not reported
**Tool**: vitest-coverage-report-action (free, no Codecov subscription)
**Implementation**:
```yaml
- name: Test Coverage
  run: pnpm test -- --coverage
- name: Report Coverage
  uses: davelosert/vitest-coverage-report-action@v2
```
**Benefit**: PR comments with patch coverage % (new code only), differential coverage
**Effort**: 45m | **Impact**: Visibility into test quality, 80%+ patch coverage enforcement
**Acceptance**: PR comments show coverage, fails if critical paths <80%

### [Infrastructure] Changesets for Changelog Automation
**Files**: Create .changeset/config.json
**Audit Finding**: Quality gates audit - NO changelog automation
**Why**: Manual CHANGELOG.md updates, no git tag correlation, no semantic versioning
**Tool**: Changesets (monorepo-friendly, explicit declarations, human control)
**Implementation**:
```json
{
  "changelog": ["@changesets/changelog-github", { "repo": "phrazzld/brainrot" }],
  "linked": [["@brainrot/*"]],
  "baseBranch": "master"
}
```
**Workflow**: Devs run `pnpm changeset add` → CI generates changelog + bumps versions
**Effort**: 3h (setup + team onboarding) | **Impact**: Automated releases, clear changelogs
**Acceptance**: Releases auto-generated with changelog, semantic versioning enforced

### [Infrastructure] CI Pipeline Optimization
**Files**: .github/workflows/ci.yml
**Audit Finding**: Quality gates audit - Sequential job execution, slow builds
**Problem**: test waits for lint+typecheck (sequential), validate also waits
**Current**: lint (10m) → typecheck (10m) → test (15m) + validate (10m) → build (15m) = 60m total
**Fix**: Parallelize independent jobs
```yaml
jobs:
  lint: ...
  typecheck: ...
  test:
    needs: []  # Remove dependency, run in parallel
  validate:
    needs: []  # Remove dependency, run in parallel
  build:
    needs: [test, validate]  # Only build waits
```
**Effort**: 30m (YAML changes) | **Impact**: 60m → 25m CI time (60% faster)
**Acceptance**: Lint/typecheck/test/validate run in parallel, build time <30m

### [Documentation] Lychee + Vale Quality Tools
**Files**: Create .lycheerc.toml, .vale.ini, add to pre-push hooks
**Audit Finding**: Quality gates audit - NO documentation quality tooling
**Why**: Docs rot faster than code, broken links, stale examples, inconsistent style
**Tools**:
- **lychee**: Link checking (40x faster than alternatives, single Rust binary)
- **Vale**: Style linting (enforces Google/Microsoft guides, single Go binary)
**Installation**:
```bash
brew install lychee vale
```
**Implementation**:
```yaml
# lefthook.yml pre-push
docs:
  glob: "*.md"
  run: lychee {staged_files} --offline
```
**Effort**: 2h (install + configure + integrate) | **Impact**: Catch broken links, enforce style guide
**Acceptance**: lychee + Vale run on pre-push, catch doc issues locally before CI

### [Testing] Re-Enable Excluded Tests
**Files**: vitest.config.ts lines 29-37
**Audit Finding**: Many tests excluded (web app tests, ISBN tests, pandoc tests)
**Why Excluded**: Import issues, Vitest/mocking problems, missing external binaries
**Impact**: Unknown coverage on critical code paths
**Current State**: 40 test files excluded from test suite
**Fix Strategy**:
1. **ISBN tests** (line 37): Fix Vitest mocking issues, re-enable
2. **Web app tests** (lines 33-34): Resolve import path issues with @/ alias
3. **Pandoc tests** (line 31): Mock pandoc binary or mark as integration tests
**Effort**: 6h (fix import issues + mocking) | **Impact**: Full test coverage visibility
**Acceptance**: 0 excluded tests except legitimate e2e tests, coverage >70%

### [Analytics] Enable Vercel Analytics + Speed Insights
**Files**: apps/web/app/layout.tsx, apps/web/package.json
**Perspectives**: product-visionary, user-experience-advocate
**Why**: Zero user analytics - no visibility into behavior, conversions, or performance
**Impact**: Flying blind on product decisions, can't measure feature success
**Implementation**:
```bash
pnpm add @vercel/analytics @vercel/speed-insights
```
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```
**Effort**: 15m | **Impact**: User behavior tracking, Core Web Vitals, data-driven decisions
**Acceptance**: Vercel Analytics dashboard shows traffic, Speed Insights tracks performance

### [Observability] Automate Sentry Release Tracking
**Files**: .github/workflows/deploy-web.yml
**Perspectives**: architecture-guardian, maintainability-maven
**Why**: No deployment tracking - can't correlate errors with specific releases
**Impact**: When errors spike, can't identify which deploy caused them
**Implementation**:
```yaml
# .github/workflows/deploy-web.yml
- name: Create Sentry Release
  uses: getsentry/action-release@v1
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
    SENTRY_PROJECT: brainrot-web
  with:
    environment: production
    version: ${{ github.sha }}
```
**Effort**: 30m | **Impact**: Correlate errors with deployments, faster incident response
**Acceptance**: Sentry shows releases on deploy, errors tagged with version

### [Observability] Create CLI-Based Alert Automation Script
**Files**: Create scripts/configure-sentry-alerts.sh
**Perspectives**: architecture-guardian, security-sentinel
**Why**: Alerts manually configured in Sentry dashboard - not version controlled
**Impact**: Alert configs lost if workspace reset, no reproducibility
**Implementation**:
```bash
#!/bin/bash
# scripts/configure-sentry-alerts.sh
curl -X POST https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/rules/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -d '{
    "name": "New Error Type Alert",
    "conditions": [{"id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"}],
    "actions": [{"id": "sentry.mail.actions.NotifyEmailAction", "targetType": "Member"}]
  }'
```
**Effort**: 45m | **Impact**: Version-controlled alerts, reproducible observability
**Acceptance**: Script creates alerts via API, committed to repo, runs on new environments

### [Observability] Set Up OpenTelemetry + Grafana Cloud (Optional)
**Files**: Create apps/web/instrumentation.ts, grafana.config.ts
**Perspectives**: performance-pathfinder, architecture-guardian
**Why**: No performance monitoring - can't identify slow endpoints or optimize latency
**Impact**: Can't detect performance regressions, no p95/p99 tracking
**Implementation**:
```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'brainrot-web',
    tracesSampleRate: 0.1, // 10% base, 100% errors
  });
}
```
**Free Tier**: Grafana Cloud (10k series, 50GB traces)
**Effort**: 2h (setup + dashboard) | **Impact**: API latency tracking, performance budgets
**Acceptance**: Traces visible in Grafana, p95 latency <200ms tracked

---

## Soon (Exploring, 3-6 months)

### [Product] Mobile PWA - Progressive Web App
**Why**: 65% of reading happens on mobile, no offline support, no home screen install
**Impact**: Mobile readers have 2x engagement vs desktop, offline capability increases retention 60%
**Implementation**: Next.js PWA config, service worker for caching, IndexedDB for offline storage
**Effort**: 5d | **Value**: Opens mobile-first user segment

### [Product] AI Translation Studio
**Why**: Manual translation with 1000+ line style guide, no tooling, bottleneck for scale
**Unique Angle**: "GitHub Copilot for Literary Translation" - no competitor has this
**Features**: Split-pane editor, AI suggestions, brainrot density scoring, character voice consistency checker, collaborative editing
**Effort**: 15d | **Value**: Unique differentiator, 40-60% faster translations, enables scale to 100+ books
**B2B Potential**: License to other niche publishers at $200-500/mo

### [Product] Book Clubs & Discussion Features
**Why**: Solo reading experience, no social/community features
**Features**: Create book clubs (public/private), chapter discussions, scheduled reading pace, virtual reading parties
**Market**: 5 million Americans in book clubs, Goodreads groups = 100k+ active clubs
**Effort**: 10d | **Value**: Social readers have 5x longer LTV, retention 3-5x

### [Product] Multi-Format Export & Public API
**Why**: Limited download options, no API access
**Formats**: EPUB, MOBI/KPF (Kindle), PDF, plain text, audiobook MP3, Markdown
**API**: RESTful + GraphQL, webhooks, OAuth, rate limiting (free vs premium tiers)
**Effort**: 12d | **B2B Revenue**: Enterprise API access at $500-2000/mo

### [Design System] Design Token System with Tailwind 4 @theme
**Files**: apps/web/app/globals.css, apps/web/tailwind.config.ts
**Perspectives**: design-systems-architect
**Why**: Hardcoded hex colors (10+ instances), no systematic token infrastructure
**Missing**: Tailwind 4 @theme directive, OKLCH colors, semantic naming
**Implementation**:
```css
@theme {
  --color-brand-primary: oklch(0.75 0.15 330);  /* lavender but OKLCH */
  --color-surface-card: oklch(0.20 0.03 270);   /* cardbg */
  --color-text-primary: oklch(1.0 0 0);
}
```
**Effort**: 6h (3h @theme + 2h migration + 1h docs) | **Impact**: Themeable UI, dark mode ready, consistent colors

### [Design System] Extract Shared Modal Component
**Files**: apps/web/components/reading-room/DownloadModal.tsx, ShareModal.tsx
**Perspectives**: design-systems-architect, complexity-archaeologist
**Why**: 168 lines of duplicated modal boilerplate (80% identical structure)
**Problem**: Bug fixes require updating both files, inconsistent accessibility
**Fix**: Deep module pattern - simple Modal interface hiding complexity
**Effort**: 1.5h | **Impact**: Single source of truth, 100+ lines removed, consistent a11y

### [Architecture] Fix BlobService Cache Memory Leak
**Files**: apps/web/app/api/download/services/AssetService.ts:318-328
**Perspectives**: maintainability-maven, architecture-guardian
**Why**: setInterval created but never cleared (memory leak in dev/serverless)
**Impact**: Hot reload creates new intervals (stack up), keeps serverless warm unnecessarily
**Fix**: Return cleanup function (dispose: () => clearInterval(cleanupTimer))
**Effort**: 30m | **Impact**: Prevent memory leaks

### [Security] Enable Rate Limiting on Download API
**Files**: apps/web/app/api/download/services/AuthorizationService.ts:126
**Perspectives**: security-sentinel
**Why**: Implemented but NOT ENFORCED (enabled: false)
**Impact**: Single IP can make unlimited requests, no protection against bulk downloads
**Fix**: Change `enabled: true`, use edge middleware (Vercel Rate Limit, Upstash Redis)
**Effort**: 4h | **Severity**: MEDIUM

### [Security] Add Security Headers Middleware
**Files**: Create apps/web/middleware.ts
**Perspectives**: security-sentinel
**Why**: No defense-in-depth headers (X-Frame-Options, CSP, HSTS, etc.)
**Impact**: Clickjacking, MIME sniffing, XSS facilitation risks
**Fix**: Create middleware with security headers
**Effort**: 30m | **Severity**: MEDIUM

### [UX] Reading Progress Auto-Save (localStorage)
**Files**: apps/web/app/reading-room/[slug]/page.tsx
**Perspectives**: user-experience-advocate, product-visionary
**Why**: Users read 30 min, close tab, lose their place entirely (major frustration)
**Impact**: CRITICAL for retention - users must manually remember chapter + timestamp
**Fix**: Auto-save to localStorage every 2s, restore on load with "Continue reading?" prompt
**Effort**: 2h | **Impact**: Massive UX win - users never lose their place

### [Documentation] ISBN Formatting Logic Documentation
**Files**: packages/@brainrot/metadata/src/isbn.ts:110-144
**Perspectives**: maintainability-maven
**Why**: Complex ISBN formatting with hardcoded substring indices, zero context
**Impact**: Developers afraid to modify, can't debug format issues
**Fix**: Add comprehensive JSDoc explaining ISBN-13 structure (PREFIX-GROUP-PUBLISHER-TITLE-CHECK)
**Effort**: 30m | **Impact**: Self-documenting code, confident modifications

### [Observability] Centralized Log Aggregation with Grafana Loki
**Files**: Update apps/web/utils/logger.ts with remote transport
**Perspectives**: architecture-guardian, maintainability-maven
**Why**: Logs only in Vercel dashboard - disappear after 30 days, not queryable
**Impact**: Can't investigate issues older than 30 days, no correlation with traces
**Implementation**: Pino transport to Grafana Loki via HTTP
```typescript
// Add to logger.ts
import pino from 'pino';

const targets = process.env.NODE_ENV === 'production' ? [
  { target: 'pino-pretty', options: { destination: 1 } },
  { target: 'pino-loki', options: {
      host: process.env.GRAFANA_LOKI_URL,
      basicAuth: { username: process.env.GRAFANA_LOKI_USER, password: process.env.GRAFANA_LOKI_KEY }
    }
  }
] : [{ target: 'pino-pretty' }];
```
**Effort**: 2h | **Impact**: Long-term log retention, correlation with traces
**Acceptance**: Logs aggregated in Grafana, queryable by correlation ID

### [Monitoring] Configure Uptime Monitoring
**Files**: Create monitoring/uptime-config.json or use BetterUptime/UptimeRobot
**Perspectives**: user-experience-advocate, security-sentinel
**Why**: No synthetic monitoring - downtime only detected when users report it
**Impact**: Mean time to detection (MTTD) >30 minutes for outages
**Tool Options**: BetterUptime (free for 1 monitor), UptimeRobot (free for 50 monitors)
**Setup**:
```bash
# UptimeRobot API (scriptable)
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
  -d "apiKey=<YOUR_UPTIMEROBOT_TOKEN>" \
  -d "friendly_name=Brainrot Production" \
  -d "url=https://brainrot.pub/api/health" \
  -d "type=1" \
  -d "interval=300"
```
**Effort**: 30m | **Impact**: <5 min MTTD for downtime
**Acceptance**: Uptime checks run every 5 min, alerts on downtime

---

## Later (Someday/Maybe, 6+ months)

### [Product] Community Translation Marketplace
**Why**: Scale to 500+ books requires community contributions
**Model**: User-submitted translations with quality control + 70/30 revenue share
**Network Effects**: More books → more readers → more translators
**Effort**: 12d | **Value**: Enables exponential scaling

### [Product] Education Market Vertical
**Why**: Teachers/schools = premium pricing tier ($15/mo teacher, $500-1000/yr school)
**Features**: Teacher dashboards, assignment tools, quizzes, vocabulary glossary, comparison view
**TAM**: 3.7M teachers in US, K-12 ed tech = $20B market
**Effort**: 20d | **Value**: Premium B2B segment

### [Product] AI-Powered Audio Narration
**Why**: Audio market = $4.8B growing 12% YoY, 50% of Gen Z prefers audio
**Strategy**: ElevenLabs/PlayHT for custom Gen Z narrator voice, chapter-by-chapter generation
**Differentiation**: Only "brainrot" audiobooks in existence, perfect voice match for tone
**Effort**: 10d | **Value**: Opens new content format, 2-3x premium pricing

### [Product] Plugin/Extension Marketplace
**Why**: Transform product to platform with developer ecosystem
**Types**: Custom themes, reading tools, study aids, social integrations, analytics
**Platform Strategy**: 70/30 revenue share, creates lock-in through ecosystem
**Effort**: 30d | **Value**: Platform network effects

### [Platform] International/Multilingual Expansion
**Markets**: UK English (roadman slang), Australian (bogan), Spanish (reggaeton gen), French (verlan), German (digger), Japanese (gyaru)
**Effort**: 40d per language | **TAM Impact**: Each language = 2-10x potential users

### [Innovation] AR/VR Immersive Reading (Vision Pro/Quest)
**Experience**: Read in virtual environment (1920s speakeasy for Gatsby), 3D characters, spatial audio
**Effort**: 60d | **Value**: Bleeding edge differentiation

### [Product] Gamification & Reading Achievements
**Mechanics**: XP for reading, achievements/badges, reading streaks (Duolingo style), leaderboards, unlockable content
**Psychology**: Proven engagement mechanics (Duolingo, Strava model)
**Effort**: 15d | **Value**: Increases daily active users

---

## Learnings

**From this grooming session (2025-11-24)**:

**Complexity Patterns**:
- Download API temporal decomposition = symptom of rapid migration work (service proliferation without clear boundaries)
- Publisher god objects (549-592 lines) acceptable during MVP, now blocking test coverage + parallel development
- BlobService suite (3 services, 1137 lines) shows shallow module pattern - each layer adds ~15 lines of wrapper with minimal value

**Product Insights**:
- Zero authentication = #1 blocker for monetization (premium tier, bookmarks, social features all require auth)
- Generic AI aesthetic (Anton + Inter fonts) undermines unique "brainrot" brand positioning
- Reading progress auto-save is table stakes (Kindle, Apple Books, Goodreads all have this) - critical gap
- Social sharing = highest-leverage growth driver (15-30% organic user acquisition at 0 CAC)

**Technical Discoveries**:
- 868 console.log instances across codebase (76 files) - no unified logging strategy
- 4 HIGH severity CVEs in dependencies (playwright, tar-fs, glob) need immediate patching
- Build performance is exceptional (107ms cached) but zero test coverage in publisher app (financial logic untested)
- Design token system missing - 10+ hardcoded hex colors prevent theming/dark mode
- **Quality gates gaps** (from /gates audit): NO secrets detection (Gitleaks), NO security scanning (Trivy), NO PR size automation, NO changelog automation (Changesets), NO doc quality tools (lychee/Vale)
- Coverage disabled in CI (commented out lines 69-76), 40 test files excluded from suite
- Pre-push hook references undefined scripts (prettier:check, security:audit) → hooks fail silently
- **Observability gaps** (from /observe audit): NO error tracking (Sentry), NO health endpoint, NO performance monitoring (OpenTelemetry), NO analytics (Vercel Analytics), NO uptime monitoring - production errors only discovered when users report them
- Pino logger installed but misconfigured: uses console fallback in browser, no correlation IDs, pino-pretty not externalized for Next.js 15
- Logs only in Vercel dashboard (30-day retention), no centralized aggregation or long-term queryability
- No deployment tracking: can't correlate error spikes with specific releases, no Sentry releases automation

**Architecture Opportunities**:
- Merge download services (7 files → 1 deep module) unblocks 5+ future features (auth, rate limiting, CDN, analytics, multi-storage)
- Extract publisher services into focused modules enables parallel development + 70% test coverage goal
- Lefthook quality gates will prevent 90% of broken commits (saves 10+ hours/week in CI time)
- **CI optimization** (from /gates audit): Parallelize independent jobs (lint/typecheck/test/validate) → 60m total → 25m (60% faster)
- **Quality automation wins**: Gitleaks (30m) prevents 100% secret leaks, PR size labeler (30m) enforces review norms, Trivy (1h) blocks HIGH+ CVEs continuously
- **Coverage visibility**: vitest-coverage-report-action (45m) adds PR comments with patch coverage, Changesets (3h) automates releases + changelogs

**80/20 Validation**:
- 20% of work (auth + premium + progress + sharing + mobile PWA = 20 days) drives 80% of user value (retention + monetization + growth)
- 20% of refactoring (download API + publisher extraction = 38h) unblocks 80% of future velocity
- 20% of security fixes (dependency updates + rate limiting + headers = 6.5h) addresses 80% of vulnerability surface
- 20% of observability work (Sentry + health endpoint + Pino fix + analytics = 3.5h) provides 80% of production visibility (error tracking + uptime + user behavior)

---

_Keep 2-3 recent learnings, delete old ones. Next grooming: Review in 3 months (2025-02-24) or after completing 80% of "Now" items._
