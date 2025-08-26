import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Node.js packages configuration
  {
    extends: './vitest.config.ts',
    test: {
      include: ['packages/**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      name: 'packages',
      environment: 'node',
      setupFiles: ['./test/setup.node.ts'],
    },
  },
  // Web app configuration (React/Next.js)
  {
    extends: './vitest.config.ts',
    test: {
      include: ['apps/web/**/*.test.ts', 'apps/web/**/*.test.tsx'],
      exclude: ['**/node_modules/**', '**/.next/**'],
      name: 'web',
      environment: 'jsdom',
      setupFiles: ['./test/setup.jsdom.ts'],
      alias: {
        '@': '/apps/web',
        '@/components': '/apps/web/components',
        '@/utils': '/apps/web/utils',
        '@/services': '/apps/web/services',
        '@/hooks': '/apps/web/hooks',
        '@/lib': '/apps/web/lib',
        '@/app': '/apps/web/app',
      },
    },
    resolve: {
      alias: {
        '@': '/apps/web',
      },
    },
  },
  // Publisher CLI configuration  
  {
    extends: './vitest.config.ts',
    test: {
      include: ['apps/publisher/**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      name: 'publisher',
      environment: 'node',
      setupFiles: ['./test/setup.node.ts'],
    },
  },
  // Content/translations configuration
  {
    extends: './vitest.config.ts',
    test: {
      include: ['content/**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      name: 'content',
      environment: 'node',
    },
  },
]);