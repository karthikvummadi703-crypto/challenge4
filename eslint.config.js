// Flat ESLint config (ESLint 9+). Scoped to catch real bugs and enforce
// consistency without fighting the existing TS/React style already in use
// across the project (Tailwind-heavy JSX, `any` at Firestore boundaries).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**', 'node_modules/**', 'coverage/**', '.cache/**',
      // Replit agent tooling/reference scripts, not part of the app.
      '.local/**', '.agents/**', 'attached_assets/**', 'assets/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Only the long-standing hook-correctness rules — not the newer
      // React-Compiler-oriented "purity"/set-state-in-effect rules, which
      // would demand a large architectural rewrite unrelated to this pass.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Firestore/Firebase Admin payloads are inherently untyped at the
      // boundary (`Record<string, any>`, doc.data()) — the codebase already
      // relies on `any` there deliberately rather than by omission.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
);
