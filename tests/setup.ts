/**
 * Global Vitest setup — runs before every test file.
 *
 * @testing-library/jest-dom extends Vitest's `expect` with DOM-aware matchers
 * such as `toBeInTheDocument`, `toHaveAttribute`, `toBeVisible`, etc.
 * Only the matchers are loaded here; the jsdom environment itself is opted into
 * per test file with `// @vitest-environment jsdom`.
 */
import '@testing-library/jest-dom';
