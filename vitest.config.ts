import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // firestoreRules.test.ts needs a live Firestore emulator (see `npm run
    // test:rules`, which boots one via `firebase emulators:exec`) — excluded
    // from the default `npm test` run so it doesn't fail without one.
    exclude: ['node_modules/**', 'tests/firestoreRules.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['server.ts', 'src/services/**/*.ts'],
    },
  },
});
