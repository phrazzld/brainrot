import { beforeAll, afterEach, afterAll, vi } from "vitest";

// Set up test environment variables
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_SPACES_BASE_URL =
  "https://brainrot-publishing.nyc3.digitaloceanspaces.com";

// Polyfill TextDecoder and TextEncoder if needed
if (typeof global.TextDecoder === "undefined") {
  const { TextDecoder, TextEncoder } = require("util");
  global.TextDecoder = TextDecoder as any;
  global.TextEncoder = TextEncoder as any;
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});
