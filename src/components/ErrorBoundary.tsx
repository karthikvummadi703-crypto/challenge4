import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  /** Content to render when no error is caught. */
  children: ReactNode;
  /**
   * Optional custom fallback. When omitted, a default error screen is shown.
   * Receives the caught error and a `resetError` callback.
   */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based error boundary that catches unhandled render/lifecycle errors
 * in its subtree and shows a safe fallback instead of crashing the entire app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <SomeComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.resetError = this.resetError.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console in development; swap for a real error-reporting service
    // (e.g. Sentry) in production without touching the component interface.
    console.error('[ErrorBoundary] Caught unhandled error:', error, info.componentStack);
  }

  resetError(): void {
    this.setState({ hasError: false, error: null });
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError || !error) return children;

    if (fallback) return fallback(error, this.resetError);

    return (
      <div
        role="alert"
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4"
      >
        <div
          className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg"
          aria-hidden="true"
        >
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Something Went Wrong</h2>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          An unexpected error occurred. Please try refreshing the page.
          {error.message && (
            <span className="block mt-2 font-mono text-red-400 break-words">{error.message}</span>
          )}
        </p>
        <button
          onClick={this.resetError}
          className="mt-4 px-4 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-mono font-bold uppercase tracking-widest hover:bg-emerald-500/10 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
