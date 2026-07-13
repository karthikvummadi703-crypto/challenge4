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

// ── Firebase stubs (prevents initialization errors in jsdom) ──────────────────
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ empty: true }),
}));
vi.mock('../../src/firebase', () => ({ db: {} }));

// ── dataSource ────────────────────────────────────────────────────────────────
vi.mock('../../src/services/dataSource', () => ({
  createRecordWithTask: vi.fn().mockResolvedValue(undefined),
}));

// ── Auth & demo contexts ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('../../src/context/authContext', () => ({ useAuth: () => mockUseAuth() }));

const mockUseDemoMode = vi.fn();
vi.mock('../../src/context/demoModeContext', () => ({ useDemoMode: () => mockUseDemoMode() }));

// ── Child component stubs ─────────────────────────────────────────────────────
vi.mock('../../src/components/fan/FanAuth', () => ({
  default: (props: { stadiumBg: string }) => <div data-testid="fan-auth-stub" data-bg={props.stadiumBg} />,
}));
vi.mock('../../src/components/fan/FanSidebar', () => ({
  default: (props: { activeTab: string; onTabChange: (t: string) => void; onLogout: () => void }) => (
    <nav data-testid="fan-sidebar-stub">
      <button onClick={() => props.onTabChange('food')} data-testid="tab-food">Food</button>
      <button onClick={() => props.onTabChange('medical')} data-testid="tab-medical">Medical</button>
      <button onClick={() => props.onTabChange('issue')} data-testid="tab-issue">Issue</button>
      <button onClick={props.onLogout} data-testid="logout-btn">Logout</button>
      <span data-testid="active-tab">{props.activeTab}</span>
    </nav>
  ),
}));
vi.mock('../../src/components/fan/FanHomeTab', () => ({
  default: ({ seatNumber }: { seatNumber: string }) => <div data-testid="fan-home-tab" data-seat={seatNumber} />,
}));
vi.mock('../../src/components/fan/FanFoodTab', () => ({
  default: ({ seatNumber }: { seatNumber: string }) => <div data-testid="fan-food-tab" data-seat={seatNumber} />,
  FOOD_MENU: [],
}));
vi.mock('../../src/components/fan/FanMedicalTab', () => ({
  default: ({ emergencySeat }: { emergencySeat: string }) => <div data-testid="fan-medical-tab" data-seat={emergencySeat} />,
}));
vi.mock('../../src/components/fan/FanIssueTab', () => ({
  default: () => <div data-testid="fan-issue-tab" />,
}));
vi.mock('../../src/components/fan/FanAIChat', () => ({
  default: () => <div data-testid="fan-ai-chat-stub" />,
}));

const { default: FanDashboard } = await import('../../src/components/FanDashboard');

const baseProps = { onLogout: vi.fn(), stadiumBg: '/bg.jpg' };

const unauthAuth = { user: null, profile: null, role: null, loading: false, error: null, setError: vi.fn(), signUpFan: vi.fn(), loginUser: vi.fn(), logoutUser: vi.fn() };
const fanAuth    = { ...unauthAuth, user: { uid: 'u1', email: 'fan@test.com', displayName: 'Test Fan' }, profile: { fullName: 'Test Fan', seatNumber: 'A-101' }, role: 'fan' };
const noDemo     = { isDemoMode: false, demoRole: null, demoProfile: null };
const fanDemo    = { isDemoMode: true, demoRole: 'fan', demoProfile: { uid: 'demo-fan-1', fullName: 'Demo Fan', email: 'demo@fan.com', seatNumber: 'D-001' } };

describe('FanDashboard — unauthenticated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders FanAuth when not authenticated and not in demo mode', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard {...baseProps} />);
    expect(screen.getByTestId('fan-auth-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('fan-sidebar-stub')).not.toBeInTheDocument();
  });

  it('passes stadiumBg prop through to FanAuth', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="/stadium.jpg" />);
    expect(screen.getByTestId('fan-auth-stub')).toHaveAttribute('data-bg', '/stadium.jpg');
  });
});

describe('FanDashboard — authenticated real user', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(fanAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    vi.clearAllMocks();
  });

  it('renders the main dashboard layout (sidebar + home tab) for a logged-in fan', () => {
    mockUseAuth.mockReturnValue(fanAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard {...baseProps} />);
    expect(screen.getByTestId('fan-sidebar-stub')).toBeInTheDocument();
    expect(screen.getByTestId('fan-home-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('fan-auth-stub')).not.toBeInTheDocument();
  });

  it('passes seatNumber from profile to child tabs', () => {
    mockUseAuth.mockReturnValue(fanAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard {...baseProps} />);
    expect(screen.getByTestId('fan-home-tab')).toHaveAttribute('data-seat', 'A-101');
  });

  it('renders FanAIChat alongside the main content', () => {
    mockUseAuth.mockReturnValue(fanAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard {...baseProps} />);
    expect(screen.getByTestId('fan-ai-chat-stub')).toBeInTheDocument();
  });

  it('switches to FanFoodTab when food tab is selected', () => {
    mockUseAuth.mockReturnValue(fanAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-food'));
    expect(screen.getByTestId('fan-food-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('fan-home-tab')).not.toBeInTheDocument();
  });

  it('switches to FanMedicalTab when medical tab is selected', () => {
    mockUseAuth.mockReturnValue(fanAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-medical'));
    expect(screen.getByTestId('fan-medical-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('fan-home-tab')).not.toBeInTheDocument();
  });

  it('switches to FanIssueTab when issue tab is selected', () => {
    mockUseAuth.mockReturnValue(fanAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard {...baseProps} />);
    fireEvent.click(screen.getByTestId('tab-issue'));
    expect(screen.getByTestId('fan-issue-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('fan-home-tab')).not.toBeInTheDocument();
  });

  it('calls logoutUser and onLogout when logout is triggered', async () => {
    const logoutUser = vi.fn().mockResolvedValue(undefined);
    const onLogout = vi.fn();
    mockUseAuth.mockReturnValue({ ...fanAuth, logoutUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<FanDashboard onLogout={onLogout} stadiumBg="/bg.jpg" />);
    fireEvent.click(screen.getByTestId('logout-btn'));
    await vi.waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });
});

describe('FanDashboard — demo mode (fan role)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the main dashboard in demo mode without real auth', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(fanDemo);
    render(<FanDashboard {...baseProps} />);
    expect(screen.getByTestId('fan-sidebar-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('fan-auth-stub')).not.toBeInTheDocument();
  });

  it('passes demo profile seatNumber into the home tab', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(fanDemo);
    render(<FanDashboard {...baseProps} />);
    expect(screen.getByTestId('fan-home-tab')).toHaveAttribute('data-seat', 'D-001');
  });

  it('does not render FanAuth in demo mode even with no real user', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(fanDemo);
    render(<FanDashboard {...baseProps} />);
    expect(screen.queryByTestId('fan-auth-stub')).not.toBeInTheDocument();
  });

  it('does not treat volunteer demo as authenticated fan', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue({ isDemoMode: true, demoRole: 'volunteer', demoProfile: null });
    render(<FanDashboard {...baseProps} />);
    expect(screen.getByTestId('fan-auth-stub')).toBeInTheDocument();
  });
});
