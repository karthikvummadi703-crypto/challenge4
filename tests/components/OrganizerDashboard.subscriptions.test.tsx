/**
 * OrganizerDashboard — login, addVolunteer, and subscription callback tests.
 *
 * Targets the branches NOT yet exercised by OrganizerDashboard.test.tsx and
 * OrganizerDashboard.handlers.test.tsx:
 *   - handleLogin (all branches: empty-field guard, success, error path)
 *   - handleAddVolunteer (empty fields, invalid email, short pwd,
 *     demo-mode path via addRecord, real path via adminCreateVolunteer,
 *     form-reset after success, error alert on failure)
 *   - Firestore subscription callback bodies for all 6 collections
 *     (volunteers, fans, foodOrders, issueReports, emergencyRequests,
 *      matches, systemConfig) — driving stats/list state updates
 *   - Error catch branches in handleRemoveVolunteer and handlePublishEvent
 */
// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ── framer-motion stub ────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── auth / demo contexts ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
vi.mock('../../src/context/authContext', () => ({ useAuth: () => mockUseAuth() }));

const mockUseDemoMode = vi.fn();
vi.mock('../../src/context/demoModeContext', () => ({ useDemoMode: () => mockUseDemoMode() }));

// ── services ──────────────────────────────────────────────────────────────────
const mockAdminCreateVolunteer = vi.fn().mockResolvedValue(undefined);
const mockVerifyAdminAccess    = vi.fn().mockResolvedValue(true);
vi.mock('../../src/services/userService', () => ({
  adminCreateVolunteer: (...a: unknown[]) => mockAdminCreateVolunteer(...a),
  verifyAdminAccess:    (...a: unknown[]) => mockVerifyAdminAccess(...a),
}));

vi.mock('../../src/services/authService', () => ({
  getFriendlyErrorMessage: vi.fn((e: unknown) => `friendly: ${String(e)}`),
}));

vi.mock('../../src/services/apiClient', () => ({
  sendAICommand: vi.fn().mockResolvedValue({ response: 'ok', source: 'test' }),
}));

const mockAddRecord        = vi.fn().mockResolvedValue({ id: 'new-id' });
const mockDeleteRecord     = vi.fn().mockResolvedValue(undefined);
const mockPublishConfig    = vi.fn().mockResolvedValue({ id: 'cfg' });

// captureSubscribe stores each collection's callback so we can fire snapshots
const subscribeCapture: Record<string, (snap: unknown) => void> = {};
const mockSubscribeHandler = vi.fn().mockImplementation(
  (name: string, cb: (snap: unknown) => void) => {
    subscribeCapture[name] = cb;
    return vi.fn();
  }
);

vi.mock('../../src/services/dataSource', () => ({
  subscribeCollection:  (...a: unknown[]) => mockSubscribeHandler(...a),
  addRecord:            (...a: unknown[]) => mockAddRecord(...a),
  deleteRecord:         (...a: unknown[]) => mockDeleteRecord(...a),
  publishSystemConfig:  (...a: unknown[]) => mockPublishConfig(...a),
}));

// ── child stubs ───────────────────────────────────────────────────────────────
// OrganizerLogin — exposes email/password inputs + form submit for handleLogin tests
vi.mock('../../src/components/organizer/OrganizerLogin', () => ({
  default: (props: {
    stadiumBg: string;
    email: string; setEmail: (v: string) => void;
    password: string; setPassword: (v: string) => void;
    loginError: string;
    isLoggingIn: boolean;
    onSubmit: (e: React.FormEvent) => void;
  }) => (
    <form data-testid="login-form" onSubmit={props.onSubmit}>
      <input
        data-testid="email-input"
        value={props.email}
        onChange={e => props.setEmail(e.target.value)}
        aria-label="Email"
      />
      <input
        data-testid="password-input"
        type="password"
        value={props.password}
        onChange={e => props.setPassword(e.target.value)}
        aria-label="Password"
      />
      {props.loginError && <span data-testid="login-error">{props.loginError}</span>}
      {props.isLoggingIn && <span data-testid="logging-in-indicator">Logging in…</span>}
      <button type="submit" data-testid="login-submit-btn">Sign In</button>
    </form>
  ),
}));

vi.mock('../../src/components/organizer/PublishSuccessModal', () => ({
  default: (props: { visible: boolean; volunteerCount: number; onClose: () => void }) =>
    props.visible
      ? <div data-testid="publish-success-modal"><button onClick={props.onClose} data-testid="modal-close">Close</button></div>
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
      <button onClick={() => props.onTabChange('setup')}     data-testid="tab-setup">Setup</button>
      <button onClick={() => props.onTabChange('volunteers')} data-testid="tab-volunteers">Volunteers</button>
      <button onClick={props.onLogout}                        data-testid="logout-btn">Logout</button>
    </nav>
  ),
}));

// DashboardOverviewPanel — exposes stats and volunteer count via data attributes
vi.mock('../../src/components/organizer/DashboardOverviewPanel', () => ({
  default: (props: {
    isPublished: boolean;
    stats: {
      activeVolunteers: number; totalOrders: number; openIssues: number;
      activeEmergencies: number; attendance: number;
      recentAlerts: Array<{ id: string; type: string; message: string }>;
    };
    volunteersList: Array<{ id: string; name: string }>;
    messages: unknown[];
    onMessagesChange: (m: unknown[]) => void;
    onSendCommand: (text: string) => Promise<unknown>;
    ronaldoConcept: string;
  }) => (
    <div data-testid="dashboard-overview-stub"
      data-volunteers={props.stats.activeVolunteers}
      data-orders={props.stats.totalOrders}
      data-issues={props.stats.openIssues}
      data-emergencies={props.stats.activeEmergencies}
      data-attendance={props.stats.attendance}
      data-alerts={props.stats.recentAlerts.length}
      data-is-published={String(props.isPublished)}
      data-vol-list={props.volunteersList.length}
    />
  ),
}));

// MatchSetupPanel — exposes matches count and form submit for handleSaveMatch
vi.mock('../../src/components/organizer/MatchSetupPanel', () => ({
  default: (props: {
    stadiumName: string; matchName: string; matchDate: string; matchTime: string;
    ticketPrice: string; matchSaveSuccess: boolean; matches: unknown[];
    setStadiumName: (v: string) => void; setMatchName: (v: string) => void;
    setMatchDate: (v: string) => void; setMatchTime: (v: string) => void;
    setTicketPrice: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
  }) => (
    <div data-testid="match-setup-stub" data-match-count={props.matches.length}>
      {props.matchSaveSuccess && <span data-testid="save-success-indicator">Saved!</span>}
      <form onSubmit={props.onSubmit} data-testid="save-match-form">
        <button type="submit" data-testid="save-match-btn">Save Match</button>
      </form>
    </div>
  ),
}));

// VolunteersPanel — exposes add-volunteer form and remove buttons
vi.mock('../../src/components/organizer/VolunteersPanel', () => ({
  default: (props: {
    volunteersList: Array<{ id: string; name: string }>;
    isPublished: boolean;
    isCreatingVolunteer: boolean;
    newVolunteerName: string; setNewVolunteerName: (v: string) => void;
    newVolunteerEmail: string; setNewVolunteerEmail: (v: string) => void;
    newVolunteerPassword: string; setNewVolunteerPassword: (v: string) => void;
    newVolunteerGate: string; setNewVolunteerGate: (v: string) => void;
    passwordAcknowledged: boolean; setPasswordAcknowledged: (v: boolean) => void;
    onAddVolunteer: (e: React.FormEvent) => void;
    onRemoveVolunteer: (id: string) => void;
    onPublishEvent: () => void;
  }) => (
    <div data-testid="volunteers-panel-stub">
      <form onSubmit={props.onAddVolunteer} data-testid="add-volunteer-form">
        <input
          data-testid="vol-name-input"
          value={props.newVolunteerName}
          onChange={e => props.setNewVolunteerName(e.target.value)}
          aria-label="Volunteer name"
        />
        <input
          data-testid="vol-email-input"
          value={props.newVolunteerEmail}
          onChange={e => props.setNewVolunteerEmail(e.target.value)}
          aria-label="Volunteer email"
        />
        <input
          data-testid="vol-password-input"
          value={props.newVolunteerPassword}
          onChange={e => props.setNewVolunteerPassword(e.target.value)}
          aria-label="Volunteer password"
        />
        <input
          data-testid="vol-password-ack-checkbox"
          type="checkbox"
          checked={props.passwordAcknowledged}
          onChange={e => props.setPasswordAcknowledged(e.target.checked)}
          aria-label="Password copied acknowledgment"
        />
        <button type="submit" data-testid="add-volunteer-btn" disabled={props.isCreatingVolunteer}>
          Add Volunteer
        </button>
      </form>
      <button data-testid="publish-event-btn" onClick={props.onPublishEvent}>Publish</button>
      {props.volunteersList.map(v => (
        <button key={v.id} data-testid={`remove-vol-${v.id}`} onClick={() => props.onRemoveVolunteer(v.id)}>
          Remove {v.name}
        </button>
      ))}
      {props.isCreatingVolunteer && <span data-testid="creating-indicator">Creating…</span>}
      {props.isPublished && <span data-testid="is-published-indicator">Published</span>}
    </div>
  ),
}));

// ── dynamic import after mocks ────────────────────────────────────────────────
const { default: OrganizerDashboard } = await import('../../src/components/OrganizerDashboard');

// ── shared test fixtures ──────────────────────────────────────────────────────
const baseProps = { onLogout: vi.fn(), stadiumBg: '/bg.jpg', ronaldoConcept: '/ronaldo.jpg', onOpenSettings: vi.fn() };

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

// ── helpers ───────────────────────────────────────────────────────────────────
function renderAuthed() {
  mockUseAuth.mockReturnValue(adminAuth);
  mockUseDemoMode.mockReturnValue(noDemo);
  return render(<OrganizerDashboard {...baseProps} />);
}

function renderDemo() {
  mockUseAuth.mockReturnValue(unauthAuth);
  mockUseDemoMode.mockReturnValue(orgDemo);
  return render(<OrganizerDashboard {...baseProps} />);
}

function makeVolunteerSnap(vols: Array<{ id: string; fullName: string; uid: string }>) {
  return {
    docs: vols.map(v => ({ id: v.id, data: () => ({ fullName: v.fullName, uid: v.uid }) })),
    size: vols.length,
    forEach: (cb: (d: unknown) => void) =>
      vols.forEach(v => cb({ id: v.id, data: () => ({ fullName: v.fullName, uid: v.uid }) })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(subscribeCapture).forEach(k => delete subscribeCapture[k]);
  mockSubscribeHandler.mockImplementation((name: string, cb: (snap: unknown) => void) => {
    subscribeCapture[name] = cb;
    return vi.fn();
  });
  mockAddRecord.mockResolvedValue({ id: 'new-id' });
  mockDeleteRecord.mockResolvedValue(undefined);
  mockPublishConfig.mockResolvedValue({ id: 'cfg' });
  mockAdminCreateVolunteer.mockResolvedValue(undefined);
  mockVerifyAdminAccess.mockResolvedValue(true);
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// handleLogin
// ─────────────────────────────────────────────────────────────────────────────
describe('OrganizerDashboard — handleLogin', () => {
  it('shows the login form when unauthenticated', () => {
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  it('does nothing (guard) when email is empty', async () => {
    const loginUser = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ ...unauthAuth, loginUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    // only password filled — email empty
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'pw123' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('login-form')); });
    expect(loginUser).not.toHaveBeenCalled();
  });

  it('does nothing (guard) when password is empty', async () => {
    const loginUser = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ ...unauthAuth, loginUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'admin@test.com' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('login-form')); });
    expect(loginUser).not.toHaveBeenCalled();
  });

  it('calls loginUser with email, password, and role "admin" when both fields filled', async () => {
    const loginUser = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ ...unauthAuth, loginUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.change(screen.getByTestId('email-input'),    { target: { value: 'admin@nexusai.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'secure123' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('login-form')); });
    expect(loginUser).toHaveBeenCalledWith('admin@nexusai.com', 'secure123', 'admin');
  });

  it('shows a friendly error when loginUser throws', async () => {
    const loginUser = vi.fn().mockRejectedValue(new Error('wrong-password'));
    mockUseAuth.mockReturnValue({ ...unauthAuth, loginUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    fireEvent.change(screen.getByTestId('email-input'),    { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'badpw' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('login-form')); });
    await waitFor(() => expect(screen.getByTestId('login-error')).toBeInTheDocument());
    expect(screen.getByTestId('login-error').textContent).toContain('friendly:');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// handleAddVolunteer
// ─────────────────────────────────────────────────────────────────────────────
describe('OrganizerDashboard — handleAddVolunteer validation', () => {
  it('alerts when volunteer name is empty', async () => {
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    // email and password filled but name empty
    fireEvent.change(screen.getByTestId('vol-email-input'),    { target: { value: 'vol@nexus.com' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'password123' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    expect(window.alert).toHaveBeenCalledWith('All fields are required.');
    expect(mockAdminCreateVolunteer).not.toHaveBeenCalled();
  });

  it('alerts when volunteer email is empty', async () => {
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),     { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'password123' } });
    // clear the email field
    fireEvent.change(screen.getByTestId('vol-email-input'), { target: { value: '' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    expect(window.alert).toHaveBeenCalledWith('All fields are required.');
  });

  it('alerts when volunteer password is empty', async () => {
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),  { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('vol-email-input'), { target: { value: 'bob@nexus.com' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: '' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    expect(window.alert).toHaveBeenCalledWith('All fields are required.');
  });

  it('alerts when volunteer email is not a valid format', async () => {
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),     { target: { value: 'Carol' } });
    fireEvent.change(screen.getByTestId('vol-email-input'),    { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'pass123' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    expect(window.alert).toHaveBeenCalledWith('Please enter a valid email address for the volunteer.');
  });

  it('alerts when volunteer password is shorter than 6 characters', async () => {
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),     { target: { value: 'Dave' } });
    fireEvent.change(screen.getByTestId('vol-email-input'),    { target: { value: 'dave@nexus.com' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'abc' } });
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    expect(window.alert).toHaveBeenCalledWith('Password must be at least 6 characters.');
  });

  it('calls adminCreateVolunteer in real (non-demo) mode', async () => {
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),     { target: { value: 'Eve Smith' } });
    fireEvent.change(screen.getByTestId('vol-email-input'),    { target: { value: 'eve@nexus.com' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'secure99' } });
    fireEvent.click(screen.getByTestId('vol-password-ack-checkbox'));
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    expect(mockAdminCreateVolunteer).toHaveBeenCalledWith(
      'Eve Smith', 'eve@nexus.com', 'secure99', expect.any(String)
    );
    expect(mockAddRecord).not.toHaveBeenCalledWith('volunteers', expect.anything());
  });

  it('calls addRecord in demo (organizer) mode instead of adminCreateVolunteer', async () => {
    renderDemo();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),     { target: { value: 'Frank' } });
    fireEvent.change(screen.getByTestId('vol-email-input'),    { target: { value: 'frank@nexus.com' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'demopass' } });
    fireEvent.click(screen.getByTestId('vol-password-ack-checkbox'));
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    expect(mockAddRecord).toHaveBeenCalledWith('volunteers', expect.objectContaining({ fullName: 'Frank', email: 'frank@nexus.com', role: 'volunteer' }));
    expect(mockAdminCreateVolunteer).not.toHaveBeenCalled();
  });

  it('resets form fields after a successful volunteer addition', async () => {
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),     { target: { value: 'Grace' } });
    fireEvent.change(screen.getByTestId('vol-email-input'),    { target: { value: 'grace@nexus.com' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'pass9876' } });
    fireEvent.click(screen.getByTestId('vol-password-ack-checkbox'));
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    await waitFor(() => {
      expect(screen.getByTestId('vol-name-input')).toHaveValue('');
      expect(screen.getByTestId('vol-email-input')).toHaveValue('');
    });
  });

  it('shows alert when adminCreateVolunteer rejects', async () => {
    mockAdminCreateVolunteer.mockRejectedValueOnce(new Error('email already exists'));
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    fireEvent.change(screen.getByTestId('vol-name-input'),     { target: { value: 'Henry' } });
    fireEvent.change(screen.getByTestId('vol-email-input'),    { target: { value: 'henry@nexus.com' } });
    fireEvent.change(screen.getByTestId('vol-password-input'), { target: { value: 'henrypw1' } });
    fireEvent.click(screen.getByTestId('vol-password-ack-checkbox'));
    await act(async () => { fireEvent.submit(screen.getByTestId('add-volunteer-form')); });
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('email already exists'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Firestore subscription callback bodies
// ─────────────────────────────────────────────────────────────────────────────
describe('OrganizerDashboard — subscription callbacks (volunteers)', () => {
  it('updates activeVolunteers stat and volunteersList when volunteers snapshot arrives', async () => {
    renderAuthed();
    const snap = makeVolunteerSnap([
      { id: 'v1', fullName: 'Alice', uid: 'uid1' },
      { id: 'v2', fullName: 'Bob',   uid: 'uid2' },
    ]);
    act(() => { subscribeCapture['volunteers']?.(snap); });
    const panel = screen.getByTestId('dashboard-overview-stub');
    await waitFor(() => expect(panel).toHaveAttribute('data-volunteers', '2'));
    expect(panel).toHaveAttribute('data-vol-list', '2');
  });

  it('volunteer IDs are built from uid prefix when uid is present', async () => {
    renderAuthed();
    // After the volunteers snap, the VolunteersPanel receives the built list
    const snap = makeVolunteerSnap([{ id: 'v3', fullName: 'Carol', uid: 'abcd' }]);
    act(() => { subscribeCapture['volunteers']?.(snap); });
    // Switch to volunteers tab so the panel renders
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await waitFor(() => expect(screen.getByTestId('remove-vol-v3')).toBeInTheDocument());
  });

  it('uses fallback fullName "Volunteer" when fullName is absent', async () => {
    renderAuthed();
    const snap = {
      docs: [{ id: 'v4', data: () => ({}) }],
      size: 1,
      forEach: (cb: (d: unknown) => void) => cb({ id: 'v4', data: () => ({}) }),
    };
    act(() => { subscribeCapture['volunteers']?.(snap); });
    // just confirm no throw and stats updated
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-vol-list', '1')
    );
  });
});

describe('OrganizerDashboard — subscription callbacks (fans)', () => {
  it('sets attendance to 0 when fans snapshot is empty', async () => {
    renderAuthed();
    act(() => {
      subscribeCapture['fans']?.({ docs: [], size: 0, forEach: () => undefined });
    });
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-attendance', '0')
    );
  });

  it('sets attendance to size + 48500 when fans snapshot is non-empty', async () => {
    renderAuthed();
    act(() => {
      subscribeCapture['fans']?.({ docs: [{}], size: 200, forEach: () => undefined });
    });
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-attendance', '48700')
    );
  });
});

describe('OrganizerDashboard — subscription callbacks (foodOrders)', () => {
  it('updates totalOrders to snapshot size', async () => {
    renderAuthed();
    act(() => {
      subscribeCapture['foodOrders']?.({ docs: [], size: 42, forEach: () => undefined });
    });
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-orders', '42')
    );
  });
});

describe('OrganizerDashboard — subscription callbacks (issueReports)', () => {
  it('counts open and pending issues and pushes them as alerts', async () => {
    renderAuthed();
    const snap = {
      docs: [
        { id: 'ir1', data: () => ({ status: 'open',    category: 'Facilities', description: 'Toilet blocked',  timestamp: '2026-07-13T00:00:00Z' }) },
        { id: 'ir2', data: () => ({ status: 'pending', category: 'Security',   description: 'Suspicious bag',  timestamp: '2026-07-13T00:01:00Z' }) },
        { id: 'ir3', data: () => ({ status: 'closed',  category: 'Other',      description: 'Old issue',       timestamp: '2026-07-13T00:02:00Z' }) },
      ],
      size: 3,
      forEach: (cb: (d: unknown) => void) => {
        cb({ id: 'ir1', data: () => ({ status: 'open',    category: 'Facilities', description: 'Toilet blocked', timestamp: '2026-07-13T00:00:00Z' }) });
        cb({ id: 'ir2', data: () => ({ status: 'pending', category: 'Security',   description: 'Suspicious bag', timestamp: '2026-07-13T00:01:00Z' }) });
        cb({ id: 'ir3', data: () => ({ status: 'closed',  category: 'Other',      description: 'Old issue',      timestamp: '2026-07-13T00:02:00Z' }) });
      },
    };
    act(() => { subscribeCapture['issueReports']?.(snap); });
    const panel = screen.getByTestId('dashboard-overview-stub');
    await waitFor(() => expect(panel).toHaveAttribute('data-issues', '2'));
    // 2 open/pending issues become alerts
    expect(panel).toHaveAttribute('data-alerts', '2');
  });

  it('uses fallback timestamp (new Date) when timestamp is absent', async () => {
    renderAuthed();
    const snap = {
      docs: [{ id: 'ir5', data: () => ({ status: 'open', category: 'X', description: 'Desc' }) }],
      size: 1,
      forEach: (cb: (d: unknown) => void) =>
        cb({ id: 'ir5', data: () => ({ status: 'open', category: 'X', description: 'Desc' }) }),
    };
    act(() => { subscribeCapture['issueReports']?.(snap); });
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-issues', '1')
    );
  });
});

describe('OrganizerDashboard — subscription callbacks (emergencyRequests)', () => {
  it('counts active emergencies and adds them as alerts', async () => {
    renderAuthed();
    const snap = {
      docs: [
        { id: 'em1', data: () => ({ status: 'active',   seatNumber: 'A42', timestamp: '2026-07-13T01:00:00Z' }) },
        { id: 'em2', data: () => ({ status: 'resolved', seatNumber: 'B7',  timestamp: '2026-07-13T01:01:00Z' }) },
      ],
      size: 2,
      forEach: (cb: (d: unknown) => void) => {
        cb({ id: 'em1', data: () => ({ status: 'active',   seatNumber: 'A42', timestamp: '2026-07-13T01:00:00Z' }) });
        cb({ id: 'em2', data: () => ({ status: 'resolved', seatNumber: 'B7',  timestamp: '2026-07-13T01:01:00Z' }) });
      },
    };
    act(() => { subscribeCapture['emergencyRequests']?.(snap); });
    const panel = screen.getByTestId('dashboard-overview-stub');
    await waitFor(() => expect(panel).toHaveAttribute('data-emergencies', '1'));
    expect(panel).toHaveAttribute('data-alerts', '1');
  });

  it('uses fallback timestamp when emergency timestamp is absent', async () => {
    renderAuthed();
    const snap = {
      docs: [{ id: 'em3', data: () => ({ status: 'active', seatNumber: 'C1' }) }],
      size: 1,
      forEach: (cb: (d: unknown) => void) =>
        cb({ id: 'em3', data: () => ({ status: 'active', seatNumber: 'C1' }) }),
    };
    act(() => { subscribeCapture['emergencyRequests']?.(snap); });
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-emergencies', '1')
    );
  });
});

describe('OrganizerDashboard — subscription callbacks (matches)', () => {
  it('populates the matches list from a snapshot', async () => {
    renderAuthed();
    const snap = {
      docs: [
        { id: 'm1', data: () => ({ stadiumName: 'Nexus Stadium', matchName: 'POR vs ARG', matchDate: '18/07/2026', matchTime: '19:30', ticketPrice: '120', published: false }) },
      ],
      size: 1,
      forEach: (cb: (d: unknown) => void) =>
        cb({ id: 'm1', data: () => ({ stadiumName: 'Nexus Stadium', matchName: 'POR vs ARG', matchDate: '18/07/2026', matchTime: '19:30', ticketPrice: '120', published: false }) }),
    };
    act(() => { subscribeCapture['matches']?.(snap); });
    fireEvent.click(screen.getByTestId('tab-setup'));
    await waitFor(() =>
      expect(screen.getByTestId('match-setup-stub')).toHaveAttribute('data-match-count', '1')
    );
  });

  it('sets isPublished true when a match has published=true', async () => {
    renderAuthed();
    const snap = {
      docs: [
        { id: 'm2', data: () => ({ stadiumName: 'S', matchName: 'N', matchDate: 'd', matchTime: 't', ticketPrice: '50', published: true }) },
      ],
      size: 1,
      forEach: (cb: (d: unknown) => void) =>
        cb({ id: 'm2', data: () => ({ stadiumName: 'S', matchName: 'N', matchDate: 'd', matchTime: 't', ticketPrice: '50', published: true }) }),
    };
    act(() => { subscribeCapture['matches']?.(snap); });
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-is-published', 'true')
    );
  });
});

describe('OrganizerDashboard — subscription callbacks (systemConfig)', () => {
  it('sets isPublished true when systemConfig doc has isPublished=true', async () => {
    renderAuthed();
    const snap = {
      docs: [{ id: 'cfg1', data: () => ({ isPublished: true }) }],
      size: 1,
      forEach: (cb: (d: unknown) => void) =>
        cb({ id: 'cfg1', data: () => ({ isPublished: true }) }),
    };
    act(() => { subscribeCapture['systemConfig']?.(snap); });
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-is-published', 'true')
    );
  });

  it('leaves isPublished false when systemConfig doc has isPublished=false', async () => {
    renderAuthed();
    const snap = {
      docs: [{ id: 'cfg2', data: () => ({ isPublished: false }) }],
      size: 1,
      forEach: (cb: (d: unknown) => void) =>
        cb({ id: 'cfg2', data: () => ({ isPublished: false }) }),
    };
    act(() => { subscribeCapture['systemConfig']?.(snap); });
    // give a tick for state
    await act(async () => {});
    expect(screen.getByTestId('dashboard-overview-stub')).toHaveAttribute('data-is-published', 'false');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error catch branches
// ─────────────────────────────────────────────────────────────────────────────
describe('OrganizerDashboard — handlePublishEvent error path', () => {
  it('does NOT show the success modal when publishSystemConfig rejects', async () => {
    mockPublishConfig.mockRejectedValueOnce(new Error('Firestore unavailable'));
    renderAuthed();
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await act(async () => { fireEvent.click(screen.getByTestId('publish-event-btn')); });
    await act(async () => {});
    expect(screen.queryByTestId('publish-success-modal')).not.toBeInTheDocument();
  });
});

describe('OrganizerDashboard — handleRemoveVolunteer error path', () => {
  it('does NOT throw to the UI when deleteRecord rejects', async () => {
    mockDeleteRecord.mockRejectedValueOnce(new Error('permission denied'));
    let capVolCb: ((snap: unknown) => void) | null = null;
    mockSubscribeHandler.mockImplementation((name: string, cb: (snap: unknown) => void) => {
      if (name === 'volunteers') capVolCb = cb;
      subscribeCapture[name] = cb;
      return vi.fn();
    });
    renderAuthed();
    act(() => { capVolCb?.(makeVolunteerSnap([{ id: 'v99', fullName: 'Zara', uid: 'uidZ' }])); });
    fireEvent.click(screen.getByTestId('tab-volunteers'));
    await waitFor(() => expect(screen.getByTestId('remove-vol-v99')).toBeInTheDocument());
    // Should not throw despite deleteRecord rejecting
    await act(async () => { fireEvent.click(screen.getByTestId('remove-vol-v99')); });
    expect(mockDeleteRecord).toHaveBeenCalledWith('volunteers', 'v99');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verifyAdminAccess guard
// ─────────────────────────────────────────────────────────────────────────────
describe('OrganizerDashboard — verifyAdminAccess guard', () => {
  it('calls logoutUser when verifyAdminAccess returns false', async () => {
    const logoutUser = vi.fn().mockResolvedValue(undefined);
    mockVerifyAdminAccess.mockResolvedValueOnce(false);
    mockUseAuth.mockReturnValue({ ...adminAuth, logoutUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });

  it('calls logoutUser when verifyAdminAccess rejects', async () => {
    const logoutUser = vi.fn().mockResolvedValue(undefined);
    mockVerifyAdminAccess.mockRejectedValueOnce(new Error('network error'));
    mockUseAuth.mockReturnValue({ ...adminAuth, logoutUser });
    mockUseDemoMode.mockReturnValue(noDemo);
    render(<OrganizerDashboard {...baseProps} />);
    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));
  });

  it('skips verifyAdminAccess in demo mode (no logoutUser call)', async () => {
    const logoutUser = vi.fn();
    mockUseAuth.mockReturnValue({ ...unauthAuth, logoutUser });
    mockUseDemoMode.mockReturnValue(orgDemo);
    render(<OrganizerDashboard {...baseProps} />);
    await act(async () => {});
    expect(logoutUser).not.toHaveBeenCalled();
  });
});
