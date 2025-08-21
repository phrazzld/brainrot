# CLAUDE.md - Brainrot Publishing House Monorepo

## 🎯 PROJECT STATUS: 95% COMPLETE

You are working on the **Brainrot Publishing House monorepo** - a fully integrated publishing platform that creates Gen Z "brainrot" translations of classic literature and publishes them across multiple channels (web, ebook, print).

## Current State (Phase 7.4 - Post-Migration Cleanup)

### ✅ What's Been Accomplished
- **Monorepo Migration**: Complete with full git history preserved
- **Build System**: Turborepo + pnpm workspace fully operational (107ms builds!)
- **9 Workspace Packages**: All built and functional
- **10 Books Migrated**: 124 text files generated and processed
- **Package Ecosystem**: 5 shared packages (@brainrot/*) working perfectly
- **CI/CD**: GitHub Actions workflows configured
- **Security**: All vulnerabilities fixed (3 resolved via pnpm overrides)
- **Documentation**: Architecture diagrams, publishing docs, contribution guide
- **Test Infrastructure**: Fixed - all 73 converter tests passing

### 🔧 Remaining Tasks
1. **Vercel Dashboard**: Manual configuration needed (see docs/VERCEL_MONOREPO_UPDATE.md)
2. **Archive Old Repos**: GitHub settings change to make read-only
3. **Publisher Linting**: ESLint version conflict needs resolution
4. **Production Verification**: Test deployment URL functionality

## Architecture Overview

### Monorepo Structure
```
brainrot/                          # Monorepo root (THIS DIRECTORY)
├── apps/
│   ├── web/                      # Next.js 15 web app ✅
│   └── publisher/                # CLI publishing tool ✅
├── content/
│   └── translations/             # All book translations ✅
│       └── books/                # 10 books migrated
├── packages/@brainrot/
│   ├── converter/                # MD→TXT/EPUB/PDF ✅
│   ├── templates/                # Publishing templates ✅
│   ├── types/                    # TypeScript definitions ✅
│   ├── blob-client/              # Vercel Blob storage ✅
│   └── metadata/                 # Book metadata & ISBN ✅
├── generated/                    # Processed output (124 files)
├── docs/                         # Comprehensive documentation
│   ├── ARCHITECTURE.md           # 10 mermaid diagrams ✅
│   ├── PUBLISHING.md             # Publishing pipeline docs ✅
│   └── VERCEL_MONOREPO_UPDATE.md # Deployment instructions
└── turbo.json                    # Turborepo config ✅
```

### Technology Stack
- **Monorepo**: Turborepo 2.5.6 (exceptional caching)
- **Package Manager**: pnpm 8.15.1 (workspace linking)
- **Framework**: Next.js 15.4.6 with Turbopack
- **Node.js**: 22.15 (matches requirements)
- **Content Pipeline**: Markdown → Pandoc → Multiple formats
- **Publishing**: Lulu API (automated), KDP (Playwright automation)
- **Storage**: Vercel Blob for web content
- **Testing**: Jest with full ES module support

## Key Commands

```bash
# Development
pnpm dev                      # Start all apps
pnpm build                    # Build everything
pnpm test                     # Run all tests

# Content Management
pnpm generate:formats         # Convert MD to TXT/EPUB/PDF
pnpm sync:blob               # Upload to blob storage

# Publishing
pnpm publish:book <slug>     # Publish to all platforms
pnpm publish:lulu <slug>     # Lulu only
pnpm publish:kdp <slug>      # Amazon KDP only

# Specific Apps
pnpm --filter=@brainrot/web dev     # Web app only
pnpm --filter=@brainrot/publisher build  # Publisher CLI only
```

## Environment Variables
```bash
# Blob Storage (Required for web app)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com

# Publishing Platforms (Required for publisher)
LULU_CLIENT_ID=xxx
LULU_CLIENT_SECRET=xxx
KDP_EMAIL=xxx
KDP_PASSWORD=xxx
```

## Performance Metrics
- **Build Time**: 107ms with full cache (target was <60s)
- **Cold Build**: ~7.5s
- **Cache Hit Rate**: 99.9%
- **Content**: 10 books, 124 text files
- **Test Suite**: 73 tests passing

## Current Books Available
1. The Great Gatsby ✅
2. The Iliad ✅
3. Romeo and Juliet ✅
4. Pride and Prejudice ✅
5. Frankenstein ✅
6. Moby Dick ✅
7. The Picture of Dorian Gray ✅
8. Jane Eyre ✅
9. Dracula ✅
10. La Divina Comedia (partial)

## Critical Information

### GitHub Repository
- **URL**: https://github.com/phrazzld/brainrot
- **Branch Protection**: Enabled (1 review required)
- **CODEOWNERS**: Configured
- **Dependabot**: Active for all packages
- **Old Repos**: Need archival (brainrot-publishing-house, brainrot-translations)

### Deployment Status
- **Vercel Project**: Created but needs manual dashboard config
- **Production URL**: https://brainrot-pzvw1wih4-moomooskycow.vercel.app
- **Issue**: Deployment protection enabled (requires Vercel SSO)
- **Action Required**: Disable in Vercel dashboard → Settings → Security & Privacy

### Known Issues
1. **Vercel Deployment**: Requires manual dashboard configuration
2. **Publisher Linting**: ESLint v8 deprecation warning
3. **React Peer Deps**: Version mismatch warnings (React 19 vs 18)
4. **Deprecated Packages**: Some subdependencies need updates

## What Makes This Special
- **Cultural Reinterpretations**: Not just translations, complete Gen Z adaptations
- **Example**: "In my younger and more vulnerable years" → "back when i was a lil sus beta and way more vulnerable to getting absolutely ratio'd by life"
- **Scale Goal**: Hundreds of public domain books
- **Multi-Channel**: Web, Kindle, Print-on-Demand, Bookstores

## Next Steps for Any Session

1. **Check TODO.md**: Current task list with priority items
2. **Review Critical Issues**: Section in TODO.md for blockers
3. **Run Tests**: `pnpm test` to verify everything works
4. **Check Build**: `pnpm build` to ensure no errors

## Quick Troubleshooting

### If builds fail:
```bash
pnpm install          # Reinstall dependencies
pnpm clean           # Clear Turborepo cache
pnpm build --force   # Force rebuild
```

### If tests fail:
```bash
pnpm test --filter=@brainrot/converter  # Test specific package
pnpm test -- --clearCache               # Clear Jest cache
```

### If blob storage fails:
1. Check environment variables are set
2. Verify token hasn't expired
3. Check network connectivity
4. Review blob storage dashboard for quota

---

*Last Updated: 2025-08-21*
*Migration Status: Phase 7.4 - Post-Migration Cleanup (95% Complete)*