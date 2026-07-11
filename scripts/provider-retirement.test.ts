import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const activeRoots = [
  ".env.example",
  "vercel.json",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "README.md",
  "package.json",
  "turbo.json",
  ".github/CODEOWNERS",
  ".github/workflows",
  "scripts",
  "apps/web/.env.local.example",
  "apps/web/app",
  "apps/web/lib",
  "apps/web/next.config.ts",
  "apps/web/package.json",
  "apps/web/public/monitoring",
  "apps/web/README.md",
  "apps/web/scripts",
  "apps/web/tsconfig.json",
  "apps/web/types",
  "apps/web/utils",
  "packages",
  "sync-log.json",
];

const ignoredPathSegments = new Set([
  "__tests__",
  "archive",
  "dist",
  "docs",
  "node_modules",
]);

function activeFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  if (/\.test\.[cm]?[jt]sx?$/.test(path)) return [];
  if (path.endsWith(".tsbuildinfo")) return [];
  if (!statSync(path).isDirectory()) return [path];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (
      entry.isDirectory() &&
      (ignoredPathSegments.has(entry.name) || entry.name === ".turbo")
    ) {
      return [];
    }
    return activeFiles(join(path, entry.name));
  });
}

describe("retired Vercel authority", () => {
  it("has no active deployment manifest", () => {
    const manifests = activeRoots
      .flatMap((path) => activeFiles(join(root, path)))
      .filter((path) => path.endsWith("vercel.json"))
      .map((path) => relative(root, path));

    expect(manifests).toEqual([]);
  });

  it("has no active Vercel compute or Blob authority", () => {
    const violations = activeRoots.flatMap((path) =>
      activeFiles(join(root, path)).flatMap((file) => {
        const text = readFileSync(file, "utf8");
        return /\bvercel\b|@vercel\/blob|BLOB_READ_WRITE_TOKEN|NEXT_PUBLIC_BLOB_BASE_URL|VERCEL_(?:ENV|ORG_ID|PROJECT_ID|TOKEN|URL)|api\.vercel\.com|\.vercel\.app\b/i.test(
          text,
        )
          ? [relative(root, file)]
          : [];
      }),
    );

    expect(violations).toEqual([]);
  });
});
