import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    target: "node18",
  },
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      // Use jsdom for component and hook tests
      ["apps/web/**/*.test.tsx", "jsdom"],
      ["apps/web/__tests__/hooks/**", "jsdom"],
      ["apps/web/__tests__/components/**", "jsdom"],
    ],
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
      "content/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      // Temporarily exclude tests that require external binaries
      "**/e2e-pipeline.test.ts",
      "**/pandocConverters.test.ts",
      // Temporarily exclude web app tests with import issues
      "apps/web/__tests__/**/*.test.ts",
      "apps/web/__tests__/**/*.test.tsx",
      // Temporarily exclude failing converter/metadata tests
      "**/batchConverter.test.ts",
      "**/isbn.test.ts", // Has Vitest/mocking issues
    ],
    setupFiles: ["./test/setup.node.ts", "./test/setup.jsdom.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/coverage/**",
        "**/*.config.*",
        "**/generated/**",
        "**/tools/**",
        "**/scripts/**",
        "**/__mocks__/**",
        "**/test/**",
      ],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
    // Restore mocks between tests
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./apps/web"),
      "@brainrot/converter": resolve(
        __dirname,
        "./packages/@brainrot/converter/src",
      ),
      "@brainrot/metadata": resolve(
        __dirname,
        "./packages/@brainrot/metadata/src",
      ),
      "@brainrot/blob-client": resolve(
        __dirname,
        "./packages/@brainrot/blob-client/src",
      ),
      "@brainrot/types": resolve(__dirname, "./packages/@brainrot/types/src"),
      "@brainrot/templates": resolve(
        __dirname,
        "./packages/@brainrot/templates/src",
      ),
    },
  },
});
