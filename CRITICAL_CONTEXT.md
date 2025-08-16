# 🚨 CRITICAL CONTEXT - READ THIS FIRST

## The Great Gatsby Situation
**URGENT**: The Great Gatsby is broken in the web app. Users get "Error loading text" because the text files don't exist in blob storage.

### What's Wrong
- Web app expects plain text files at: `https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/books/great-gatsby/text/brainrot-introduction.txt`
- But we only have markdown files at: `~/Development/brainrot-publishing-house/great-gatsby/brainrot/*.md`
- Need to convert MD → TXT and upload to blob

### The Translations Exist! 
**DO NOT PANIC** - The translations are safe at:
```
~/Development/brainrot-publishing-house/great-gatsby/brainrot/
├── introduction.md (4.7k)
├── chapter-1.md (133k)
├── chapter-2.md (93k)
├── chapter-3.md (82k)
├── chapter-4.md (112k)
├── chapter-5.md (83k)
├── chapter-6.md (56k)
├── chapter-7.md (172k)
├── chapter-8.md (28k)
└── chapter-9.md (31k)
```

These are complete, high-quality "brainrot" translations that took days to generate. They're hilarious and amazing.

## Migration Status
- ✅ Created monorepo directory at `~/Development/brainrot/`
- ⏳ Next: Initialize git and continue Phase 1 setup
- 📋 Full plan in TODO.md with detailed checkboxes

## Key Repositories
1. **Web App**: `~/Development/brainrot-publishing-house/`
   - Current production web app
   - Has Great Gatsby translations
   - GitHub: `phrazzld/brainrot-publishing-house`

2. **Translations**: `~/Development/brainrot-translations/`  
   - Separate repo with more translations
   - GitHub: `phrazzld/brainrot-translations`

## Blob Storage Access
```bash
# You'll need this token (get from .env.local in web app)
BLOB_READ_WRITE_TOKEN=vercel_blob_[token]

# Blob base URL (public)
NEXT_PUBLIC_BLOB_BASE_URL=https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com
```

## File Naming Convention
When converting Great Gatsby, files must be named:
- `brainrot-introduction.txt`
- `brainrot-chapter-1.txt`
- `brainrot-chapter-2.txt`
- ... through chapter-9

## Why Monorepo?
- Unify web app + translations + publishing tools
- Share conversion code between all apps
- Single source of truth for content
- Automated publishing pipeline to KDP, Lulu, etc.

## Tech Stack Decisions
- **Turborepo**: Monorepo build system (by Vercel)
- **pnpm**: Package manager (efficient workspaces)
- **Pandoc**: Document conversion (MD → EPUB/PDF)
- **Lulu API**: Automated print publishing
- **Playwright**: KDP automation (no official API)

## DON'T FORGET
1. Preserve git history when migrating repos (use subtree merge)
2. The translations are EVERYTHING - they're the actual product
3. Test Great Gatsby in web app after fixing
4. This is a continuation of work - user knows the context

## Immediate Priority After Setup
Once basic monorepo structure is ready, the Great Gatsby fix should be integrated into the content pipeline setup (Phase 4 of TODO.md) rather than done as a one-off hack.