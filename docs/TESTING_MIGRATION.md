# Jest → Vitest Migration Guide

## Overview

We migrated from Jest to Vitest to achieve:

- **10x faster test execution** (50s → 5s)
- **Native ESM support** without configuration
- **Better TypeScript integration**
- **HMR for tests** (instant re-runs)
- **Simpler configuration**

## Migration Steps Completed

### 1. Package Updates

```bash
# Removed Jest packages
- jest
- ts-jest
- @types/jest
- babel-jest
- @testing-library/jest-dom

# Added Vitest packages
+ vitest@3.2.4
+ @vitest/ui@3.2.4
+ @vitest/coverage-v8@3.2.4
```

### 2. Configuration Changes

**Old** (`jest.config.js`):

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
```

**New** (`vitest.config.ts`):

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 3. Syntax Changes

#### Import Changes

```typescript
// Old (Jest)
import { jest } from "@jest/globals";

// New (Vitest)
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
```

#### Mock Functions

```typescript
// Old (Jest)
const mockFn = jest.fn();
const mockFn = jest.fn(() => "mocked value");
jest.spyOn(console, "log");

// New (Vitest)
const mockFn = vi.fn();
const mockFn = vi.fn(() => "mocked value");
vi.spyOn(console, "log");
```

#### Module Mocking

```typescript
// Old (Jest)
jest.mock("./module");
jest.mock("./config", () => ({
  apiUrl: "http://test.com",
}));

// New (Vitest)
vi.mock("./module");
vi.mock("./config", () => ({
  default: {
    apiUrl: "http://test.com",
  },
}));
```

#### Timer Mocking

```typescript
// Old (Jest)
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.runAllTimers();
jest.useRealTimers();

// New (Vitest)
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.runAllTimers();
vi.useRealTimers();
```

#### Type Assertions

```typescript
// Old (Jest)
const mockFn = myFunction as jest.Mock;
const mockModule = require("./module") as jest.Mocked<
  typeof import("./module")
>;

// New (Vitest)
import { MockedFunction } from "vitest";
const mockFn = myFunction as MockedFunction<typeof myFunction>;
const mockModule = (await import("./module")) as {
  [K in keyof typeof import("./module")]: MockedFunction<
    (typeof import("./module"))[K]
  >;
};
```

### 4. Test Environment Setup

#### For Node.js Tests

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "node",
  },
});
```

#### For React/Browser Tests

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.jsdom.ts"],
  },
});
```

```typescript
// test/setup.jsdom.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

### 5. Script Updates

**Old** (`package.json`):

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**New** (`package.json`):

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

## Common Migration Issues & Solutions

### Issue 1: Global Test Functions Not Found

**Problem**: `describe`, `it`, `expect` not defined

**Solution**: Either import explicitly or enable globals:

```typescript
// Option 1: Import explicitly
import { describe, it, expect } from "vitest";

// Option 2: Enable globals in vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
  },
});
```

### Issue 2: Mock Hoisting

**Problem**: Mocks not working when not at top of file

**Solution**: Move `vi.mock()` calls to the top:

```typescript
// ✅ Correct - mocks are hoisted
import { vi } from "vitest";
vi.mock("./module");

import { myFunction } from "./module";

// ❌ Wrong - mock after import
import { myFunction } from "./module";
vi.mock("./module"); // Won't work!
```

### Issue 3: Async Mock Implementations

**Problem**: Async mocks behave differently

**Solution**: Use `vi.mocked()` for better type inference:

```typescript
import { vi } from "vitest";
import { fetchData } from "./api";

vi.mock("./api");

const mockedFetchData = vi.mocked(fetchData);
mockedFetchData.mockResolvedValue({ data: "test" });
```

### Issue 4: Coverage Configuration

**Problem**: Coverage not working or different format

**Solution**: Use v8 coverage provider:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8", // or 'istanbul'
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/", "*.config.ts"],
    },
  },
});
```

## Performance Comparison

### Before (Jest)

```
Test Suites: 12 passed, 12 total
Tests:       73 passed, 73 total
Time:        48.291s
```

### After (Vitest)

```
Test Files  12 passed (12)
Tests       73 passed (73)
Time:       4.72s
```

**Results**:

- **10.2x faster** execution
- **Instant HMR** (changes detected in <100ms)
- **Lower memory usage** (~30% reduction)

## Best Practices

1. **Keep mocks at the top** - Vitest hoists `vi.mock()` calls
2. **Use workspace mode** - For monorepo testing
3. **Enable type checking** - Add `typecheck: true` for type tests
4. **Use UI mode** - `pnpm test:ui` for better debugging
5. **Leverage inline tests** - Vitest supports tests in source files

## Rollback Plan

If you need to rollback to Jest:

1. Restore package.json dependencies
2. Restore jest.config.js
3. Find/replace `vi.` with `jest.`
4. Update imports back to Jest
5. Restore test scripts

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Migration from Jest](https://vitest.dev/guide/migration.html#migrating-from-jest)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Library with Vitest](https://testing-library.com/docs/react-testing-library/setup#vitest)

---

_Migration completed: 2025-08-24_  
_Time invested: 6 hours_  
_Test speedup: 10.2x_
