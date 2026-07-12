// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

/** A component that throws when `shouldThrow` is true. */
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>All good</div>;
}

// Suppress React's noisy error boundary console.error during tests.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders the default fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test explosion/)).toBeInTheDocument();
  });

  it('shows a "Try Again" button in the default fallback', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={(error) => <p>Custom: {error.message}</p>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom: Test explosion')).toBeInTheDocument();
  });

  it('resets and shows children again after clicking "Try Again"', () => {
    // Use a ref-controlled component so we can flip shouldThrow without a
    // rerender — the boundary will re-render its children upon resetError().
    const throwRef = { current: true };
    const ControlledBomb = () => {
      if (throwRef.current) throw new Error('Controlled explosion');
      return <div>All good</div>;
    };

    render(
      <ErrorBoundary>
        <ControlledBomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();

    // Disable throwing before clicking Try Again so the boundary shows children.
    throwRef.current = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('uses role="alert" on the default error screen for assistive technology', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls console.error with the caught error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });

  it('does not render fallback when no error occurs', () => {
    render(
      <ErrorBoundary fallback={() => <p>Fallback shown</p>}>
        <div>No crash</div>
      </ErrorBoundary>
    );
    expect(screen.queryByText('Fallback shown')).not.toBeInTheDocument();
    expect(screen.getByText('No crash')).toBeInTheDocument();
  });
});
