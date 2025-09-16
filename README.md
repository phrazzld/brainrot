# 📚 Brainrot Publishing House - Monorepo

> _Making classic literature absolutely bussin' for Gen Z, no cap fr fr_

## 🚀 What Is This?

Brainrot Publishing House creates hilarious Gen Z "brainrot" translations of classic literature. We're talking Shakespeare but make it TikTok. Fitzgerald but make it Discord. Homer but make it Twitch chat.

This monorepo contains:

- **Web App**: Next.js reading platform at [brainrot.pub](https://brainrot.pub) (eventually)
- **Translations**: The actual book translations (our crown jewels)
- **Publisher**: Automated publishing to Amazon KDP, Lulu, and more
- **Converter**: Tools to transform content for different platforms

## ⚠️ CRITICAL: Translation Methodology ⚠️

**BEFORE TRANSLATING ANY CONTENT, READ THIS:**

Our translations follow **"maximalist gremlin mode"** - a specific, documented methodology that ALL contributors must follow:

📖 **MANDATORY READING: `TRANSLATION_GUIDELINES.md`** (1000+ lines of detailed methodology)

### Key Requirements:
- **all lowercase formatting** (no capitals except emphasis)
- **3-5+ brainrot terms per sentence MINIMUM**
- **400+ term vocabulary** including: skibidi, gyatt, rizz, fr fr ong, no cap, lowkey, etc.
- **Character voice mapping** - each character gets 3-5 signature terms
- **Systematic slur replacement** - NEVER reproduce historical slurs
- **1,600+ core term occurrences per book target**

### Example Translation:
```
Original: "I went down yesterday to the Piraeus with Glaucon..."
Brainrot: "so yesterday i was heading down to the piraeus with my boy glaucon (ariston's son) to check out this new festival for the goddess bendis - basically the thracian version of artemis. had to pay my respects and all that, plus i was lowkey curious about how they'd throw down for this thing since it was literally the first time."
```

⚠️ **DO NOT START TRANSLATING WITHOUT READING THE GUIDELINES** ⚠️

## 🏗️ Monorepo Architecture

```
brainrot/
├── apps/
│   ├── web/                    # Next.js 15 web application
│   └── publisher/              # CLI for KDP, Lulu, IngramSpark
├── content/
│   └── translations/
│       └── books/              # All book translations
│           ├── great-gatsby/   # Each book has brainrot/ and metadata.yaml
│           ├── the-iliad/
│           └── [8 more books]
├── packages/
│   ├── @brainrot/types/        # Shared TypeScript interfaces
│   ├── @brainrot/converter/    # Markdown → Text/EPUB/PDF/Kindle
│   ├── @brainrot/blob-client/  # Vercel Blob storage with retry logic
│   ├── @brainrot/metadata/     # YAML parsing, ISBN validation
│   └── @brainrot/templates/    # LaTeX/EPUB/Kindle templates
├── scripts/
│   ├── generate-formats.ts     # Convert books to all formats
│   └── sync-translations.ts    # Upload to blob storage
└── turbo.json                  # Turborepo configuration
```

## 🚦 Quick Start

### Prerequisites

```bash
# Required versions
node >= 22.0.0
pnpm >= 8.15.1

# Clone the monorepo
git clone https://github.com/phrazzld/brainrot.git
cd brainrot
```

### Get Started

```bash
# Install all dependencies
pnpm install

# Start everything in dev mode
pnpm dev

# Or just the web app
pnpm dev --filter=@brainrot/web

# Build everything (super fast with Turborepo!)
pnpm build

# Run tests
pnpm test
```

### Monorepo Benefits

- **⚡ Lightning fast builds** - Turborepo caches everything (174ms rebuilds!)
- **📦 Shared packages** - Reusable code across all apps
- **🔄 Unified pipeline** - One command to rule them all
- **🎯 Selective execution** - Work on just what you need
- **🔗 Type safety** - TypeScript types shared everywhere

## 📖 Available Books

### Currently Translated (8 books, 124 text files)

- **The Great Gatsby** - _"back when i was a lil sus beta and way more vulnerable to getting absolutely ratio'd by life"_
- **The Iliad** - _"greek drama hits different when paris catches feelings"_
- **The Odyssey** - _"odysseus speed-running his way home while poseidon stays pressed"_
- **The Aeneid** - _"aeneas carries his dad out of troy like a true sigma"_
- **Alice in Wonderland** - _"alice falls down the most unhinged discord server"_
- **Frankenstein** - _"victor creates life then ghosts harder than your crush"_
- **Declaration of Independence** - _"the colonies said 'we're breaking up with u britain'"_
- **Simple Sabotage Field Manual** - _"how to troll your workplace (CIA approved)"_

### In Progress

- **La Divina Comedia** - Complex 3-part structure needs special handling
- **Tao Te Ching** - Source text ready, translation pending

### Coming Soon

- Pride and Prejudice
- Hamlet
- Romeo and Juliet
- Paradise Lost
- And 100+ more classics

## 🔧 Development

### Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Web**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **Storage**: Vercel Blob Storage
- **Publishing**: Playwright (KDP) + Axios (Lulu API)
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions + Vercel

### Commands

```bash
# Development
pnpm dev                        # Start all apps in dev mode
pnpm dev --filter=@brainrot/web # Web app only
pnpm build                      # Build everything (174ms with cache!)
pnpm lint                       # Lint all packages

# Testing (Powered by Vitest)
pnpm test                       # Run tests in watch mode
pnpm test:run                   # Run tests once (CI mode)
pnpm test:ui                    # Open Vitest UI for interactive testing
pnpm test:coverage              # Generate coverage report
pnpm test:watch                 # Alias for pnpm test

# Content Pipeline
pnpm generate:formats [book]    # Convert markdown to all formats
pnpm generate:formats --all     # Process all books
pnpm sync:blob [book]          # Upload to Vercel Blob storage
pnpm sync:blob --all           # Sync all books

# Publishing
pnpm publisher list             # List available books
pnpm publisher validate [book]  # Pre-flight checks
pnpm publisher publish [book] --platform=lulu  # Publish to Lulu
pnpm publisher publish [book] --platform=kdp   # Publish to Amazon
pnpm publisher publish-all [book]              # All platforms

# Utilities
pnpm vault:pull                # Get latest secrets
pnpm monitor:api               # Check API usage
```

### Environment Variables

This project uses **dotenv-vault** for secure secret sharing:

```bash
# First time setup
pnpm vault:login       # Login to dotenv-vault
pnpm vault:pull        # Pull encrypted secrets

# Daily workflow
pnpm vault:pull        # Get latest secrets
pnpm vault:push        # Share your changes
```

Manual setup (if not using vault):

- Copy `.env.example` to `.env.local`
- Add `BLOB_READ_WRITE_TOKEN` - Vercel blob storage
- Add `LULU_API_KEY` - For print publishing
- Add `KDP_EMAIL/PASSWORD` - For Amazon publishing

See `docs/DOTENV_VAULT_SETUP.md` for complete setup guide.

### 🔒 Security Setup

Protect your secrets with our multi-layer security:

```bash
# Install Git hooks for local secret scanning
./scripts/setup-git-hooks.sh

# (Optional) Install gitleaks for enhanced scanning
brew install gitleaks

# Run manual security scan
gitleaks detect --source . -v
```

**Security Features:**

- **Pre-commit hooks** - Prevents accidental secret commits
- **GitHub secret scanning** - Monitors pushed code
- **Custom patterns** - Detects service-specific tokens
- **Gitleaks integration** - Advanced local scanning

See `docs/SECRETS.md` for rotation procedures.

## 🧪 Testing

### Test Stack

We use **Vitest** for blazing-fast unit and integration testing:

- **5-10x faster** than Jest
- **Native ESM support** - No transforms needed
- **HMR for tests** - Tests re-run instantly on save
- **Compatible API** - Drop-in Jest replacement
- **Built-in coverage** - Via c8/v8

### Running Tests

```bash
# Interactive watch mode (recommended for development)
pnpm test

# Run all tests once
pnpm test:run

# Open Vitest UI - beautiful interface for test exploration
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Test specific packages
pnpm test --filter=@brainrot/converter
pnpm test --filter=@brainrot/web

# Run specific test files
pnpm test -- download.test.ts
pnpm test -- --grep="security"
```

### Test Coverage

We maintain **85%+ coverage** across all packages:

```bash
# Check coverage
pnpm test:coverage

# Coverage thresholds (enforced in CI)
# - Branches: 85%
# - Functions: 85%
# - Lines: 85%
# - Statements: 85%
```

### Jest → Vitest Migration

We recently migrated from Jest to Vitest. Key changes:

```typescript
// Old (Jest)
import { jest } from "@jest/globals";
const mockFn = jest.fn();
jest.mock("./module");

// New (Vitest)
import { vi } from "vitest";
const mockFn = vi.fn();
vi.mock("./module");
```

**Migration benefits:**

- Test execution: ~50s → ~5s (10x speedup)
- No more `ts-jest` configuration
- Better TypeScript support out of the box
- Simpler configuration (single `vitest.config.ts`)

For migration details, see our [migration guide](docs/TESTING_MIGRATION.md).

## 📝 Script Organization

### Philosophy: Less is More

We maintain a **minimalist script structure** focused on essential development tasks. We reduced from 74 scripts to just 7 core scripts in the web app, removing all one-time migration and utility scripts.

### Essential Scripts (Web App)

```bash
# The Magnificent Seven - Everything you actually need
pnpm dev         # Start dev server with Turbopack (blazing fast HMR)
pnpm build       # Production build with Next.js optimizations
pnpm test        # Run tests in watch mode with Vitest
pnpm lint        # ESLint with Next.js rules
pnpm format      # Prettier auto-formatting
pnpm typecheck   # TypeScript type checking
pnpm prettier:fix # Direct Prettier command (alias for format)
```

### Monorepo Scripts

```bash
# Core Development
pnpm dev         # Start all apps in dev mode (Turborepo)
pnpm build       # Build all packages (cached, ~13s)
pnpm lint        # Lint all packages
pnpm typecheck   # Type check everything
pnpm clean       # Nuclear option - clear all caches

# Testing Suite
pnpm test        # Interactive watch mode
pnpm test:run    # Single run (CI mode)
pnpm test:ui     # Beautiful Vitest UI
pnpm test:coverage # Coverage report

# Content & Publishing
pnpm generate:formats [book]  # Convert MD to all formats
pnpm sync:blob [book]        # Upload to Vercel Blob
pnpm monitor                 # API usage dashboard
```

### What We Removed (and Why)

We archived **67 legacy scripts** that were:

- **Migration scripts** (45): One-time data migrations now complete
- **Audit/verify scripts** (15): Replaced with automated tests
- **Standardization scripts** (10): Data is now standardized
- **Utility scripts** (7): Either automated or rarely needed

**Why remove them?**

- **Clarity**: New developers see only what matters
- **Maintenance**: Less scripts = less confusion
- **Speed**: Faster package.json parsing
- **Focus**: Essential workflows are obvious

### Archived Scripts

Legacy scripts are preserved in `/tools/legacy-scripts/` for historical reference:

```bash
# If you need migration scripts for reference
ls tools/legacy-scripts/

# Each script has documentation
cat tools/legacy-scripts/README.md
```

**Important**: These scripts are archived, not deleted. They serve as:

- Historical record of migrations performed
- Reference for future similar tasks
- Documentation of data transformation logic
- Learning resource for complex operations

### Adding New Scripts

Before adding a new script, ask:

1. **Is it used daily?** → Add to package.json
2. **Is it a one-time task?** → Run with `tsx` directly
3. **Is it rarely used?** → Document in README, don't add script
4. **Is it project-specific?** → Add to that package only

### Direct Execution (No Script Needed)

```bash
# For one-time or rare tasks, just use tsx directly
tsx scripts/some-utility.ts

# Or with Node
node --loader tsx scripts/analyze-something.ts
```

## 📚 Content Pipeline

```mermaid
graph LR
    A[Markdown Translation] --> B[Converter Package]
    B --> C[Plain Text<br/>for Web]
    B --> D[EPUB<br/>for E-readers]
    B --> E[PDF<br/>for Print]
    B --> F[MOBI<br/>for Kindle]

    C --> G[Blob Storage]
    G --> H[Web App]

    D --> I[Apple Books]
    E --> J[Lulu Print]
    F --> K[Amazon KDP]
```

## 🎯 Publishing Targets

- **Web**: Vercel + Blob Storage (automatic)
- **Amazon KDP**: Kindle + Paperback (semi-automated)
- **Lulu**: Print-on-demand (API automated)
- **IngramSpark**: Bookstores (manual)
- **Apple Books**: Coming soon
- **Google Play**: Coming soon

## 🏛️ Project Philosophy

We believe classic literature should be:

1. **Accessible** - No more "thou" and "forsooth"
2. **Entertaining** - Actual laugh-out-loud moments
3. **Relevant** - References that make sense today
4. **Respectful** - The stories remain intact
5. **Educational** - Still learning, just more fun

## 🤝 Contributing

This is currently a private project, but we're considering open-sourcing the translation tools. Stay tuned!

## 📄 License

The translations are original creative works. Classic source texts are public domain.

## 🔗 Links

- **Web App**: [www.brainrotpublishing.com](https://www.brainrotpublishing.com)
- **GitHub**: [github.com/phrazzld/brainrot](https://github.com/phrazzld/brainrot)
- **Discord**: Coming soon
- **TikTok**: @brainrotpublishing (coming soon)

## ✅ Migration Complete

This monorepo was successfully migrated from two repositories with full git history preserved:

- ✅ `brainrot-publishing-house` → `apps/web/`
- ✅ `brainrot-translations` → `content/translations/`

**Old repositories have been archived with deprecation notices.**

## 🆘 Troubleshooting

### Common Issues

**Great Gatsby not loading?**
✅ This has been fixed! All books are pre-processed and uploaded.

**Vercel deployment failing?**
Make sure to configure the monorepo settings in Vercel dashboard:

- Root Directory: (leave empty)
- Build Command: `pnpm build --filter=@brainrot/web`
- Output Directory: `apps/web/.next`
  See `docs/VERCEL_DEPLOYMENT.md` for complete deployment guide.

### Build failing?

Make sure you have:

- Node.js >= 22.0.0
- pnpm >= 8.15.1
- All environment variables set

### Git history missing?

We use subtree merge to preserve history. If you need to trace back:

```bash
git log --follow apps/web/[file]
git log --follow content/translations/[file]
```

## 📈 Roadmap

### Phase 1: Migration ✅ COMPLETE

- [x] Create monorepo structure with Turborepo
- [x] Migrate repositories with git subtree
- [x] Set up 5 shared packages
- [x] Fix Great Gatsby (blob simplification: 1000 lines → 37 lines)

### Phase 2: Publishing Pipeline ✅ COMPLETE

- [x] Lulu API integration with OAuth2
- [x] KDP automation with Playwright
- [x] Batch processing for all books
- [x] Mock mode for testing

### Phase 3: Production Launch (Current)

- [x] Deploy to production on Vercel ✅
- [ ] Test publishing pipeline with real credentials
- [ ] Launch first 10 books on all platforms
- [ ] Set up analytics and monitoring

### Phase 4: Scale

- [ ] 50 books translated
- [ ] AI-assisted translation tools
- [ ] Subscription service
- [ ] Mobile apps

### Phase 5: Empire

- [ ] 500+ books
- [ ] International versions
- [ ] Educational partnerships
- [ ] Physical bookstore presence

---

_"We're not just translating books, we're translating culture. Shakespeare would've loved TikTok, and we're here to prove it."_

**The Brainrot Publishing House Team**
_Making Literature Absolutely Bussin' Since 2024_
