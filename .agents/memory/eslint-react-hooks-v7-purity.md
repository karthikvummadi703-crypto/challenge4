---
name: eslint-plugin-react-hooks v7 "recommended" is React-Compiler strict
description: Why eslint-plugin-react-hooks's recommended config can flood a normal (non-Compiler) React codebase with errors, and what to use instead.
---

`eslint-plugin-react-hooks@7+`'s `recommended` / `recommended-latest` config
bundles new React-Compiler-oriented rules (`react-hooks/purity`,
`react-hooks/set-state-in-effect`, etc.) on top of the classic
`rules-of-hooks` / `exhaustive-deps`. These flag extremely common, valid
patterns as errors — `Math.random()`/`Date.now()` calls during render,
`setState` inside a plain `useEffect` body — which is only actually a problem
for apps opting into the React Compiler.

**Why it matters:** adopting the plugin's `recommended` config in a normal
(non-Compiler) codebase can produce 100+ new lint errors that would require an
unrelated architectural rewrite to fix, derailing an otherwise-scoped lint
setup task.

**How to apply:** when adding ESLint to a React codebase not using the React
Compiler, configure only the two classic rules manually instead of spreading
the plugin's `recommended`/`recommended-latest` config:
```js
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
}
```
