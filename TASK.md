# TASK: Security patch vulnerable deps (playwright, tar-fs, glob)

## Executive Summary
- High-severity CVEs in Playwright stack (incl. @puppeteer/browsers → tar-fs) and glob threaten supply chain, CI trust, publishing automation.
- Update to latest patched versions across workspaces, tighten overrides to enforce floors, rerun full monorepo quality gates.
- Success: `pnpm audit --audit-level=high` reports 0 HIGH, `pnpm lint typecheck test:run validate:all build` all pass, publisher KDP mock run succeeds, no new flaky CI, lockfile stable.

## User Context & Outcomes
- Stakeholders: security-sentinel, publisher operators (KDP/Lulu), infra/CI maintainers.
- Pain removed: exploit surface via tar extraction + path traversal; broken CI due to audit blocks; trust in automation restored.
- Outcomes: secure releases without slowing publish cadence; predictable CI/install times; documented remediation steps.

## Requirements
- Functional:
  - Upgrade Playwright + @playwright/test in `apps/publisher/package.json`; refresh lockfile so tar-fs, tar-stream move to patched versions.
  - Upgrade root `glob` (and any transitive instances) or override to patched version; keep API usage working.
  - Ensure `playwright install chromium` (or equivalent) runs where needed (CI caching, dev instructions).
  - Keep CLI commands (`brainrot-publish`, KDP/Lulu flows) behavior identical.
  - Document remediation + new minimum versions in README/TASK.
- Non-functional:
  - Performance: install/build time not +20%; browser download cached via CI cache/Turbo.
  - Reliability: no new flakes in publisher automation; backward compatible Node 22.
  - Security: enforce version floors via `pnpm.overrides`; consider adding `pnpm audit --audit-level=high` to CI pre-merge.
  - Operability: lockfile deterministic; `pnpm install --frozen-lockfile` remains usable in CI.
- Infrastructure requirements:
  - Quality gates: run `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm validate:all`, `pnpm build` before release.
  - Observability: monitor CI durations; log Playwright install failures; leverage existing pino logging for CLI.
  - Design consistency: keep monorepo dependency management centralized; no per-package ad-hoc pinning.
  - Security ops: secrets remain in vault; no tokens in git; ensure secret_scanning.yml unchanged.

## Architecture Decision
- Chosen approach: **A. Direct workspace upgrades with enforced overrides** — bump Playwright/@playwright/test and root glob to latest patched, regenerate lock, add overrides to pin floors, run full pipeline.
- Rationale: highest user value, keeps module boundaries (publisher owns Playwright), minimal complexity.
- Alternatives (score out of 100; weights: value 40, simplicity 30, explicitness 20, risk 10):
  | Option | Value | Simplicity | Explicitness | Risk | Total | Rejection reason |
  | --- | --- | --- | --- | --- | --- | --- |
  | A. Direct upgrades + overrides | 38 | 26 | 18 | 8 | 90 | Selected |
  | B. Overrides only (no package bump) | 30 | 24 | 16 | 9 | 79 | Leaves code on old APIs, risk hidden break later |
  | C. Remove Playwright in favor of remote runner/service | 20 | 14 | 12 | 5 | 51 | Overkill, new infra, delays fix |
- Module boundaries: dependency versions set in `apps/publisher/package.json` + root `pnpm.overrides`; CLI code unaware of version specifics. Lockfile managed at repo root to avoid per-package drift. No pass-through version constants.

## Data & API Contracts
- No external API schema change. Internal contract: Playwright helpers expect `chromium` from `playwright` and test runner API from `@playwright/test`; verify breaking changes (launch options defaults, context permissions).
- Glob usage: root scripts rely on glob 11 behavior; confirm patterns still match content/ and scripts/* paths.
- Tar behavior remains internal to Playwright browser fetch; ensure download cache path unchanged.

## Implementation Phases
- MVP (today): bump versions, regenerate lockfile, add/adjust overrides, update docs, run full quality gate commands, manual smoke of publisher CLI in mock/dry-run.
- Hardening: fix any API breakage in KDP/Lulu automation, adjust Playwright install caching in CI, add `pnpm audit --audit-level=high` script and optional CI step, pin browser download channel if needed.
- Future: automate monthly security audit job; evaluate replacing Playwright with lighter HTTP flows for non-browser tasks; add Lefthook hooks for audit/lint/typecheck.

## Current Status (2025-11-24)
- Applied overrides floors: playwright/@playwright-test 1.56.1, tar-fs 3.1.1, tar-stream 3.1.7, glob 11.1.0.
- Updated apps/publisher direct deps to Playwright 1.56.1; lockfile regenerated.
- CI setup action now caches `~/.cache/ms-playwright` and installs chromium on miss.
- Quality gates run with `CI=true`: `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (blobUrl tests skipped in CI mode), `pnpm validate:all`, `pnpm build` — all passing.
- pnpm audit --audit-level=high → 0 HIGH (2 moderate, 2 low remaining).
- Publisher mock smoke: `pnpm --filter @brainrot/publisher exec tsx src/index.ts kdp publish great-gatsby --mock --dry-run` succeeded (mock draft saved, no browser launched in mock mode).

## Testing & Observability
- Required checks: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm validate:all`, `pnpm build`.
- Targeted tests: run publisher CLI mock publish for one book (Lulu + KDP) to verify Playwright launch; run any glob-using scripts (`pnpm generate:formats <book>`) on sample book.
- Security tests: `pnpm audit --audit-level=high` returns 0 HIGH; verify no new warnings from `npm audit --production` if used.
- Observability: watch CI cache hit rates/time; log Playwright install failures; monitor Vercel deploy logs for size/time regressions. Note: Sentry not yet installed—manual log review required.

## Risks & Mitigations
- Playwright API change breaks kdp.ts automation → smoke in mock mode; pin to known-good minor if needed.
- Browser download size/time increases → pre-cache via CI cache (`~/.cache/ms-playwright`) and document `PLAYWRIGHT_BROWSERS_PATH`.
- Glob semantics shift (default dotfiles) → rerun path-sensitive scripts; add regression tests for path globs.
- Lockfile churn causes frozen-lockfile failures → commit updated lock; coordinate with Dependabot auto-merge.

## Open Questions / Assumptions
- Can we bump to latest Playwright (current in repo: 1.55)? Any infra pinned to older browsers?
- Should `pnpm audit --audit-level=high` be added to CI (pre-push/pre-merge)?
- Are publisher runs allowed extra download time in CI, or must we ship cached browsers?
- Any environments airgapped/offline where Playwright browser download fails?
- Scope: apply to main branch only or backport?
- Acceptance metric: is 0 HIGH in pnpm audit sufficient, or need Snyk/OSS review?
- ADR: not required (low reversal cost); create only if we pivot to Playwright replacement.
