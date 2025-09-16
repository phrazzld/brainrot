# Repository Guidelines

## Project Structure & Module Organization
This pnpm + Turborepo monorepo splits product code into `apps/web` (Next.js front end) and `apps/publisher` (publishing CLI). Shared logic lives in `packages/@brainrot/*` for converters, metadata, templates, blob access, and shared types. Translation source lives in `content/`; generated artifacts and reports land in `generated/` and `publishing-reports/`. Use utilities from `scripts/` and reference specs in `docs/` instead of duplicating logic or data.

## Build, Test, and Development Commands
Install once with `pnpm install`. `pnpm dev` starts all workspaces; narrow scope with `--filter`. Ship-ready bundles come from `pnpm build`. Quality gates: `pnpm lint`, `pnpm typecheck`, and `pnpm format --check`. Vitest commands cover most workflows—`pnpm test` (watch), `pnpm test:run` (CI), and `pnpm test:coverage`. Content contributors should run `pnpm validate:all` plus `pnpm generate:formats <slug>` or `pnpm sync:blob` whenever translation files change.

## Coding Style & Naming Conventions
TypeScript is the default language. Prettier (`apps/web/.prettierrc.cjs`) enforces 2-space indentation, 100-character lines, single quotes, trailing commas, and sorted imports. ESLint configs in `apps/*/.eslintrc.json` block `any`, unused variables without `_` prefixes, and apply Next.js accessibility rules. Name React components, contexts, and providers in PascalCase; hooks are camelCase prefixed with `use`; files exporting utilities follow kebab-case.

## Testing Guidelines
Vitest is configured in `vitest.config.ts` with shared setup files under `test/`. Prefer co-located `.test.ts(x)` specs and keep fixtures inside adjacent `__fixtures__` or `__mocks__` folders. When touching parsers or publishing flows, add regression tests that exercise real translation samples. Use `pnpm test:coverage` before merging and call out significant coverage deltas in the PR.

## Commit & Pull Request Guidelines
History follows conventional commits (`feat:`, `fix:`, `docs:`, etc.). Keep subjects under 72 characters, imperative, and scoped (e.g., `refactor: tighten slug validation`). Pull requests must link issues when available, describe impacted packages, list verification commands, and include screenshots or sample output for UI or publisher changes. Confirm linting and targeted scripts locally before requesting review.

## Security & Configuration Tips
Copy `.env.example` to `.env.local`; never commit credentials or service tokens. Run `./scripts/setup-git-hooks.sh` to enable secret scanning, and use `pnpm audit` before updating dependencies. Treat translation payloads as untrusted input—validate extensions and sanitize HTML in converters. Consult `docs/SECURITY.md` or ping maintainers when handling production data paths.
