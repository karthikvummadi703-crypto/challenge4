---
name: Hackathon score improvements
description: Patterns and pitfalls found while pushing Code Quality / Testing / Accessibility scores toward 99 on the Nexus AI project.
---

## `any` → `unknown` cascade

Changing `Record<string,any>` to `Record<string,unknown>` in `dataSource.ts` / `demoStore.ts` propagates downstream:
- Dashboard components that do `const data = docSnap.data()` then assign `data.field` to a typed interface field now get TS errors.
- Fix: add a local cast at each usage site: `const data = docSnap.data() as Record<string, string>`.
- For typed fields (e.g. Task['type']), cast individually: `type: t.type as Task['type']`.

**Why:** `unknown` is stricter than `any`; it surfaces real type gaps but requires deliberate casts at boundaries.

## Vitest mock hoisting

`vi.mock()` factories are hoisted to the top of the file. If the factory closes over a variable declared with `const/let` below, you get `ReferenceError: Cannot access '...' before initialization`.

Fix: use `vi.hoisted()` to create shared mutable state that the factory can safely close over:
```ts
const { mockFn, stateRef } = vi.hoisted(() => ({
  mockFn: vi.fn(),
  stateRef: { value: false },
}));
vi.mock('../src/some-module', () => ({ fn: mockFn }));
```

## Firestore DocumentSnapshot: exists() is a METHOD

In real Firestore SDKs, `snap.exists()` is a function call, not a property access. Test mocks must reflect this:
```ts
// WRONG
{ exists: true, data: () => ({}) }
// CORRECT
{ exists: () => true, data: () => ({}) }
```

## sessionStorage not available in Node vitest environment

`demoStore.ts` guards all sessionStorage calls with `if (typeof window === 'undefined') return;`. In the standard Vitest Node environment, `window` is undefined so sessionStorage calls are silently skipped. Don't write tests that assert on `sessionStorage.setItem` unless the test file uses `@vitest-environment jsdom`.

## BroadcastChannel in Node tests

Must be stubbed with `vi.stubGlobal('BroadcastChannel', MockClass)` BEFORE the module under test is imported. Since Vitest caches module imports, the stub must be set up at the top level (not inside `beforeEach`).

## Accessibility patterns fixed

- Button groups (set of buttons acting as a radio group): use `<span id="label-id">` + `<div role="group" aria-labelledby="label-id">` instead of `<label>` without `htmlFor`.
- Footer placeholder links: use `href="#landing-page-root"` (a real anchor) + `aria-label="Descriptive text"` instead of `href="#"`.
- Heading hierarchy: `<h4>` inside a card component that may be rendered without an h1-h3 ancestor → change to `<p>` with matching font styles.
- Cart quantity buttons: icon-only `<Minus>/<Plus>` buttons need `aria-label={\`Remove one ${item.name}\`}`.
- Screen-reader-only form labels: use `<label htmlFor="id" className="sr-only">` for inputs whose purpose is visually obvious but needs an accessible name.
