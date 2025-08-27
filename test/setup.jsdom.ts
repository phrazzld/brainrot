import { beforeAll, afterEach, vi } from 'vitest';

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://test.blob.vercel-storage.com';
process.env.NEXT_PUBLIC_BLOB_DEV_URL = 'https://dev.blob.vercel-storage.com';

// Polyfill TextDecoder and TextEncoder if needed
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder as any;
  global.TextEncoder = TextEncoder as any;
}

// Mock window.URL.createObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
  window.URL.revokeObjectURL = vi.fn();
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: () => [],
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    query: {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // Create a mock element without JSX
    return {
      type: 'img',
      props: { src, alt, ...props }
    };
  },
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});