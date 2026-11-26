import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    // Match Next.js's automatic JSX runtime so component tests don't have to
    // `import React` just to render JSX in test bodies.
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    // e2e/ holds Playwright tests (pnpm test:e2e), which need a browser and a server.
    exclude: ['**/node_modules/**', 'e2e/**'],
    // `pnpm test:coverage` (CI) prints the share of app code the tests run. Report only for now:
    // no threshold until a baseline is agreed.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['app/**', 'components/**', 'lib/**', 'middleware.ts'],
    },
  },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
    },
  },
})
