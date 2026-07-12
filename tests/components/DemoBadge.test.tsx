// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ── Mock framer-motion so animation does not interfere with DOM queries ───────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
}));

// ── Mock demoModeContext ──────────────────────────────────────────────────────
const mockResetDemoData = vi.fn();
let mockIsDemoMode = true;

vi.mock('../../src/context/demoModeContext', () => ({
  useDemoMode: () => ({
    isDemoMode: mockIsDemoMode,
    resetDemoData: mockResetDemoData,
  }),
}));

const { default: DemoBadge } = await import('../../src/components/DemoBadge');

describe('DemoBadge', () => {
  const mockOnExit = vi.fn();

  beforeEach(() => {
    mockIsDemoMode = true;
    vi.clearAllMocks();
  });

  it('renders the demo banner when isDemoMode is true', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    // Use the unique banner description text to avoid matching the button label
    expect(screen.getByText(/sample data only, nothing here is saved/i)).toBeInTheDocument();
  });

  it('renders nothing when isDemoMode is false', () => {
    mockIsDemoMode = false;
    const { container } = render(<DemoBadge onExit={mockOnExit} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a "Reset Demo Data" button', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    expect(screen.getByRole('button', { name: /reset demo data/i })).toBeInTheDocument();
  });

  it('renders an "Exit Demo Mode" button', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    expect(screen.getByRole('button', { name: /exit demo mode/i })).toBeInTheDocument();
  });

  it('calls resetDemoData when Reset button is clicked', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    fireEvent.click(screen.getByRole('button', { name: /reset demo data/i }));
    expect(mockResetDemoData).toHaveBeenCalledTimes(1);
  });

  it('calls onExit when Exit button is clicked', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    fireEvent.click(screen.getByRole('button', { name: /exit demo mode/i }));
    expect(mockOnExit).toHaveBeenCalledTimes(1);
  });

  it('briefly shows "Reset!" label after clicking reset', async () => {
    vi.useFakeTimers();
    render(<DemoBadge onExit={mockOnExit} />);
    fireEvent.click(screen.getByRole('button', { name: /reset demo data/i }));
    expect(screen.getByText(/reset!/i)).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(1600); });
    expect(screen.getByText(/reset demo data/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('has an aria-label on the reset button', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    const btn = screen.getByRole('button', { name: /reset demo data/i });
    expect(btn).toHaveAttribute('aria-label');
  });

  it('has an aria-label on the exit button', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    const btn = screen.getByRole('button', { name: /exit demo mode/i });
    expect(btn).toHaveAttribute('aria-label');
  });

  it('shows a "sample data only" message in the banner', () => {
    render(<DemoBadge onExit={mockOnExit} />);
    expect(screen.getByText(/sample data/i)).toBeInTheDocument();
  });
});
