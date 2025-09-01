# BACKLOG

Purpose: Tight, spec’d, actionable backlog aligned to highest-leverage outcomes across architecture, security, UI/UX, and DX. Each item includes a clear spec, acceptance criteria, effort, and dependencies.

Legend
- Effort: S (≤1 day), M (2–4 days), L (1–2 weeks)
- Priority: P0 (now), P1 (next), P2 (later)

---

EPIC A: Single Source of Truth for Translations (P0)
Goal: Eliminate drift between content/ and web, make adding a book a zero-code operation.

- [ ] A1 Generate translations manifest at build time (server-side)
  - Spec:
    - Build step parses content/translations/books/*/metadata.yaml via @brainrot/metadata.
    - Discover chapters from generated/text/*.txt (preferred) or brainrot text folder when not generated.
    - Emit apps/web/.generated/translations.json with fields: slug, title, shortDescription, coverImage, status, purchaseUrl?, chapters[{title,text,audioSrc?}].
    - Next server components import the manifest (no client bundle impact).
  - Acceptance:
    - Adding a new book + metadata shows on Explore without editing TS files.
    - Build fails if metadata invalid or missing required fields.
  - Effort: M
  - Deps: @brainrot/metadata; scripts/generate-formats.ts (optional if falling back to brainrot dir)

- [ ] A2 Replace hand-authored web translations with generated manifest
  - Spec: Remove apps/web/translations/books/*.ts and index.ts usage from pages. Switch Explore/Reading Room to load from translations.json.
  - Acceptance: Explore and Reading Room functionally identical using generated data; no imports from apps/web/translations/* remain in app code.
  - Effort: M
  - Deps: A1

---

EPIC B: De-duplication and Legacy Cleanup (P0)
Goal: Reduce cognitive load and prevent regressions by removing duplicate/legacy variants.

- [ ] B1 Remove duplicate/variant files (.updated.ts, .fixed.ts) from runtime paths
  - Spec: Decide canonical implementations and delete duplicates in apps/web/app/api/download/** and services/. Ensure no *.updated.ts or *.fixed.ts remain under apps/web/src paths.
  - Acceptance: rg finds zero files matching ".updated.ts|.fixed.ts" under app runtime; build and routes still pass.
  - Effort: S–M

- [ ] B2 Archive or delete deprecated modules
  - Spec: Move deprecated code (e.g., apps/web/utils/downloadFromSpaces.js, tools/legacy-scripts) into a dedicated package (tools/legacy-scripts) and exclude from Next build/test via tsconfig/next config.
  - Acceptance: Next build tree-shakes legacy; no imports from deprecated modules in app.
  - Effort: S

- [ ] B3 CI guardrail against variant files
  - Spec: Add a CI job that fails if new files matching *.updated.ts or *.fixed.ts are added in app src directories.
  - Acceptance: PRs adding such files fail CI with a clear message.
  - Effort: S

---

EPIC C: Unified Asset Paths and Download Flow (P0)
Goal: One mental model for all assets; direct URLs by default; proxy only when needed.

- [ ] C1 Standardize blob paths across text/audio/images
  - Spec: All assets live at ${BLOB_BASE}/books/${slug}/{text|audio|images}/... (align text with scripts/sync-translations.ts; update audio path generation in AssetService).
  - Acceptance: AssetService generates paths under /books/${slug}/audio; text remains /books/${slug}/text; cover images /books/${slug}/images.
  - Effort: M

- [ ] C2 Make direct download the default end-to-end
  - Spec: Download API returns direct Blob URL by default; proxy only with ?proxy=true or for private assets; UI calls use direct path.
  - Acceptance: DownloadButton no longer forces proxy; direct URL path used; proxy remains functional via flag.
  - Effort: S–M

- [ ] C3 Remove S3/Spaces vestiges
  - Spec: Delete dead code/branches referencing non-Blob backends; remove @aws-sdk/client-s3 if truly unused by the app runtime.
  - Acceptance: rg finds no references to Spaces/S3 in apps/web; bundle size reduced.
  - Effort: S

---

EPIC D: UI/UX Quality Pass (P1)
Goal: Faster loads, better accessibility, and discoverability.

- [ ] D1 Convert Explore to server component with skeletons
  - Spec: Make apps/web/app/explore/page.tsx a server component reading translations.json; add simple skeletons for images/cards.
  - Acceptance: Explore shows instantly server-rendered; no ‘use client’; Lighthouse improves TTI/LCP for Explore.
  - Effort: S
  - Deps: A1/A2

- [ ] D2 Modal accessibility and keyboard support
  - Spec: Add focus-trap, initial focus, return focus to trigger, close on ESC, aria attributes on ShareModal and DownloadModal.
  - Acceptance: Axe/lighthouse a11y passes for modals; keyboard-only flow works.
  - Effort: S

- [ ] D3 Add search/filter/sort to Explore
  - Spec: Client-side search by title/description; filter by status (available/coming soon).
  - Acceptance: Typing filters grid; URL query persisted (?q=...&status=...).
  - Effort: M

- [ ] D4 Reduce client bundle on Home
  - Spec: Replace GSAP hero with CSS-only animation or lazy-load GSAP; measure bundle diff.
  - Acceptance: Home JS bundle reduced; CLS/LCP unaffected.
  - Effort: S

---

EPIC E: DX, Linting, and CI Guardrails (P1)
Goal: Catch issues early, keep code consistent across packages.

- [ ] E1 Unify ESLint/Prettier across monorepo
  - Spec: Single ESLint v9 flat config and Prettier config at repo root; packages extend; run pnpm lint from root.
  - Acceptance: CI lint passes; no duplicate configs; no eslint-disable reintroductions on touched files.
  - Effort: M

- [ ] E2 Enforce typecheck/lint pre-merge and pre-commit
  - Spec: CI must run pnpm typecheck and pnpm lint; add husky + lint-staged at root to run eslint/prettier on staged files and the existing secret scan.
  - Acceptance: PRs with type errors/lint errors fail; pre-commit runs fast on staged files.
  - Effort: S–M

- [ ] E3 Turborepo remote cache
  - Spec: Ensure TURBO_TOKEN/TURBO_TEAM configured in all CI jobs; verify cache hits in logs.
  - Acceptance: 60–80% CI time reduction on subsequent runs.
  - Effort: S

- [ ] E4 Bundle size guard for web
  - Spec: Add Next build analyzer or size-limit to report per-page bundle deltas in CI comments; set soft thresholds.
  - Acceptance: CI posts bundle diff on PR; soft fail on large regressions.
  - Effort: S

---

EPIC F: Security Hardening (P0)
Goal: Sensible defaults for public endpoints and supply chain.

- [ ] F1 Rate limit /api/download
  - Spec: Add @vercel/rate-limit (or edge-compatible limiter) to cap 100 req/min/IP; include correlation ID in 429 responses.
  - Acceptance: Load test returns 429 after threshold; logs show correlation IDs.
  - Effort: S

- [ ] F2 Content Security Policy and security headers
  - Spec: Set CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via Next middleware/config; document external domains (vercel blob, images).
  - Acceptance: Observatory score improves; no broken resources.
  - Effort: S

- [ ] F3 Secrets scanning in CI
  - Spec: Add gitleaks detect as CI job (redact on output); keep local pre-commit hook as-is.
  - Acceptance: PR with a mock secret fails; clear remediation steps printed.
  - Effort: S

---

EPIC G: Types and Shared Packages (P1)
Goal: One place for shared interfaces, less drift.

- [ ] G1 Centralize types in @brainrot/types
  - Spec: Move apps/web/utils/types.ts and apps/web/translations/types.ts interfaces into @brainrot/types; update imports.
  - Acceptance: rg shows no type duplicates in app; packages consume the same definitions.
  - Effort: S

---

EPIC H: Publisher CLI Foundation (P2)
Goal: Make CLI useful for real workflows with safety.

- [ ] H1 Implement real list/validate using @brainrot/metadata
  - Spec: “list” scans content/translations/books; “validate” loads metadata.yaml and reports schema issues.
  - Acceptance: CLI outputs real books and validation results; exits non‑zero on invalid metadata.
  - Effort: M

- [ ] H2 Mock mode everywhere and report artifacts
  - Spec: Ensure mockMode works across KDP/Lulu commands; write publishing-reports/* JSON with results.
  - Acceptance: Dry runs produce deterministic reports usable in CI artifacts.
  - Effort: S–M

---

EPIC I: Content Pipeline Enhancements (P2)
Goal: Faster, smarter syncs.

- [ ] I1 Checksums manifest for sync
  - Spec: Write a checksums.json alongside generated text; sync script uses it to skip unchanged uploads without HEAD calls.
  - Acceptance: No-op syncs upload 0 files; log clearly states skipped by checksum.
  - Effort: M

---

Parking Lot (consider later)
- Progressive Image placeholders and blurDataURL (P2, M)
- Error tracking with Sentry (P2, M)
- Vercel Analytics (P2, S)
- “Notify me” for coming-soon + local reading progress (P2, S–M)
- ADRs for major decisions (P2, S)

---

Milestone Plan (suggested)
- Milestone 1 (P0, weeks 1–2): A1–A2, B1–B3, C1–C2, F1–F3
- Milestone 2 (P1, weeks 3–4): D1–D2, E1–E4, G1, C3
- Milestone 3 (P2, month 2): H1–H2, I1, D3–D4, Parking Lot items as capacity allows
