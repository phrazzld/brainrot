# CLAUDE.md - Brainrot Publishing House Monorepo

## 🚨 CRITICAL CONTEXT FOR NEW SESSION

You are working on a **monorepo migration** for Brainrot Publishing House. This is a publishing company that creates Gen Z "brainrot" translations of classic literature and publishes them across multiple channels (web, ebook, print).

## Current Situation

### What Exists Now
1. **Web App Repository**: `~/Development/brainrot-publishing-house/`
   - Next.js 15 app with Turbopack
   - Has Great Gatsby translations in `./great-gatsby/brainrot/*.md`
   - Uses Vercel Blob storage for content delivery
   - **PROBLEM**: Great Gatsby text files are missing from blob storage (404 errors)

2. **Translations Repository**: `~/Development/brainrot-translations/`
   - Contains translations for multiple books
   - Already a separate GitHub repo
   - Has various books in `translations/` directory

### Why Monorepo?
- **Content + Code = Unified Product**: Translations are the core product
- **Shared Publishing Pipeline**: One conversion system for web, EPUB, PDF, Kindle
- **Automation**: Deploy to web and publish to print platforms from one place
- **Version Control**: Keep precious translations safe with full history

## Architecture Decisions Made

### Monorepo Structure
```
brainrot/                          # THIS DIRECTORY (where you are now)
├── apps/
│   ├── web/                      # Next.js web app (from brainrot-publishing-house)
│   ├── publisher/                # CLI for KDP/Lulu publishing
│   └── studio/                   # Future: translation editor
├── content/
│   └── translations/             # All book translations
│       └── books/
│           ├── great-gatsby/
│           ├── the-iliad/
│           └── [more books]/
├── packages/
│   ├── @brainrot/converter/     # MD→TXT/EPUB/PDF conversion
│   ├── @brainrot/templates/     # Pandoc/LaTeX templates
│   ├── @brainrot/types/         # Shared TypeScript types
│   └── @brainrot/blob-client/   # Vercel Blob storage
└── turbo.json                    # Turborepo config
```

### Technology Stack
- **Monorepo Tool**: Turborepo (by Vercel, perfect for Next.js)
- **Package Manager**: pnpm (efficient, workspace support)
- **Content Pipeline**: Markdown → Pandoc → Multiple formats
- **Publishing**: Lulu API (automated), KDP (semi-automated)
- **Storage**: Vercel Blob for web content

## Immediate Priorities

### 1. Fix Great Gatsby (Urgent)
The Great Gatsby translations exist as markdown but need to be:
1. Converted to plain text (strip markdown)
2. Uploaded to blob storage at `books/great-gatsby/text/`
3. Named: `brainrot-introduction.txt`, `brainrot-chapter-1.txt` etc.

### 2. Continue Migration
You're in Phase 1.1 of the migration. The monorepo directory exists but needs:
- Git initialization
- Package.json setup
- Turborepo configuration
- Migration of existing repos with history preservation

## Key Files to Reference

### In Old Web App (`~/Development/brainrot-publishing-house/`)
- `TODO.md` - Full migration plan with checkboxes
- `great-gatsby/brainrot/*.md` - The translations that need processing
- `utils/services/BlobService.ts` - Blob upload utilities to reuse
- `translations/books/great-gatsby.ts` - Shows expected file structure

### In Translations Repo (`~/Development/brainrot-translations/`)
- Various book translations to be migrated
- Existing translation structure to preserve

## Environment Variables Needed
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx  # Get from Vercel dashboard
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com
```

## Git Remotes for Migration
- Web app: `../brainrot-publishing-house` (local) or `git@github.com:phrazzld/brainrot-publishing-house.git`
- Translations: `../brainrot-translations` (local) or `git@github.com:phrazzld/brainrot-translations.git`

## Commands You'll Use
```bash
# Package management
pnpm install
pnpm add -D turbo

# Git subtree migration (preserves history)
git subtree add --prefix=apps/web ../brainrot-publishing-house master
git subtree add --prefix=content/translations ../brainrot-translations main

# Turborepo
pnpm dev                    # Start everything
pnpm build --filter=web     # Build just web app
pnpm generate:formats       # Convert MD to various formats
pnpm sync:blob             # Upload to blob storage
```

## Publishing Strategy
1. **Web App**: Automatic via blob storage
2. **Amazon KDP**: Semi-automated with Playwright
3. **Lulu**: Fully automated via API (they have a free API!)
4. **IngramSpark**: Manual for select titles

## What Makes This Special
- These aren't just "translations" - they're complete cultural reinterpretations
- Example: "In my younger and more vulnerable years" becomes "back when i was a lil sus beta and way more vulnerable to getting absolutely ratio'd by life"
- The translations are THE product - they must be preserved and versioned
- Goal: Scale to hundreds of public domain books

## Gotchas & Warnings
1. **Don't lose the translations** - They're in `great-gatsby/brainrot/*.md`
2. **Blob paths matter** - Web app expects specific paths
3. **Preserve git history** - Use subtree merge, not copy
4. **Test Great Gatsby first** - It's the canary for the whole system

## Your Immediate Next Steps
1. Check TODO.md for current progress
2. Continue with Phase 1.1 tasks (git init, package.json, etc.)
3. Once basic setup done, prioritize Great Gatsby text conversion
4. Test that Great Gatsby loads in the web app

Remember: The user has been working on this migration and knows the context. You can refer to "our plan" and "what we discussed" - you're continuing work, not starting fresh.