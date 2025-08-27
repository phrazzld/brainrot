# brainrot publishing house

this nextjs app is a total vibe: a reading + audio platform that merges sweet waveforms, text highlighting, chapter/timestamp sharing, and a spool of dope expansions on the horizon. behold:

## features

- **reading room**: pick your translation, pick your chapter, listen to synced audio. your eyeballs read as your ears feast.
- **timestamp sharing**: copy a share link that auto-seeks to a precise chapter/time. no more scrubbing or guesswork.
- **wavesurfer**: we use wavesurfer.js to visualize the audio waveform and handle playback.

## architecture

- **app/reading-room/[slug]**: main reading component. fetches your text, loads audio, manages chapters/timestamps.
- **hooks & components**: reusable building blocks to handle reading progress, theme toggles, etc.
- **vercel blob storage**: assets are stored in Vercel Blob using a standardized path structure.
- **env**: `.env.local` holds your secrets (stripe key, blob credentials, etc.). config them on vercel for deploy.

## documentation

### translation system

- [Translation System](docs/translation-system/): comprehensive translation methodology and project documentation
  - [Guidelines](docs/translation-system/methodology/guidelines.md): 974-line maximalist gremlin mode methodology
  - [Great Gatsby Project](docs/translation-system/projects/great-gatsby/): complete project documentation including character voices and specifications

### technical documentation

- [BLOB_STORAGE.md](docs/BLOB_STORAGE.md): details about Blob storage configuration
- [BLOB_PATH_STRUCTURE.md](docs/BLOB_PATH_STRUCTURE.md): path structure for assets in Blob storage
- [ASSET_CLEANUP.md](docs/ASSET_CLEANUP.md): guide for cleaning up local assets after migration

## stack

- **nextjs** (app router) for zero-config routing & serverless endpoints.
- **react** for the core ui.
- **wavesurfer** for audio waveforms and playback.
- **vercel blob storage**: high-performance asset storage that replaces DigitalOcean Spaces.
- **tailwindcss** for speed-coded styling.
- **vitest** for ultra-fast testing (10x faster than jest).

## running locally

1. clone the repo
2. `pnpm install` (we use pnpm, not npm)
3. set up `.env.local`
4. `pnpm dev`
5. open localhost:3000
6. test the reading room: try reading-room/the-iliad?c=1&t=30.
7. explore /checkout to place a pseudo preorder (test mode).

## testing

we use **Vitest** for ultra-fast testing (previously Jest, but we upgraded for that 10x speed boost):

```bash
# run tests in watch mode (recommended for dev)
pnpm test

# run all tests once
pnpm test:run

# generate coverage report
pnpm test:coverage

# open the vitest ui (super clean interface)
pnpm test:ui
```

### what we test

- **components**: all react components with React Testing Library
- **api routes**: download endpoints, service layers
- **hooks**: custom react hooks
- **utilities**: path helpers, validators, converters
- **security**: command injection prevention, input sanitization

### migration from jest

we migrated from jest to vitest for:

- **10x faster test execution** (50s → 5s)
- **native esm support** (no more transform headaches)
- **better typescript support** out of the box
- **hmr for tests** (instant re-runs on save)

key syntax changes if you're familiar with jest:

```javascript
// old (jest)
jest.fn() → vi.fn()
jest.mock() → vi.mock()
jest.spyOn() → vi.spyOn()
```

## scripts

### the magnificent seven

we've simplified from 74 scripts down to just 7 essentials. no more clutter, just what you need:

```bash
pnpm dev         # fire up the dev server with turbopack
pnpm build       # production build with all optimizations
pnpm test        # run tests in watch mode (vitest)
pnpm lint        # eslint with next.js rules
pnpm format      # auto-format with prettier
pnpm typecheck   # typescript type checking
pnpm prettier:fix # direct prettier (alias for format)
```

### why so few?

we removed **67 legacy scripts** that were:

- migration scripts (data already migrated)
- audit/verify scripts (now automated tests)
- standardization scripts (data already clean)
- one-time utilities (job's done)

if you need them for reference, they're archived at `/tools/legacy-scripts/` with full documentation.

### script philosophy

1. **essential only** - if it's not used weekly, it's not a script
2. **clarity over convenience** - obvious beats clever
3. **direct execution** - rare tasks use `tsx` directly:
   ```bash
   tsx scripts/some-analysis.ts  # no script needed
   ```

## vision

this is just the beginning:

- line-by-line audio sync & highlight
- buy physical copies with stripe or bitcoin
- dynamic user accounts, profiles, reading stats
- more translations

if you vibe with this or see a next-level improvement, fork it and submit a pr.
zero warranties, maximum fun. stay stoked.
