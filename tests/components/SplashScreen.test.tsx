// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ── Mock useReducedMotion so we can control it per test ───────────────────────
const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
    button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
      <button onClick={onClick} {...props}>{children}</button>,
  },
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ── Stub out canvas-heavy sub-components ─────────────────────────────────────
vi.mock('../../src/components/Antigravity', () => ({
  default: () => <div data-testid="antigravity-stub" />,
}));
vi.mock('../../src/components/BlurText', () => ({
  default: ({ text, className }: { text: string; className?: string }) =>
    <p className={className}>{text}</p>,
}));

const { default: SplashScreen } = await import('../../src/components/SplashScreen');

describe('SplashScreen', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the NEXUS AI brand title', () => {
    render(<SplashScreen onComplete={onComplete} />);
    expect(screen.getByText('NEXUS AI')).toBeInTheDocument();
  });

  it('renders the skip button', () => {
    render(<SplashScreen onComplete={onComplete} />);
    expect(screen.getByRole('button', { name: /skip initialization/i })).toBeInTheDocument();
  });

  it('calls onComplete immediately when reduced motion is preferred', () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<SplashScreen onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onComplete immediately when motion is allowed', () => {
    render(<SplashScreen onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete when the skip button is clicked', () => {
    render(<SplashScreen onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /skip initialization/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('has role="status" on the root container', () => {
    render(<SplashScreen onComplete={onComplete} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has a progressbar with aria attributes', () => {
    render(<SplashScreen onComplete={onComplete} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-label');
  });

  it('renders the STADIUM INTELLIGENCE PLATFORM subtitle', () => {
    render(<SplashScreen onComplete={onComplete} />);
    expect(screen.getByText(/STADIUM INTELLIGENCE PLATFORM/i)).toBeInTheDocument();
  });

  it('calls onComplete after all loading steps complete', async () => {
    render(<SplashScreen onComplete={onComplete} />);
    // Advance through all step durations (600+500+500+400 = 2000ms) plus buffer
    await act(async () => { vi.advanceTimersByTime(4000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows a progress step label during loading', () => {
    render(<SplashScreen onComplete={onComplete} />);
    // First step text should be visible initially
    expect(screen.getByText(/CALIBRATING NEXUS INTEL CORE/i)).toBeInTheDocument();
  });

  it('the skip button has a descriptive aria-label', () => {
    render(<SplashScreen onComplete={onComplete} />);
    const btn = screen.getByRole('button', { name: /skip initialization/i });
    expect(btn).toHaveAttribute('aria-label');
  });
});
