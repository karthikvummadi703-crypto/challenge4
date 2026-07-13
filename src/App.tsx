/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Application root — intentionally kept tiny.
 *
 * The only job of this module is to lazy-load `AuthenticatedApp`, which
 * owns `AuthProvider` (and therefore `firebase/auth` / `firebase/firestore`).
 * Keeping Firebase out of this entry chunk means React can mount and show
 * the loading spinner much sooner — well before the ~695 KB Firebase chunk
 * finishes downloading.
 *
 * Chunk download is kicked off *immediately* when this module executes so
 * the Firebase bundle loads in parallel with whatever the browser is already
 * fetching.  By the time the ~2 s SplashScreen animation (inside
 * AuthenticatedApp) completes, the Firebase chunk is already parsed and in
 * the browser cache, so there is no visible Suspense flash.
 *
 * Import chain (critical path):
 *   main.tsx → App.tsx (this file, ~2 KB) → [Suspense fallback spinner]
 *   main.tsx → App.tsx → AuthenticatedApp (lazy, includes Firebase, SplashScreen, …)
 */

import React, { lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

// Start downloading the AuthenticatedApp chunk immediately — do NOT wait
// until the Suspense boundary triggers, as that would delay the download
// until after React has already mounted.
const AuthenticatedAppPromise = import('./AuthenticatedApp');
const AuthenticatedApp = lazy(() => AuthenticatedAppPromise);

/**
 * Shown by React's Suspense boundary while the AuthenticatedApp chunk
 * (firebase included) is downloading.  Matches the static HTML spinner in
 * index.html so the visual handoff is seamless.
 */
function AppLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#020617',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid rgba(16,185,129,0.25)',
          borderTop: '3px solid #10b981',
          animation: 'pre-load-spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

/**
 * Top-level application component.
 *
 * - `ErrorBoundary` is eager (it wraps everything and must never fail to render).
 * - `AuthenticatedApp` is lazy (defers Firebase from the critical-path bundle).
 */
export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoadingFallback />}>
        <AuthenticatedApp />
      </Suspense>
    </ErrorBoundary>
  );
}
