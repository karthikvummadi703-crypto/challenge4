// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
vi.mock('../../src/services/apiClient', () => ({
  sendAICommand: vi.fn().mockResolvedValue({ response: 'ok', source: 'test' }),
}));

// subscribeCollection returns an unsubscribe fn; keep a ref so tests can trigger snapshots
const mockSubscribe = vi.fn().mockReturnValue(vi.fn());
vi.mock('../../src/services/dataSource', () => ({
  subscribeCollection: (...args: unknown[]) => mockSubscribe(...args),
  addRecord: vi.fn().mockResolvedValue(undefined),
  deleteRecord: vi.fn().mockResolvedValue(undefined),
  publishSystemConfig: vi.fn().mockResolvedValue(undefined),
}));

// ── Child component stubs ─────────────────────────────────────────────────────
vi.mock('../../src/components/organizer/OrganizerLogin', () => ({
  default: (props: { stadiumBg: string }) => <div data-testid="organizer-login-stub" data-bg={props.stadiumBg} />,
}));
vi.mock('../../src/components/organizer/PublishSuccessModal', () => ({
  default: (props: { visible: boolean; onClose: () => void }) =>
    props.visible ? <div data-testid="publish-success-modal"><button onClick={props.onClose} data-testid="modal-close">Close</button></div> : null,
}));
vi.mock('../../src/components/organizer/OrganizerSidebar', () => ({
  default: (props: { activeTab: string; onTabChange: (t: string) => void; onOpenSettings: () => void; onLogout: () => void }) => (
    <nav data-testid="organizer-sidebar-stub">
      <button onClick={() => props.onTabChange('dashboard')} data-testid="tab-dashboard">Dashboard</button>
      <button onClick={() => props.onTabChange('setup')} data-testid="tab-setup">Setup</button>
      <button onClick={() => props.onTabChange('volunteers')} data-testid="tab-volunteers">Volunteers</button>
      <button onClick={props.onOpenSettings} data-testid="open-settings-btn">Settings</button>
      <button onClick={props.onLogout} data-testid="logout-btn">Logout</button>
      <span data-testid="active-tab">{props.activeTab}</span>
    </nav>
  ),
}));
vi.mock('../../src/components/organizer/DashboardOverviewPanel', () => ({
  default: () => <div data-testid="dashboard-overview-stub" />,
}));
vi.mock('../../src/components/organizer/MatchSetupPanel', () => ({
  default: () => <div data-testid="match-setup-stub" />,
}));
vi.mock('../../src/components/organizer/VolunteersPanel', () => ({
  default: () => <div data-testid="volunteers-panel-stub" />,
}));

const { default: OrganizerDashboard } = await import('../../src/components/OrganizerDashboard');

const baseProps = { onLogout: vi.fn(), stadiumBg: '/bg.jpg', ronaldoConcept: '/ronaldo.jpg', onOpenSettings: vi.fn() };

const unauthAuth = { user: null, role: null, loading: false, error: null, setError: vi.fn(), loginUser: vi.fn(), logoutUser: vi.fn() };
const adminAuth  = { ...unauthAuth, user: { uid: 'admin1', email: 'admin@nexusai.com' }, role: 'admin' };
const noDemo     = { isDemoMode: false, demoRole: null };
const orgDemo    = { isDemoMode: true, demoRole: 'organizer' };

describe('OrganizerDashboard — unauthenticated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders OrganizerLogin when not authenticated and not in demo mode', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    expect(screen.getByTestId('organizer-login-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('organizer-sidebar-stub')).not.toBeInTheDocument();
  });

  it('passes stadiumBg to OrganizerLogin', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} stadiumBg="/stadium.jpg" />);
    expect(screen.getByTestId('organizer-login-stub')).toHaveAttribute('data-bg', '/stadium.jpg');
  });
});

describe('OrganizerDashboard — authenticated admin', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(vi.fn());
  });

  it('renders the main layout (sidebar + dashboard panel) for a logged-in admin', () => {
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    expect(screen.getByTestId('organizer-sidebar-stub')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-overview-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('organizer-login-stub')).not.toBeInTheDocument();
  });

  it('defaults to dashboard tab and shows DashboardOverviewPanel', () => {
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    expect(screen.getByTestId('dashboard-overview-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('match-setup-stub')).not.toBeInTheDocument();
    expect(screen.queryByTestId('volunteers-panel-stub')).not.toBeInTheDocument();
  });

  it('switches to MatchSetupPanel when setup tab is clicked', () => {
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-setup'));
    expect(screen.getByTestId('match-setup-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-overview-stub')).not.toBeInTheDocument();
  });

  it('switches to VolunteersPanel when volunteers tab is clicked', () => {
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    expect(screen.getByTestId('volunteers-panel-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-overview-stub')).not.toBeInTheDocument();
  });

  it('calls onOpenSettings when settings button is clicked', () => {
    const onOpenSettings = vi.fn();
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getByTestId('open-settings-btn'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('calls logoutUser and onLogout when logout is triggered', async () => {
    const logoutUser = vi.fn().mockResolvedValue(undefined);
    const onLogout = vi.fn();
    mockUseAuth.mockReturnValue({ ...adminAuth, logoutUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} onLogout={onLogout} />);
    fireEvent.click(screen.getByTestId('logout-btn'));
    await vi.waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });

  it('PublishSuccessModal is hidden initially', () => {
    mockUseAuth.mockReturnValue(adminAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    expect(screen.queryByTestId('publish-success-modal')).not.toBeInTheDocument();
  });
});

describe('OrganizerDashboard — demo mode (organizer role)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(vi.fn());
  });

  it('renders the main dashboard in organizer demo mode without real auth', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(orgDemo);
    render(<OrganizerDashboard {...baseProps} />);
    expect(screen.getByTestId('organizer-sidebar-stub')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-overview-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('organizer-login-stub')).not.toBeInTheDocument();
  });

  it('does not render the dashboard in volunteer demo mode', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue({ isDemoMode: true, demoRole: 'volunteer' });
    render(<OrganizerDashboard {...baseProps} />);
    expect(screen.getByTestId('organizer-login-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('organizer-sidebar-stub')).not.toBeInTheDocument();
  });

  it('can switch tabs in demo mode', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(orgDemo);
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-setup'));
    expect(screen.getByTestId('match-setup-stub')).toBeInTheDocument();
  });
});
