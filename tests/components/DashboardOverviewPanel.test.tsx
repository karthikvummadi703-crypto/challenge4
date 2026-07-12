// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ── Patch scrollIntoView (not available in jsdom) ────────────────────────────
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// ── Mock framer-motion (used transitively by StadiumSeatMap) ─────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
      <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Stub StadiumSeatMap (uses Three.js/WebGL — not available in jsdom) ───────
vi.mock('../../src/components/StadiumSeatMap', () => ({
  default: () => <div data-testid="stadium-seat-map-stub" />,
}));

const { default: DashboardOverviewPanel } = await import('../../src/components/organizer/DashboardOverviewPanel');

const baseStats = {
  activeVolunteers: 3,
  totalOrders: 12,
  openIssues: 2,
  activeEmergencies: 1,
  attendance: 50000,
  recentAlerts: [] as import('../../src/types').StadiumAlert[],
};

const defaultProps = {
  isPublished: true,
  stats: baseStats,
  volunteersList: [],
  messages: [{ id: 'ai-1', sender: 'ai' as const, text: 'Welcome to Nexus AI.' }],
  onSendCommand: vi.fn(),
  onMessagesChange: vi.fn(),
  ronaldoConcept: '/fake-ronaldo.jpg',
};

describe('DashboardOverviewPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the Stadium Command Intelligence heading', () => {
    render(<DashboardOverviewPanel {...defaultProps} />);
    expect(screen.getByText(/stadium command intelligence/i)).toBeInTheDocument();
  });

  it('shows LIVE ON AIR status when isPublished is true', () => {
    render(<DashboardOverviewPanel {...defaultProps} isPublished={true} />);
    expect(screen.getByText(/live on air/i)).toBeInTheDocument();
  });

  it('shows PENDING SETUP status when isPublished is false', () => {
    render(<DashboardOverviewPanel {...defaultProps} isPublished={false} />);
    expect(screen.getByText(/pending setup/i)).toBeInTheDocument();
  });

  it('renders stat cards with correct values from stats prop', () => {
    render(<DashboardOverviewPanel {...defaultProps} />);
    // totalOrders
    expect(screen.getByText('12')).toBeInTheDocument();
    // openIssues
    expect(screen.getByText('2')).toBeInTheDocument();
    // activeEmergencies
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders existing chat messages', () => {
    render(<DashboardOverviewPanel {...defaultProps} />);
    expect(screen.getByText('Welcome to Nexus AI.')).toBeInTheDocument();
  });

  it('renders the StadiumSeatMap stub', () => {
    render(<DashboardOverviewPanel {...defaultProps} />);
    expect(screen.getByTestId('stadium-seat-map-stub')).toBeInTheDocument();
  });

  it('shows "All clear" when recentAlerts is empty', () => {
    render(<DashboardOverviewPanel {...defaultProps} />);
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });

  it('renders alert messages when recentAlerts are provided', () => {
    const alerts: import('../../src/types').StadiumAlert[] = [
      { id: 'a1', type: 'Issue', message: 'Gate B overcrowded', timestamp: new Date().toISOString() },
    ];
    render(<DashboardOverviewPanel {...defaultProps} stats={{ ...baseStats, recentAlerts: alerts }} />);
    expect(screen.getByText('Gate B overcrowded')).toBeInTheDocument();
  });

  it('renders AI chip quick-queries', () => {
    render(<DashboardOverviewPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /summarize today's incidents/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show available volunteers/i })).toBeInTheDocument();
  });

  it('calls onMessagesChange and onSendCommand when a message is submitted', async () => {
    const onSendCommand = vi.fn().mockResolvedValue({ id: 'ai-2', sender: 'ai', text: 'AI reply' });
    const onMessagesChange = vi.fn();
    render(
      <DashboardOverviewPanel
        {...defaultProps}
        onSendCommand={onSendCommand}
        onMessagesChange={onMessagesChange}
      />
    );
    const input = screen.getByLabelText(/ask command assistant/i);
    fireEvent.change(input, { target: { value: 'How many orders?' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });
    expect(onMessagesChange).toHaveBeenCalled();
    expect(onSendCommand).toHaveBeenCalledWith('How many orders?');
  });

  it('calls onMessagesChange when a quick-chip is clicked', async () => {
    const onSendCommand = vi.fn().mockResolvedValue({ id: 'ai-3', sender: 'ai', text: 'Response' });
    const onMessagesChange = vi.fn();
    render(
      <DashboardOverviewPanel
        {...defaultProps}
        onSendCommand={onSendCommand}
        onMessagesChange={onMessagesChange}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /show available volunteers/i }));
    });
    expect(onMessagesChange).toHaveBeenCalled();
    expect(onSendCommand).toHaveBeenCalledWith('Show available volunteers');
  });

  it('uses active volunteer count from volunteersList when available', () => {
    const vols: import('../../src/types').Volunteer[] = [
      { id: 'v1', name: 'Alice', volunteerId: 'VOL-0001', status: 'active' },
      { id: 'v2', name: 'Bob',   volunteerId: 'VOL-0002', status: 'inactive' },
    ];
    // activeEmergencies set to 0 to avoid ambiguity with volunteer count of 1
    render(
      <DashboardOverviewPanel
        {...defaultProps}
        volunteersList={vols}
        stats={{ ...baseStats, activeVolunteers: 99, activeEmergencies: 0 }}
      />
    );
    // Volunteer card: 1 active from list; not 99 from stats.activeVolunteers
    const volunteerCard = screen.getByText('Volunteers').closest('div')!;
    expect(volunteerCard.querySelector('.text-xl')).toHaveTextContent('1');
  });
});
