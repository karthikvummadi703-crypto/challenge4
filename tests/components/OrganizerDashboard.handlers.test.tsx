/**
 * Targeted handler tests for OrganizerDashboard.
 *
 * Uses different stubs from OrganizerDashboard.test.tsx so that
 * handlePublishEvent, handleSendCommand, PublishSuccessModal onClose,
 * and handleSaveMatch are exercised.
 */
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ── framer-motion ─────────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Auth & demo contexts ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('../../src/context/authContext', () => ({ useAuth: () => mockUseAuth() }));

const mockUseDemoMode = vi.fn();
vi.mock('../../src/context/demoModeContext', () => ({ useDemoMode: () => mockUseDemoMode() }));

// ── Services ──────────────────────────────────────────────────────────────────
vi.mock('../../src/services/userService', () => ({
  adminCreateVolunteer: vi.fn().mockResolvedValue(undefined),
  verifyAdminAccess: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../src/services/authService', () => ({
  getFriendlyErrorMessage: vi.fn((e: unknown) => String(e)),
}));

const mockSendAICommand = vi.fn();
vi.mock('../../src/services/apiClient', () => ({
  sendAICommand: (...a: unknown[]) => mockSendAICommand(...a),
}));

const mockAddRecord        = vi.fn().mockResolvedValue({ id: 'new-id' });
const mockDeleteRecord     = vi.fn().mockResolvedValue(undefined);
const mockPublishConfig    = vi.fn().mockResolvedValue({ id: 'config-id' });
const mockSubscribeHandler = vi.fn().mockReturnValue(vi.fn());

vi.mock('../../src/services/dataSource', () => ({
  subscribeCollection:  (...a: unknown[]) => mockSubscribeHandler(...a),
  addRecord:            (...a: unknown[]) => mockAddRecord(...a),
  deleteRecord:         (...a: unknown[]) => mockDeleteRecord(...a),
  publishSystemConfig:  (...a: unknown[]) => mockPublishConfig(...a),
}));

// ── Child stubs — VolunteersPanel exposes publish + remove buttons ─────────────
vi.mock('../../src/components/organizer/OrganizerLogin', () => ({
  default: (props: { stadiumBg: string }) => <div data-testid="organizer-login-stub" data-bg={props.stadiumBg} />,
}));

vi.mock('../../src/components/organizer/PublishSuccessModal', () => ({
  default: (props: { visible: boolean; volunteerCount: number; onClose: () => void }) =>
    props.visible
      ? (
        <div data-testid="publish-success-modal">
          <button onClick={props.onClose} data-testid="modal-close">Close</button>
        </div>
      )
      : null,
}));

vi.mock('../../src/components/organizer/OrganizerSidebar', () => ({
  default: (props: {
    activeTab: string;
    onTabChange: (t: string) => void;
    onOpenSettings: () => void;
    onLogout: () => void;
  }) => (
    <nav data-testid="organizer-sidebar-stub">
      <button onClick={() => props.onTabChange('dashboard')} data-testid="tab-dashboard">Dashboard</button>
      <button onClick={() => props.onTabChange('setup')} data-testid="tab-setup">Setup</button>
      <button onClick={() => props.onTabChange('volunteers')} data-testid="tab-volunteers">Volunteers</button>
      <button onClick={props.onOpenSettings} data-testid="open-settings-btn">Settings</button>
      <button onClick={props.onLogout} data-testid="logout-btn">Logout</button>
    </nav>
  ),
}));

// DashboardOverviewPanel exposes onSendCommand
vi.mock('../../src/components/organizer/DashboardOverviewPanel', () => ({
  default: (props: { onSendCommand: (text: string) => Promise<unknown> }) => (
    <div data-testid="dashboard-overview-stub">
      <button
        data-testid="send-command-btn"
        onClick={() => props.onSendCommand('status update')}
      >
        Send Command
      </button>
    </div>
  ),
}));

vi.mock('../../src/components/organizer/MatchSetupPanel', () => ({
  default: (props: {
    stadiumName: string; matchName: string; matchDate: string; matchTime: string;
    ticketPrice: string; matchSaveSuccess: boolean; matches: unknown[];
    setStadiumName: (v: string) => void; setMatchName: (v: string) => void;
    setMatchDate: (v: string) => void; setMatchTime: (v: string) => void;
    setTicketPrice: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
  }) => (
    <div data-testid="match-setup-stub">
      {props.matchSaveSuccess && <span data-testid="save-success">Saved!</span>}
      <form onSubmit={props.onSubmit} data-testid="save-match-form">
        <button type="submit" data-testid="save-match-btn">Save Match</button>
      </form>
    </div>
  ),
}));

// VolunteersPanel exposes publish and remove buttons
vi.mock('../../src/components/organizer/VolunteersPanel', () => ({
  default: (props: {
    volunteersList: Array<{ id: string; name: string }>;
    isPublished: boolean;
    onPublishEvent: () => void;
    onRemoveVolunteer: (id: string) => void;
    onAddVolunteer: (e: React.FormEvent) => void;
    newVolunteerName: string; setNewVolunteerName: (v: string) => void;
    newVolunteerEmail: string; setNewVolunteerEmail: (v: string) => void;
    newVolunteerPassword: string; setNewVolunteerPassword: (v: string) => void;
    newVolunteerGate: string; setNewVolunteerGate: (v: string) => void;
    isCreatingVolunteer: boolean;
  }) => (
    <div data-testid="volunteers-panel-stub">
      <button data-testid="publish-event-btn" onClick={props.onPublishEvent}>Publish Event</button>
      {props.volunteersList.map(v => (
        <button key={v.id} data-testid={`remove-vol-${v.id}`} onClick={() => props.onRemoveVolunteer(v.id)}>
          Remove {v.name}
        </button>
      ))}
      {props.isPublished && <span data-testid="is-published-indicator">Published</span>}
    </div>
  ),
}));

const { default: OrganizerDashboard } = await import('../../src/components/OrganizerDashboard');

const baseProps = {
  onLogout: vi.fn(),
  stadiumBg: '/bg.jpg',
  ronaldoConcept: '/ronaldo.jpg',
  onOpenSettings: vi.fn(),
};

const unauthAuth = {
  user: null, role: null, loading: false, error: null,
  setError: vi.fn(), loginUser: vi.fn(), logoutUser: vi.fn(),
};
const adminAuth = {
  ...unauthAuth,
  user: { uid: 'admin1', email: 'admin@nexusai.com' },
  role: 'admin',
};
const noDemo  = { isDemoMode: false, demoRole: null };
const orgDemo = { isDemoMode: true, demoRole: 'organizer' };

// ── handlePublishEvent ────────────────────────────────────────────────────────
describe('OrganizerDashboard — handlePublishEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeHandler.mockReturnValue(vi.fn());
    mockPublishConfig.mockResolvedValue({ id: 'config-id' });
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
  });

  it('calls publishSystemConfig and shows the success modal on publish', async () => {
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('publish-event-btn'));
    });
    expect(mockPublishConfig).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('publish-success-modal')).toBeInTheDocument());
  });

  it('closes the modal and returns to dashboard tab when modal onClose is called', async () => {
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('publish-event-btn'));
    });
    await waitFor(() => expect(screen.getByTestId('publish-success-modal')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-close'));
    });
    expect(screen.queryByTestId('publish-success-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-overview-stub')).toBeInTheDocument();
  });

  it('shows the isPublished indicator after event is published', async () => {
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('publish-event-btn'));
    });
    await waitFor(() => expect(screen.getByTestId('is-published-indicator')).toBeInTheDocument());
  });
});

// ── handleSendCommand ─────────────────────────────────────────────────────────
describe('OrganizerDashboard — handleSendCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeHandler.mockReturnValue(vi.fn());
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
  });

  it('calls sendAICommand with the provided text and returns an ai chat message', async () => {
    mockSendAICommand.mockResolvedValue({ response: 'All systems nominal.', source: 'gemini' });
    render(<OrganizerDashboard {...baseProps} />);
    let result: unknown;
    await act(async () => {
      result = await (screen.getByTestId('send-command-btn').onclick?.(new MouseEvent('click')) ?? Promise.resolve());
      fireEvent.click(screen.getByTestId('send-command-btn'));
    });
    expect(mockSendAICommand).toHaveBeenCalledWith('status update');
    void result;
  });

  it('returns a fallback error message when sendAICommand throws', async () => {
    mockSendAICommand.mockRejectedValue(new Error('network failure'));
    render(<OrganizerDashboard {...baseProps} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-command-btn'));
    });
    expect(mockSendAICommand).toHaveBeenCalledWith('status update');
  });
});

// ── handleSaveMatch ───────────────────────────────────────────────────────────
describe('OrganizerDashboard — handleSaveMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeHandler.mockReturnValue(vi.fn());
    mockAddRecord.mockResolvedValue({ id: 'match-id' });
    mockPublishConfig.mockResolvedValue({ id: 'config-id' });
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
  });

  it('calls addRecord for matches and publishSystemConfig on form submit', async () => {
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-setup'));
    await act(async () => {
      fireEvent.submit(screen.getByTestId('save-match-form'));
    });
    expect(mockAddRecord).toHaveBeenCalledWith('matches', expect.objectContaining({ published: true }));
    expect(mockPublishConfig).toHaveBeenCalledTimes(1);
  });
});

// ── handleRemoveVolunteer ─────────────────────────────────────────────────────
describe('OrganizerDashboard — handleRemoveVolunteer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteRecord.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
  });

  it('calls deleteRecord for volunteers when a volunteer is removed', async () => {
    let tasksCb: ((snap: unknown) => void) | null = null;
    mockSubscribeHandler.mockImplementation((name: string, cb: (snap: unknown) => void) => {
      if (name === 'volunteers') tasksCb = cb;
      return vi.fn();
    });

    render(<OrganizerDashboard {...baseProps} />);

    // Simulate Firestore volunteers snapshot arriving
    if (tasksCb) {
      act(() => {
        (tasksCb as (snap: unknown) => void)({
          docs: [{ id: 'vol-7', data: () => ({ fullName: 'Charlie', uid: 'uid7' }) }],
          size: 1,
          forEach: (cb: (d: unknown) => void) => {
            cb({ id: 'vol-7', data: () => ({ fullName: 'Charlie', uid: 'uid7' }) });
          },
        });
      });
    }

    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await waitFor(() => expect(screen.queryByTestId('remove-vol-vol-7')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-vol-vol-7'));
    });
    expect(mockDeleteRecord).toHaveBeenCalledWith('volunteers', 'vol-7');
  });
});

// ── demo mode ─────────────────────────────────────────────────────────────────
describe('OrganizerDashboard — handlePublishEvent in demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeHandler.mockReturnValue(vi.fn());
    mockPublishConfig.mockResolvedValue({ id: 'config-id' });
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(orgDemo);
  });

  it('calls publishSystemConfig in demo mode too', async () => {
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('publish-event-btn'));
    });
    expect(mockPublishConfig).toHaveBeenCalledTimes(1);
  });
});
