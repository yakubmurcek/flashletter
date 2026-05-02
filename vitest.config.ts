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
  },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
    },
  },
})
