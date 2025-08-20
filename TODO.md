# TODO: Brainrot Publishing House - Monorepo Migration & Publishing Pipeline

## Phase 1: Monorepo Structure Setup ✅
- [x] Initialize monorepo with pnpm@8.15.1 and Turborepo
- [x] Configure Turborepo pipeline (build, dev, test, lint, generate, publish)
- [x] Migrate web app repository with git subtree (preserved full history)
- [x] Migrate translations repository with git subtree (master branch)
- [x] Consolidate content to `content/translations/books/` with kebab-case naming

**Key Learning**: Git subtree merge preserves complete history. 10 books consolidated.

## Phase 2: Shared Packages Creation ✅
- [x] @brainrot/types - TypeScript interfaces for book data
- [x] @brainrot/converter - Markdown to text/EPUB/PDF conversion (needs pandoc for full functionality)
- [x] @brainrot/blob-client - Vercel Blob storage with retry logic and checksums
- [x] @brainrot/metadata - YAML parsing, ISBN validation, metadata generation
- [x] @brainrot/templates - EPUB/PDF/Kindle templates with LaTeX support

**Key Learning**: All packages built and published. Converter tests need ES module mocking fix.

## Phase 3: Web App Integration ✅
- [x] Update web app to use workspace packages
- [x] **Blob Storage Simplification** - Reduced 1000+ lines to 37 lines
- [x] Configure Next.js for monorepo (transpilePackages, externalDir)

**Key Learning**: Direct URL construction replaced complex fallback system. All books loading correctly.

## Phase 4: Content Pipeline Implementation ✅
- [x] Create metadata.yaml for all 10 books (ISBN 979-8-88888-XXX series)
- [x] Generate formats script with commander CLI
- [x] Blob storage sync with MD5 checksums
- [x] Process and upload all books (124 text files total)

**Key Learning**: 8 books fully processed. La Divina Comedia needs special handling. Tao Te Ching lacks translation.

## Phase 5: Publisher CLI Development ✅
- [x] CLI structure with commander, chalk, ora
- [x] Lulu API integration with OAuth2 and mock mode
- [x] KDP automation with Playwright and 2FA support
- [x] Unified publish command with pre-flight checks

**Key Learning**: Mock mode essential for testing. Playwright handles browser automation well.

## Phase 6: CI/CD Setup ✅
- [x] GitHub Actions workflows (CI, deploy, publish, sync)
- [x] Vercel deployment configuration (manual dashboard setup required)
- [x] Environment variables documented in .env.example
- [x] Secret management with dotenv-vault
- [x] GitHub secret scanning and pre-commit hooks
- [x] API usage monitoring scripts

**Key Learning**: Monorepo needs manual Vercel dashboard config. 14 secrets needed for full automation.

## Phase 7: Migration Execution ✅
### 7.1 Pre-Migration Backup ✅
- [x] Mirror backups of both repositories
- [x] Export GitHub issues (67 from publishing-house, 0 from translations)
- [x] Document Vercel configuration
- [x] Create rollback plan

### 7.2 Execute Migration ✅
- [x] Git history verified (both repos preserved)
- [x] Dependencies installed and linked (9 workspace projects)
- [x] Build successful (174ms with FULL TURBO)
- [x] Tests mostly passing (converter has ES module issues)
- [x] Linting clean (publisher needs ESLint upgrade)
- [x] Format generation working for all books

### 7.3 Update Remote Repository ✅
- [x] Created GitHub repo: https://github.com/phrazzld/brainrot
- [x] Branch protection enabled (1 review required)
- [x] CODEOWNERS configured
- [x] Dependabot enabled for all packages

### 7.4 Post-Migration Cleanup
- [x] Update Vercel to deploy from new monorepo (manual config required)
- [ ] Verify production deployment succeeds
- [ ] Archive old repositories with deprecation notice
- [ ] Update README.md with monorepo structure and commands
- [x] Create CONTRIBUTING.md with development workflow
- [x] Document publishing pipeline in docs/PUBLISHING.md
- [ ] Create architecture diagram using mermaid
- [ ] Update both CLAUDE.md files with new structure
- [ ] Schedule old repo deletion for 30 days

## Phase 8: Continuous Improvement [Ongoing]

### 8.1 Monitoring and Optimization
- [ ] Set up Vercel Analytics
- [ ] Implement build time tracking
- [ ] Create publishing success dashboard
- [ ] Set up error tracking with Sentry
- [ ] Monitor blob storage usage and costs
- [ ] Implement automated performance tests

### 8.2 Future Enhancements
- [ ] Create `apps/studio` for web-based translation editor
- [ ] Implement AI-assisted translation suggestions
- [ ] Add `packages/@brainrot/ai-translator`
- [ ] Create public API for translations
- [ ] Implement subscription system
- [ ] Add analytics for popular translations
- [ ] Create mobile app

## Success Metrics
- ✅ Build < 60 seconds (currently 174ms with cache)
- ✅ Git history preserved
- ✅ Great Gatsby loads without errors
- ✅ All books accessible in web app
- [ ] Production deployment verified
- [ ] Publishing pipeline tested on Lulu sandbox

## Critical Issues
- **Vercel Deployment**: Requires manual dashboard configuration (see docs/VERCEL_MONOREPO_UPDATE.md)
- **Converter Tests**: ES module mocking needs Jest config update
- **Publisher Linting**: ESLint version conflict needs resolution
- **GitHub Vulnerabilities**: 5 security issues flagged by Dependabot

## Next Priority Tasks
1. Complete Vercel dashboard configuration
2. Verify production deployment
3. Archive old repositories with 30-day notice
4. Address Dependabot security vulnerabilities
5. Fix converter test infrastructure