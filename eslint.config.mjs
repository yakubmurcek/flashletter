// Biome (biome.json) is the main linter. ESLint stays for the one check Biome cannot do
// yet: promises nobody waits for, which needs the TypeScript compiler's types. Biome's
// noFloatingPromises misses library promises such as an un-awaited Supabase query
// (tested 2026-11-25 on Biome 2.6.6), and a dropped await on a save is a lost save.
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules/', '.next/', 'out/', 'public/', '**/*.js', '**/*.mjs'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        // React's act() around synchronous work returns a thenable nobody needs to wait for.
        {
          allowForKnownSafeCalls: [
            { from: 'package', name: 'act', package: '@testing-library/react' },
            { from: 'package', name: 'act', package: 'react' },
          ],
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
)
