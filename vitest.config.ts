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
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**"],
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
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
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
