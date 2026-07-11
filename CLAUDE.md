# Brainrot contributor guide

Brainrot is a pnpm/Turborepo publishing monorepo. Read `VISION.md` before
changing the publishing ambition, translation philosophy, physical-book
quality target, or format strategy. Read `TRANSLATION_GUIDELINES.md` before
editing translation content.

## Current architecture

- `apps/web`: Next.js reading experience deployed by DigitalOcean App Platform.
- `apps/publisher`: KDP and Lulu publishing automation.
- `packages/@brainrot/*`: shared conversion, metadata, template, and type code.
- `content/translations`: canonical book source.
- `generated`: generated release files.
- DigitalOcean Spaces: authoritative production asset storage and delivery.

The historical storage migration plan and hash manifest live under `docs/` as
evidence. They are not rollback instructions. Retired scripts live under
`tools/legacy-scripts/` and are not production tools.

## Required gate

```bash
pnpm ci:required
```

That command owns lint, type checking, tests, translation validation, and the
production build. Do not bypass an individual lane to get a change green.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm test:run
pnpm generate:formats book <slug>
pnpm sync:spaces book <slug>
```

Generate every book with `pnpm generate:formats all`; publish every generated
book to Spaces with `pnpm sync:spaces all`.

## Environment contract

The web reader needs `NEXT_PUBLIC_SPACES_BASE_URL`. Asset publishing needs:

```text
SPACES_ACCESS_KEY_ID
SPACES_SECRET_ACCESS_KEY
SPACES_ENDPOINT
SPACES_BUCKET_NAME
SPACES_REGION (optional; defaults to us-east-1)
```

Never commit credentials or print their values. KDP and Lulu credentials are
separate publishing boundaries documented in `.env.example`.

## Product invariants

- Only transform public-domain works with recorded source provenance.
- Preserve plot, characters, and emotional movement through the joke.
- Treat translation style as an artistic language, not random slang.
- Physical releases must be credible books, not unreviewed generated output.
- Automate conversion and publishing drudgery without automating away taste.
