# Current State of Migration

## What Exists Where

### 📁 This Directory (`~/Development/brainrot/`)
- **Status**: Empty except for context files
- **Purpose**: Will become the monorepo root
- **Next Steps**: Initialize git, create package.json, add Turborepo

### 📁 Web App (`~/Development/brainrot-publishing-house/`)
- **Status**: Production web app, fully functional except Great Gatsby
- **Contains**:
  - Next.js 15 app with Turbopack
  - Great Gatsby translations in `great-gatsby/brainrot/*.md`
  - Utility services for blob storage
  - TypeScript types for translations
- **Issues**: 
  - Great Gatsby text files missing from blob storage (404 errors)
  - Contains duplicate translations that belong in content repo
- **Will Become**: `apps/web/` in monorepo

### 📁 Translations (`~/Development/brainrot-translations/`)
- **Status**: Separate repo with various translations
- **Contains**:
  ```
  translations/
  ├── alice_s_adventures_in_wonderland/
  ├── frankenstein_or_the_modern_prometheus/
  ├── la-divina-comedia/
  ├── paradise_lost/
  ├── simple_sabotage_field_manual/
  ├── tao-te-ching/
  ├── the-aeneid/
  ├── the-iliad/
  ├── the-odyssey/
  └── the_declaration_of_independence_of_the_united_states_of_america/
  ```
- **Will Become**: `content/translations/` in monorepo

## Git Repository Status

### Web App Repo
- **Remote**: `git@github.com:phrazzld/brainrot-publishing-house.git`
- **Branch**: master (not main)
- **Status**: Clean, pushed
- **Has**: Full git history to preserve

### Translations Repo  
- **Remote**: `git@github.com:phrazzld/brainrot-translations.git`
- **Branch**: main
- **Status**: Has existing content
- **Has**: Full git history to preserve

### This Monorepo
- **Status**: Not yet initialized
- **Will Have**: Both repos merged with full history

## Environment Variables Available

From `~/Development/brainrot-publishing-house/.env.local`:
- `BLOB_READ_WRITE_TOKEN` - Vercel blob storage token
- `NEXT_PUBLIC_BLOB_BASE_URL` - Blob storage URL
- Other Next.js related vars

## Package Versions in Use

From current web app:
```json
{
  "next": "15.3.3",
  "react": "^19.0.0",
  "node": ">=22.0.0",
  "pnpm": "8.15.1" // Will use this version
}
```

## Blob Storage Structure

Current (working for other books):
```
https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com/
├── books/
│   ├── the-iliad/
│   │   └── text/
│   │       ├── brainrot-book-01.txt ✅
│   │       └── ...
│   └── great-gatsby/
│       └── text/
│           └── [MISSING - THIS IS THE PROBLEM] ❌
```

## File System Layout Visualization

```
~/Development/
├── brainrot/                    # 📍 YOU ARE HERE (new monorepo)
│   ├── CLAUDE.md               # Context for you
│   ├── CRITICAL_CONTEXT.md     # Must-know info
│   ├── CURRENT_STATE.md        # This file
│   └── TODO.md                  # Task list
│
├── brainrot-publishing-house/   # Existing web app
│   ├── app/                     # Next.js app directory
│   ├── components/
│   ├── great-gatsby/            # ⚠️ Translations to migrate
│   │   ├── brainrot/*.md       # The precious translations
│   │   └── source/*.txt        # Original text
│   ├── translations/            # Translation TypeScript configs
│   ├── utils/
│   │   └── services/
│   │       ├── BlobService.ts  # Reusable upload code
│   │       └── BlobPathService.ts
│   └── package.json
│
└── brainrot-translations/       # Existing translations repo
    ├── translations/            # Book translations
    ├── src/                     # Some utilities
    └── package.json
```

## Migration Progress

### Phase 1.1: Initialize Monorepo Root
- ✅ Create new directory at `~/Development/brainrot`
- ⬜ Initialize git repository
- ⬜ Create package.json
- ⬜ Install Turborepo
- ⬜ Create pnpm-workspace.yaml
- ⬜ Create directory structure

### Overall Progress
- Phase 1: 1/42 tasks complete (2%)
- Phase 2-8: Not started
- Estimated completion: 2 weeks with focused effort

## Known Issues & Blockers

1. **Great Gatsby Loading**: Urgent - users can't read it
2. **Naming Inconsistency**: Some books use underscores, others use hyphens
3. **Duplicate Content**: Great Gatsby exists in both repos
4. **Branch Names**: Web app uses 'master', translations use 'main'

## Quick Wins Available

1. Could fix Great Gatsby immediately with quick script (but better to do properly)
2. Package.json and basic setup can be done in minutes
3. Git initialization is straightforward
4. Directory structure creation is simple

## What Success Looks Like

When migration is complete:
- Single monorepo with all content and code
- Great Gatsby (and all books) loading properly
- Automated publishing to KDP, Lulu, etc.
- Shared conversion utilities
- Preserved git history
- CI/CD pipeline working

## Resources & References

- [Turborepo Docs](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Git Subtree Merging](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging)
- [Pandoc](https://pandoc.org/) for document conversion
- [Lulu API](https://developers.lulu.com/) for print publishing