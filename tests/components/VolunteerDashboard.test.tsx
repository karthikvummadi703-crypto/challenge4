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

// ── Firebase stubs ────────────────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
}));
vi.mock('../../src/firebase', () => ({ db: {} }));

// ── Services ──────────────────────────────────────────────────────────────────
vi.mock('../../src/services/authService', () => ({
  getFriendlyErrorMessage: vi.fn((e: unknown) => String(e)),
}));

const mockSubscribe = vi.fn().mockReturnValue(vi.fn());
vi.mock('../../src/services/dataSource', () => ({
  subscribeCollection: (...args: unknown[]) => mockSubscribe(...args),
  updateRecord: vi.fn().mockResolvedValue(undefined),
}));

// ── Auth & demo contexts ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('../../src/context/authContext', () => ({ useAuth: () => mockUseAuth() }));

const mockUseDemoMode = vi.fn();
vi.mock('../../src/context/demoModeContext', () => ({ useDemoMode: () => mockUseDemoMode() }));

// ── Child component stubs ─────────────────────────────────────────────────────
vi.mock('../../src/components/volunteer/VolunteerLogin', () => ({
  default: (props: { loginError: string; isLoggingIn: boolean; onSubmit: () => void }) => (
    <div data-testid="volunteer-login-stub">
      <span data-testid="login-error">{props.loginError}</span>
      <button onClick={props.onSubmit} data-testid="login-submit" disabled={props.isLoggingIn}>Login</button>
    </div>
  ),
}));
vi.mock('../../src/components/volunteer/VolunteerHeader', () => ({
  default: (props: { volunteerName: string; volunteerId: string; onLogout: () => void }) => (
    <header data-testid="volunteer-header-stub">
      <span data-testid="volunteer-name">{props.volunteerName}</span>
      <span data-testid="volunteer-id">{props.volunteerId}</span>
      <button onClick={props.onLogout} data-testid="logout-btn">Logout</button>
    </header>
  ),
}));
vi.mock('../../src/components/volunteer/VolunteerTaskStack', () => ({
  default: (props: { myAssignedTasks: unknown[]; otherTasks: unknown[] }) => (
    <div data-testid="volunteer-task-stack" data-mine={props.myAssignedTasks.length} data-other={props.otherTasks.length} />
  ),
}));
vi.mock('../../src/components/volunteer/VolunteerMapPanel', () => ({
  default: (props: { highlightedSeat?: string }) => (
    <div data-testid="volunteer-map-panel" data-seat={props.highlightedSeat ?? ''} />
  ),
}));
vi.mock('../../src/components/volunteer/VolunteerAIChat', () => ({
  default: () => <div data-testid="volunteer-ai-chat-stub" />,
}));

const { default: VolunteerDashboard } = await import('../../src/components/VolunteerDashboard');

const baseProps = { onLogout: vi.fn() };

const unauthAuth = {
  user: null, profile: null, role: null, loading: false, error: null,
  setError: vi.fn(), loginUser: vi.fn(), logoutUser: vi.fn(),
};
const volAuth = {
  ...unauthAuth,
  user: { uid: 'vol1', email: 'vol@nexus.com' },
  profile: { fullName: 'Alex Volunteer', volunteerId: 'VOL-ALEX' },
  role: 'volunteer',
};
const noDemo  = { isDemoMode: false, demoRole: null, demoProfile: null };
const volDemo = {
  isDemoMode: true, demoRole: 'volunteer',
  demoProfile: { uid: 'demo-vol-1', fullName: 'Demo Volunteer', email: 'demo@vol.com', volunteerId: 'VOL-DEMO1', assignedGate: 'Gate B' },
};

describe('VolunteerDashboard — unauthenticated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders VolunteerLogin when not authenticated and not in demo mode', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-login-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-header-stub')).not.toBeInTheDocument();
  });

  it('shows no login error initially', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('login-error')).toHaveTextContent('');
  });
});

describe('VolunteerDashboard — authenticated real volunteer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(vi.fn());
  });

  it('renders the dashboard layout (header + task stack + map) for a logged-in volunteer', () => {
    mockUseAuth.mockReturnValue(volAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-header-stub')).toBeInTheDocument();
    expect(screen.getByTestId('volunteer-task-stack')).toBeInTheDocument();
    expect(screen.getByTestId('volunteer-map-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-login-stub')).not.toBeInTheDocument();
  });

  it('passes volunteer name and id from profile to VolunteerHeader', () => {
    mockUseAuth.mockReturnValue(volAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-name')).toHaveTextContent('Alex Volunteer');
  });

  it('renders VolunteerAIChat in the dashboard', () => {
    mockUseAuth.mockReturnValue(volAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-ai-chat-stub')).toBeInTheDocument();
  });

  it('calls logoutUser and onLogout when logout is triggered', async () => {
    const logoutUser = vi.fn().mockResolvedValue(undefined);
    const onLogout = vi.fn();
    mockUseAuth.mockReturnValue({ ...volAuth, logoutUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<VolunteerDashboard onLogout={onLogout} />);
    fireEvent.click(screen.getByTestId('logout-btn'));
    await vi.waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });

  it('passes empty task lists (no Firestore data yet) to VolunteerTaskStack', () => {
    mockUseAuth.mockReturnValue(volAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-task-stack')).toHaveAttribute('data-mine', '0');
    expect(screen.getByTestId('volunteer-task-stack')).toHaveAttribute('data-other', '0');
  });
});

describe('VolunteerDashboard — demo mode (volunteer role)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(vi.fn());
  });

  it('renders the dashboard in volunteer demo mode without real auth', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(volDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-header-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-login-stub')).not.toBeInTheDocument();
  });

  it('passes demo profile name to VolunteerHeader', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(volDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-name')).toHaveTextContent('Demo Volunteer');
  });

  it('does not render the dashboard in organizer demo mode', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue({ isDemoMode: true, demoRole: 'organizer', demoProfile: null });
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-login-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-header-stub')).not.toBeInTheDocument();
  });

  it('renders VolunteerAIChat in demo mode', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(volDemo);
    render(<VolunteerDashboard {...baseProps} />);
    expect(screen.getByTestId('volunteer-ai-chat-stub')).toBeInTheDocument();
  });
});
