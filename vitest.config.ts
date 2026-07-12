import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default environment is Node for server/service tests.
    // Component tests in tests/components/ override this with
    // `// @vitest-environment jsdom` at the top of each file.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // firestoreRules.test.ts needs a live Firestore emulator (see `npm run
    // test:rules`, which boots one via `firebase emulators:exec`) — excluded
    // from the default `npm test` run so it doesn't fail without one.
    exclude: ['node_modules/**', 'tests/firestoreRules.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['server.ts', 'src/services/**/*.ts', 'src/components/**/*.tsx'],
      // Floors set just under current measured coverage so a future PR that
      // silently drops coverage fails CI, without blocking on the parts of
      // src/services (apiClient/authService/userService/dataSource) that are
      // thin Firebase SDK wrappers better suited to integration/e2e testing.
      thresholds: {
        'server.ts': { statements: 65, branches: 70, functions: 50, lines: 65 },
      },
    },
  },
});
