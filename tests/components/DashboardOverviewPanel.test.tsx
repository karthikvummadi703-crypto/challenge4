// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

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

  it('renders the StadiumSeatMap stub (lazy-loaded via Suspense)', async () => {
    render(<DashboardOverviewPanel {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('stadium-seat-map-stub')).toBeInTheDocument());
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

// ── sendMessage — guard and form submission (lines 53, 155-183) ───────────────

describe('DashboardOverviewPanel — sendMessage interactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onSendCommand when the form is submitted with text', async () => {
    const onSendCommand = vi.fn().mockResolvedValue({
      id: 'ai-reply',
      sender: 'ai' as const,
      text: 'Nexus telemetry nominal.',
    });
    const onMessagesChange = vi.fn();
    render(
      <DashboardOverviewPanel
        {...defaultProps}
        onSendCommand={onSendCommand}
        onMessagesChange={onMessagesChange}
      />
    );

    const input = screen.getByPlaceholderText('Ask command assistant anything...');
    fireEvent.change(input, { target: { value: 'status update' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    expect(onSendCommand).toHaveBeenCalledWith('status update');
  });

  it('does not call onSendCommand when input is empty (guard line 53)', async () => {
    const onSendCommand = vi.fn();
    render(
      <DashboardOverviewPanel {...defaultProps} onSendCommand={onSendCommand} />
    );

    // Submit with no text (empty input — the guard `!text.trim()` returns early)
    await act(async () => {
      fireEvent.submit(
        screen.getByPlaceholderText('Ask command assistant anything...').closest('form')!
      );
    });

    expect(onSendCommand).not.toHaveBeenCalled();
  });

  it('calls onSendCommand when an AI chip button is clicked', async () => {
    const onSendCommand = vi.fn().mockResolvedValue({
      id: 'ai-chip-reply',
      sender: 'ai' as const,
      text: 'Summary: 0 open issues.',
    });
    render(
      <DashboardOverviewPanel {...defaultProps} onSendCommand={onSendCommand} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /summarize today's incidents/i }));
    });

    expect(onSendCommand).toHaveBeenCalledWith("Summarize today's incidents");
  });

  it('calls onMessagesChange with the AI reply message after onSendCommand resolves', async () => {
    const aiMsg = { id: 'ai-2', sender: 'ai' as const, text: 'Gate A is clear.' };
    const onSendCommand = vi.fn().mockResolvedValue(aiMsg);
    const onMessagesChange = vi.fn();
    render(
      <DashboardOverviewPanel
        {...defaultProps}
        onSendCommand={onSendCommand}
        onMessagesChange={onMessagesChange}
      />
    );

    const input = screen.getByPlaceholderText('Ask command assistant anything...');
    fireEvent.change(input, { target: { value: 'gate status' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    // onMessagesChange is called once for the user message, once for the AI reply
    expect(onMessagesChange).toHaveBeenCalledTimes(2);
    const secondCall = onMessagesChange.mock.calls[1][0] as (prev: unknown[]) => unknown[];
    expect(secondCall([])).toContain(aiMsg);
  });

  it('calls onSendCommand with the correct text and passes the result to onMessagesChange', async () => {
    // This test verifies the happy-path flow end-to-end within sendMessage,
    // complementing the empty-guard and chip-click tests above.
    const aiMsg = { id: 'end-to-end', sender: 'ai' as const, text: 'Stadium clear.' };
    const onSendCommand = vi.fn().mockResolvedValueOnce(aiMsg);
    const onMessagesChange = vi.fn();
    render(
      <DashboardOverviewPanel
        {...defaultProps}
        onSendCommand={onSendCommand}
        onMessagesChange={onMessagesChange}
      />
    );

    const input = screen.getByPlaceholderText('Ask command assistant anything...');
    fireEvent.change(input, { target: { value: 'end-to-end check' } });
    await act(async () => { fireEvent.submit(input.closest('form')!); });

    expect(onSendCommand).toHaveBeenCalledWith('end-to-end check');
    // onMessagesChange should have been called twice:
    // once for the user message, once with the AI reply
    expect(onMessagesChange).toHaveBeenCalledTimes(2);
    const aiAppend = onMessagesChange.mock.calls[1][0] as (p: unknown[]) => unknown[];
    expect(aiAppend([])).toContain(aiMsg);
  });
});
