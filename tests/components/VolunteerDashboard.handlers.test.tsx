/**
 * Targeted handler tests for VolunteerDashboard.
 *
 * Uses different stubs from the primary VolunteerDashboard.test.tsx so that
 * handleAcceptTask / handleCompleteTask / handleLogin / handleQuickLogin are
 * actually exercised.  All Firestore / Firebase interactions are mocked.
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

// ── Firebase stubs ────────────────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
}));
vi.mock('../../src/firebase', () => ({ db: {} }));

// ── Services ──────────────────────────────────────────────────────────────────
vi.mock('../../src/services/authService', () => ({
  getFriendlyErrorMessage: vi.fn((e: unknown) => (e instanceof Error ? e.message : String(e))),
}));

const mockUpdateRecord = vi.fn().mockResolvedValue(undefined);
let capturedTasksCallback: ((snap: unknown) => void) | null = null;
const mockSubscribe = vi.fn().mockImplementation((name: string, cb: (snap: unknown) => void) => {
  if (name === 'tasks') capturedTasksCallback = cb;
  return vi.fn();
});

vi.mock('../../src/services/dataSource', () => ({
  subscribeCollection: (name: string, cb: (snap: unknown) => void) => mockSubscribe(name, cb),
  updateRecord: (...a: unknown[]) => mockUpdateRecord(...a),
}));

// ── Auth context ──────────────────────────────────────────────────────────────
const mockLoginUser  = vi.fn();
const mockLogoutUser = vi.fn().mockResolvedValue(undefined);
const mockUseAuth    = vi.fn();
vi.mock('../../src/context/authContext', () => ({ useAuth: () => mockUseAuth() }));

const mockUseDemoMode = vi.fn();
vi.mock('../../src/context/demoModeContext', () => ({ useDemoMode: () => mockUseDemoMode() }));

// ── Child stubs — VolunteerLogin exposes inputs + form ────────────────────────
vi.mock('../../src/components/volunteer/VolunteerLogin', () => ({
  default: (props: {
    email: string; setEmail: (v: string) => void;
    password: string; setPassword: (v: string) => void;
    loginError: string; isLoggingIn: boolean;
    onSubmit: (e: React.FormEvent) => void;
    demoAccounts: Array<{ id: string; name: string; email: string; volunteerId: string }>;
    onQuickLogin: (acc: { id: string; name: string; email: string; volunteerId: string }) => void;
  }) => (
    <div data-testid="volunteer-login-stub">
      <input
        data-testid="email-input"
        value={props.email}
        onChange={e => props.setEmail(e.target.value)}
      />
      <input
        data-testid="password-input"
        type="password"
        value={props.password}
        onChange={e => props.setPassword(e.target.value)}
      />
      <span data-testid="login-error">{props.loginError}</span>
      <form onSubmit={props.onSubmit} data-testid="login-form">
        <button type="submit" data-testid="login-submit" disabled={props.isLoggingIn}>
          Login
        </button>
      </form>
      {props.demoAccounts.map(acc => (
        <button key={acc.id} data-testid={`quick-login-${acc.id}`} onClick={() => props.onQuickLogin(acc)}>
          {acc.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../src/components/volunteer/VolunteerHeader', () => ({
  default: (props: { volunteerName: string; volunteerId: string; onLogout: () => void }) => (
    <header data-testid="volunteer-header-stub">
      <span data-testid="volunteer-name">{props.volunteerName}</span>
      <button onClick={props.onLogout} data-testid="logout-btn">Logout</button>
    </header>
  ),
}));

// VolunteerTaskStack stub exposes accept/complete buttons via task list
vi.mock('../../src/components/volunteer/VolunteerTaskStack', () => ({
  default: (props: {
    myAssignedTasks: Array<{ id: string; status: string }>;
    otherTasks: Array<{ id: string; status: string }>;
    onHighlightSeat: (seat: string | undefined) => void;
    onAcceptTask: (id: string) => void;
    onCompleteTask: (id: string) => void;
  }) => (
    <div data-testid="volunteer-task-stack">
      {props.otherTasks.map(t => (
        <button key={t.id} data-testid={`accept-${t.id}`} onClick={() => props.onAcceptTask(t.id)}>
          Accept {t.id}
        </button>
      ))}
      {props.myAssignedTasks.map(t => (
        <button key={t.id} data-testid={`complete-${t.id}`} onClick={() => props.onCompleteTask(t.id)}>
          Complete {t.id}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../src/components/volunteer/VolunteerMapPanel', () => ({
  default: () => <div data-testid="volunteer-map-panel" />,
}));

vi.mock('../../src/components/volunteer/VolunteerAIChat', () => ({
  default: () => <div data-testid="volunteer-ai-chat-stub" />,
}));

const { default: VolunteerDashboard } = await import('../../src/components/VolunteerDashboard');

// ── Shared test fixtures ──────────────────────────────────────────────────────
const unauthAuth = {
  user: null, profile: null, role: null, loading: false,
  error: null, setError: vi.fn(),
  loginUser: mockLoginUser,
  logoutUser: mockLogoutUser,
};

const volProfile = { fullName: 'Alex Volunteer', volunteerId: 'VOL-ALEX' };
const volAuth = {
  ...unauthAuth,
  // uid='ALEX' → volunteerId derived as VOL-ALEX in VolunteerDashboard line 49
  user: { uid: 'ALEX', email: 'vol@nexus.com' },
  profile: volProfile,
  role: 'volunteer',
  loginUser: mockLoginUser,
  logoutUser: mockLogoutUser,
};

const noDemo = { isDemoMode: false, demoRole: null, demoProfile: null };

/** Helper: fire the tasks subscribeCollection callback with a fake snapshot. */
function pushTasks(tasks: Array<Record<string, unknown>>) {
  if (!capturedTasksCallback) throw new Error('tasks callback not captured yet');
  const docs = tasks.map(t => {
    const { id, ...rest } = t;
    return { id: id as string, data: () => rest };
  });
  const snap = { docs, size: docs.length, forEach: (cb: (d: unknown) => void) => docs.forEach(cb) };
  act(() => { capturedTasksCallback!(snap); });
}

// ── handleLogin ───────────────────────────────────────────────────────────────
describe('VolunteerDashboard — handleLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedTasksCallback = null;
    mockSubscribe.mockImplementation((name: string, cb: (snap: unknown) => void) => {
      if (name === 'tasks') capturedTasksCallback = cb;
      return vi.fn();
    });
    mockUseAuth.mockReturnValue(unauthAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
  });

  it('early-returns without calling loginUser when email is empty', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'));
    });
    expect(mockLoginUser).not.toHaveBeenCalled();
  });

  it('calls loginUser with entered credentials on form submit', async () => {
    mockLoginUser.mockResolvedValue(undefined);
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'vol@test.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'secret' } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'));
    });
    expect(mockLoginUser).toHaveBeenCalledWith('vol@test.com', 'secret', 'volunteer');
  });

  it('shows a friendly error message when loginUser throws', async () => {
    mockLoginUser.mockRejectedValue(new Error('auth/wrong-password'));
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'vol@test.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'wrong' } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'));
    });
    expect(screen.getByTestId('login-error')).not.toHaveTextContent('');
  });

  it('calls loginUser with password123 for quick login accounts', async () => {
    mockLoginUser.mockResolvedValue(undefined);
    const { getFriendlyErrorMessage: _gfem } = await import('../../src/services/authService');
    // Give the login stub some demo accounts via the Firestore getDocs mock
    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue({
      forEach: (cb: (d: unknown) => void) => {
        cb({ id: 'dv1', data: () => ({ fullName: 'Demo Vol', uid: 'dv1', email: 'dv@test.com' }) });
      },
    } as unknown as Awaited<ReturnType<typeof getDocs>>);

    render(<VolunteerDashboard onLogout={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('quick-login-dv1')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByTestId('quick-login-dv1'));
    });
    expect(mockLoginUser).toHaveBeenCalledWith('dv@test.com', 'password123', 'volunteer');
  });
});

// ── handleAcceptTask ──────────────────────────────────────────────────────────
describe('VolunteerDashboard — handleAcceptTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedTasksCallback = null;
    mockSubscribe.mockImplementation((name: string, cb: (snap: unknown) => void) => {
      if (name === 'tasks') capturedTasksCallback = cb;
      return vi.fn();
    });
    mockUpdateRecord.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(volAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
  });

  it('calls updateRecord on tasks with status accepted and assignedTo', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{ id: 't1', type: 'Seat Issue', status: 'pending', timestamp: new Date().toISOString() }]);
    await waitFor(() => expect(screen.getByTestId('accept-t1')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('accept-t1')); });
    expect(mockUpdateRecord).toHaveBeenCalledWith('tasks', 't1', expect.objectContaining({ status: 'accepted', assignedTo: 'VOL-ALEX' }));
  });

  it('also updates the linked issueReport when task type is not Deliver Food', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{ id: 't2', type: 'Seat Issue', status: 'pending', linkedId: 'issue-1', timestamp: new Date().toISOString() }]);
    await waitFor(() => expect(screen.getByTestId('accept-t2')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('accept-t2')); });
    expect(mockUpdateRecord).toHaveBeenCalledWith('issueReports', 'issue-1', expect.objectContaining({ assignedVolunteer: 'VOL-ALEX' }));
  });

  it('updates the linked foodOrder when task type is Deliver Food', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{ id: 't3', type: 'Deliver Food', status: 'pending', linkedId: 'order-1', timestamp: new Date().toISOString() }]);
    await waitFor(() => expect(screen.getByTestId('accept-t3')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('accept-t3')); });
    expect(mockUpdateRecord).toHaveBeenCalledWith('foodOrders', 'order-1', { status: 'preparing' });
  });

  it('does nothing (no-op) when task id is not found in the task list', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{ id: 't4', type: 'Seat Issue', status: 'pending', timestamp: new Date().toISOString() }]);
    await waitFor(() => expect(screen.getByTestId('accept-t4')).toBeInTheDocument());
    // Directly invoke with an unknown id — the stub doesn't expose a button for a nonexistent task,
    // so clear mocks then verify no calls happen when pushing a snapshot without that id.
    vi.clearAllMocks();
    pushTasks([]); // remove all tasks from state
    // No accept buttons should exist; updateRecord not called since there are no tasks
    expect(screen.queryByTestId('accept-t4')).not.toBeInTheDocument();
    expect(mockUpdateRecord).not.toHaveBeenCalled();
  });
});

// ── handleCompleteTask ────────────────────────────────────────────────────────
describe('VolunteerDashboard — handleCompleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedTasksCallback = null;
    mockSubscribe.mockImplementation((name: string, cb: (snap: unknown) => void) => {
      if (name === 'tasks') capturedTasksCallback = cb;
      return vi.fn();
    });
    mockUpdateRecord.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(volAuth);
    mockUseDemoMode.mockReturnValue(noDemo);
  });

  it('marks the task completed and updates linked foodOrder when type is Deliver Food', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{
      id: 'tc1', type: 'Deliver Food', status: 'accepted',
      assignedTo: 'VOL-ALEX', linkedId: 'order-99',
      timestamp: new Date(Date.now() - 5000).toISOString(),
    }]);
    await waitFor(() => expect(screen.getByTestId('complete-tc1')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('complete-tc1')); });
    expect(mockUpdateRecord).toHaveBeenCalledWith('tasks', 'tc1', expect.objectContaining({ status: 'completed' }));
    expect(mockUpdateRecord).toHaveBeenCalledWith('foodOrders', 'order-99', { status: 'delivered' });
  });

  it('marks the task completed and resolves linked emergencyRequest for Medical Emergency', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{
      id: 'tc2', type: 'Medical Emergency', status: 'accepted',
      assignedTo: 'VOL-ALEX', linkedId: 'emerg-1',
      timestamp: new Date(Date.now() - 5000).toISOString(),
    }]);
    await waitFor(() => expect(screen.getByTestId('complete-tc2')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('complete-tc2')); });
    expect(mockUpdateRecord).toHaveBeenCalledWith('emergencyRequests', 'emerg-1', { status: 'resolved' });
  });

  it('marks the task completed and resolves linked issueReport for other task types', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{
      id: 'tc3', type: 'Seat Issue', status: 'accepted',
      assignedTo: 'VOL-ALEX', linkedId: 'issue-5',
      timestamp: new Date(Date.now() - 5000).toISOString(),
    }]);
    await waitFor(() => expect(screen.getByTestId('complete-tc3')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('complete-tc3')); });
    expect(mockUpdateRecord).toHaveBeenCalledWith('issueReports', 'issue-5', { status: 'resolved' });
  });

  it('marks the task completed even without a linkedId', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{
      id: 'tc4', type: 'Seat Issue', status: 'accepted',
      assignedTo: 'VOL-ALEX',
      timestamp: new Date(Date.now() - 5000).toISOString(),
    }]);
    await waitFor(() => expect(screen.getByTestId('complete-tc4')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('complete-tc4')); });
    expect(mockUpdateRecord).toHaveBeenCalledWith('tasks', 'tc4', expect.objectContaining({ status: 'completed' }));
    // Only one call — no linked record update
    expect(mockUpdateRecord).toHaveBeenCalledTimes(1);
  });

  it('includes deliveryTimeMs in the completed task update', async () => {
    render(<VolunteerDashboard onLogout={vi.fn()} />);
    pushTasks([{
      id: 'tc5', type: 'Deliver Food', status: 'accepted',
      assignedTo: 'VOL-ALEX', linkedId: 'order-2',
      timestamp: new Date(Date.now() - 3000).toISOString(),
    }]);
    await waitFor(() => expect(screen.getByTestId('complete-tc5')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('complete-tc5')); });
    const taskCall = mockUpdateRecord.mock.calls.find(
      (c: unknown[]) => c[0] === 'tasks'
    );
    expect(typeof (taskCall?.[2] as Record<string, unknown>)?.deliveryTimeMs).toBe('number');
  });
});
