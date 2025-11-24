## Planning Report
**Spec**: DESIGN.md (Security patch vulnerable deps)  
**Tasks Generated**: 8  
**Total Estimate**: 5h  
**Critical Path**: 3.5h (T1 → T2 → T3 → T6 → T7)

### Task Summary
| Phase | Tasks | Estimate | Dependencies |
| --- | --- | --- | --- |
| Setup | 2 | 1h | None |
| Core | 3 | 2h | Setup |
| Validation | 2 | 1.5h | Core |
| Optional | 1 | 0.5h | Decision |

### Critical Path
1. T1 Update root overrides (0.5h) →  
2. T2 Bump publisher deps (0.5h) →  
3. T3 Regenerate lockfile (0.5h) →  
4. T6 Run quality gates (1.0h) →  
5. T7 Publisher smoke (1.0h)

### TODO
- [x] T1 Update dependency floors in root overrides  
  Files: `package.json` (root)  
  Goal: Enforce patched minimum versions for playwright, @playwright/test, tar-fs, tar-stream, glob.  
  Approach:  
  1) Set override versions to latest patched (per advisory).  
  2) Keep existing overrides (esbuild/tmp/lodash).  
  Success Criteria: Overrides present with patched semver ranges; no duplicate keys removed.  
  Tests: `pnpm install --lockfile-only` succeeds.  
  Estimate: 0.5h  

- [x] T2 Bump publisher direct deps to patched Playwright  
  Files: `apps/publisher/package.json`  
  Goal: Align workspace deps with override floors.  
  Approach: Update `playwright` and `@playwright/test` versions to target.  
  Success Criteria: package.json reflects patched versions; no other deps changed.  
  Tests: `pnpm install --lockfile-only` still succeeds.  
  Estimate: 0.5h  
  depends: T1  

- [x] T3 Regenerate lockfile deterministically  
  Files: `pnpm-lock.yaml`  
  Goal: Capture patched transitive deps (tar-fs/tar-stream/glob).  
  Approach: `pnpm install --lockfile-only` (or `pnpm update playwright @playwright/test glob` then install) using Node 22/pnpm 8.15.1.  
  Success Criteria: Lockfile shows patched versions; no orphan workspaces; `pnpm install --frozen-lockfile` passes locally.  
  Tests: `pnpm list playwright tar-fs tar-stream glob` confirms versions.  
  Estimate: 0.5h  
  depends: T1, T2  

- [x] T4 Add Playwright browser cache to CI  
  Files: `.github/actions/setup/action.yml` (or workflow)  
  Goal: Cache `~/.cache/ms-playwright` keyed by Playwright version to avoid install regressions.  
  Approach:  
  1) Add cache step using actions/cache with key `${{ runner.os }}-pw-${{ steps.versions.outputs.playwright }}` (or hardcode version).  
  2) Ensure install step runs `pnpm exec playwright install chromium` when cache miss.  
  Success Criteria: CI restores cache when available; install step deterministic.  
  Tests: Dry-run locally (optional) or rely on CI logs showing cache step executes.  
  Estimate: 0.5h  
  depends: T3  

- [?] T5 Add audit command + optional CI gate (pending approval)  
  Files: `package.json` (root scripts), `.github/workflows/ci.yml`  
  Goal: Provide `pnpm audit --audit-level=high` script; optionally run in CI.  
  Approach:  
  1) Add script `\"security:audit\": \"pnpm audit --audit-level=high\"`.  
  2) (If approved) add CI job/step after build.  
  Success Criteria: Script runs locally; CI step added only if approved.  
  Tests: `pnpm run security:audit` exits 0 with patched deps.  
  Estimate: 0.5h  
  depends: Decision from stakeholders  

- [x] T6 Run quality gates locally  
  Files: n/a (commands)  
  Goal: Verify lint/type/test/validate/build on updated deps.  
  Approach: run `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm validate:all`, `pnpm build`.  
  Success Criteria: All commands pass on updated lockfile.  
  Tests: Command outputs success.  
  Estimate: 1.0h  
  depends: T3  

- [x] T7 Publisher mock smoke with new Playwright  
  Files: n/a (commands/logs)  
  Goal: Ensure KDP/Lulu flows still launch chromium and exit cleanly.  
  Approach: Run mock/dry-run publish for one sample book (document command used); capture logs.  
  Success Criteria: CLI exits 0; no unhandled rejections; Playwright version logged.  
  Tests: Manual run output.  
  Estimate: 1.0h  
  depends: T6  

- [x] T8 Document remediation note  
  Files: `TASK.md` (status note) and/or `README.md` changelog snippet  
  Goal: Record versions applied and commands run.  
  Approach: Add brief bullet noting patched versions and audit result.  
  Success Criteria: Docs updated; no conflict with existing guidance.  
  Tests: n/a (doc review).  
  Estimate: 0.5h  
  depends: T7  

### Out of Scope / Not Doing
- Replacing Playwright with remote service.  
- Adding new E2E suites (future).  
- Backports to release branches unless explicitly requested.  

### Risks
- CI time regression from browser downloads → mitigated by T4 cache.  
- Hidden Playwright API breaking change → mitigated by T7 smoke.  
- Audit step blocking contributors without internet → keep optional (T5) pending approval.  
