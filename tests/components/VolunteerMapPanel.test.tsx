// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mock framer-motion (used by StadiumSeatMap child) ─────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
    g: ({ children, ...props }: React.SVGAttributes<SVGGElement> & { children?: React.ReactNode }) =>
      <g {...props}>{children}</g>,
    path: (props: React.SVGAttributes<SVGPathElement>) => <path {...props} />,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { default: VolunteerMapPanel } = await import('../../src/components/volunteer/VolunteerMapPanel');

const makeTask = (overrides: Partial<import('../../src/types').Task> = {}): import('../../src/types').Task => ({
  id: 'task-1',
  type: 'Deliver Food',
  details: 'Deliver nachos',
  seatNumber: 'A12-24',
  priority: 'Medium',
  status: 'pending',
  assignedTo: undefined,
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('VolunteerMapPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the High-Precision Location heading', () => {
    render(<VolunteerMapPanel highlightedSeat={undefined} activeTasks={[]} />);
    expect(screen.getByText(/high-precision location/i)).toBeInTheDocument();
  });

  it('renders the navigation guide section', () => {
    render(<VolunteerMapPanel highlightedSeat={undefined} activeTasks={[]} />);
    expect(screen.getByText(/operational concours navigation/i)).toBeInTheDocument();
    expect(screen.getByText(/auto-routes through secure emergency service tunnels/i)).toBeInTheDocument();
  });

  it('does not show a "TO:" badge when no seat is highlighted', () => {
    render(<VolunteerMapPanel highlightedSeat={undefined} activeTasks={[]} />);
    expect(screen.queryByText(/^TO:/)).not.toBeInTheDocument();
  });

  it('shows a "TO: <seat>" badge when highlightedSeat is provided', () => {
    render(<VolunteerMapPanel highlightedSeat="B05-10" activeTasks={[]} />);
    expect(screen.getByText('TO: B05-10')).toBeInTheDocument();
  });

  it('renders the stadium seat map container', () => {
    render(<VolunteerMapPanel highlightedSeat={undefined} activeTasks={[]} />);
    expect(document.getElementById('stadium-seat-map-container')).toBeInTheDocument();
  });

  it('passes activeTasks to the seat map (renders without crash with tasks)', () => {
    const tasks = [makeTask({ id: 't1', seatNumber: 'C18-03', status: 'accepted' })];
    render(<VolunteerMapPanel highlightedSeat="C18-03" activeTasks={tasks} />);
    expect(screen.getByText('TO: C18-03')).toBeInTheDocument();
  });
});
