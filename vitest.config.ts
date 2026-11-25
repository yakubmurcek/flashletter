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
  },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
    },
  },
})
