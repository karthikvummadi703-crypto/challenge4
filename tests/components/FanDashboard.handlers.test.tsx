// @vitest-environment jsdom
/**
 * Handler tests for FanDashboard.
 *
 * Uses callback-exposing stubs so that handleAuthSubmit validation logic,
 * handlePlaceOrder, handleTriggerEmergency, and handleSubmitIssue can be
 * exercised without reaching Firebase.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ── framer-motion ─────────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Firebase stubs ────────────────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ empty: true }),
}));
vi.mock('../../src/firebase', () => ({ db: {} }));

// ── dataSource ────────────────────────────────────────────────────────────────
const mockCreateRecordWithTask = vi.fn().mockResolvedValue(undefined);
vi.mock('../../src/services/dataSource', () => ({
  createRecordWithTask: (...a: unknown[]) => mockCreateRecordWithTask(...a),
}));

// ── Contexts ──────────────────────────────────────────────────────────────────
const mockUseAuth    = vi.fn();
const mockUseDemoMode = vi.fn();
vi.mock('../../src/context/authContext',  () => ({ useAuth:    () => mockUseAuth() }));
vi.mock('../../src/context/demoModeContext', () => ({ useDemoMode: () => mockUseDemoMode() }));

// ── Captured callback refs (populated by each stub's render) ─────────────────
let capturedOnAuthSubmit: ((e: React.FormEvent) => void) | null    = null;
let capturedOnToggleMode: (() => void) | null                       = null;
let capturedSetEmail: ((v: string) => void) | null                  = null;
let capturedSetPassword: ((v: string) => void) | null               = null;
let capturedSetName: ((v: string) => void) | null                   = null;

let capturedOnPlaceOrder: ((e: React.FormEvent) => void) | null     = null;
let capturedOnUpdateCartQty: ((id: string, d: number) => void) | null = null;

let capturedOnEmergencySubmit: ((e: React.FormEvent) => void) | null = null;
let capturedOnSetEmergencySeat: ((v: string) => void) | null         = null;

let capturedOnIssueSubmit: ((e: React.FormEvent) => void) | null    = null;
let capturedOnDescriptionChange: ((v: string) => void) | null        = null;

// ── Stubs that expose handler callbacks ───────────────────────────────────────
vi.mock('../../src/components/fan/FanAuth', () => ({
  default: (props: {
    onSubmit: (e: React.FormEvent) => void;
    onToggleMode: () => void;
    setEmail: (v: string) => void;
    setPassword: (v: string) => void;
    setName: (v: string) => void;
    isRegistering: boolean;
    error: string | null;
    [k: string]: unknown;
  }) => {
    capturedOnAuthSubmit = props.onSubmit;
    capturedOnToggleMode = props.onToggleMode;
    capturedSetEmail     = props.setEmail;
    capturedSetPassword  = props.setPassword;
    capturedSetName      = props.setName;
    return (
      <div data-testid="fan-auth-stub">
        <button
          data-testid="toggle-mode"
          onClick={props.onToggleMode}
        >
          {props.isRegistering ? 'Switch to Login' : 'Switch to Register'}
        </button>
        <button
          data-testid="auth-submit"
          onClick={(e) => props.onSubmit(e as unknown as React.FormEvent)}
        >
          Submit
        </button>
        {props.error && <span data-testid="auth-error">{props.error}</span>}
        <span data-testid="registering-mode">{props.isRegistering ? 'register' : 'login'}</span>
      </div>
    );
  },
}));

vi.mock('../../src/components/fan/FanFoodTab', () => ({
  default: (props: {
    onPlaceOrder: (e: React.FormEvent) => void;
    onUpdateCartQty: (id: string, delta: number) => void;
    orderSuccess: boolean;
    [k: string]: unknown;
  }) => {
    capturedOnPlaceOrder    = props.onPlaceOrder;
    capturedOnUpdateCartQty = props.onUpdateCartQty;
    return (
      <div data-testid="fan-food-tab">
        <button
          data-testid="add-to-cart"
          onClick={() => props.onUpdateCartQty('burger-1', 1)}
        >
          Add
        </button>
        <button
          data-testid="place-order"
          onClick={(e) => props.onPlaceOrder(e as unknown as React.FormEvent)}
        >
          Order
        </button>
        {props.orderSuccess && <span data-testid="order-success">Order placed!</span>}
      </div>
    );
  },
  FOOD_MENU: [{ id: 'burger-1', name: 'Burger', price: 5.99 }],
}));

vi.mock('../../src/components/fan/FanMedicalTab', () => ({
  default: (props: {
    onSubmit: (e: React.FormEvent) => void;
    onEmergencySeatChange: (v: string) => void;
    emergencySuccess: boolean;
    [k: string]: unknown;
  }) => {
    capturedOnEmergencySubmit  = props.onSubmit;
    capturedOnSetEmergencySeat = props.onEmergencySeatChange;
    return (
      <div data-testid="fan-medical-tab">
        <button
          data-testid="trigger-emergency"
          onClick={(e) => props.onSubmit(e as unknown as React.FormEvent)}
        >
          Emergency
        </button>
        {props.emergencySuccess && <span data-testid="emergency-success">Dispatched</span>}
      </div>
    );
  },
}));

vi.mock('../../src/components/fan/FanIssueTab', () => ({
  default: (props: {
    onSubmit: (e: React.FormEvent) => void;
    onDescriptionChange: (v: string) => void;
    issueSuccess: boolean;
    issueDescription: string;
    [k: string]: unknown;
  }) => {
    capturedOnIssueSubmit       = props.onSubmit;
    capturedOnDescriptionChange = props.onDescriptionChange;
    return (
      <div data-testid="fan-issue-tab">
        <button
          data-testid="submit-issue"
          onClick={(e) => props.onSubmit(e as unknown as React.FormEvent)}
        >
          Submit
        </button>
        {props.issueSuccess && <span data-testid="issue-success">Issue logged</span>}
      </div>
    );
  },
}));

vi.mock('../../src/components/fan/FanHomeTab', () => ({
  default: ({ seatNumber }: { seatNumber: string }) =>
    <div data-testid="fan-home-tab" data-seat={seatNumber} />,
}));

vi.mock('../../src/components/fan/FanSidebar', () => ({
  default: (props: {
    activeTab: string;
    onTabChange: (t: string) => void;
    onLogout: () => void;
    [k: string]: unknown;
  }) => (
    <nav data-testid="fan-sidebar-stub">
      <button onClick={() => props.onTabChange('food')}    data-testid="tab-food">Food</button>
      <button onClick={() => props.onTabChange('medical')} data-testid="tab-medical">Medical</button>
      <button onClick={() => props.onTabChange('issue')}   data-testid="tab-issue">Issue</button>
      <button onClick={props.onLogout}                     data-testid="logout-btn">Logout</button>
      <span data-testid="active-tab">{props.activeTab}</span>
    </nav>
  ),
}));

vi.mock('../../src/components/fan/FanAIChat', () => ({
  default: ({
    chatLogs,
    onAppendMessage,
  }: {
    chatLogs: unknown[];
    onAppendMessage: (m: unknown) => void;
  }) => (
    <div data-testid="fan-ai-chat" data-msg-count={chatLogs.length}>
      <button
        data-testid="append-chat"
        onClick={() => onAppendMessage({ sender: 'user', text: 'hello' })}
      >
        Chat
      </button>
    </div>
  ),
}));

const { default: FanDashboard } = await import('../../src/components/FanDashboard');

// ── Shared mock factory ───────────────────────────────────────────────────────
const mockSignUpFan  = vi.fn().mockResolvedValue(undefined);
const mockLoginUser  = vi.fn().mockResolvedValue(undefined);
const mockLogoutUser = vi.fn().mockResolvedValue(undefined);
const mockSetError   = vi.fn();

function makeAuth(overrides: Record<string, unknown> = {}) {
  return {
    user: null, profile: null, role: null, error: null,
    signUpFan:  mockSignUpFan,
    loginUser:  mockLoginUser,
    logoutUser: mockLogoutUser,
    setError:   mockSetError,
    ...overrides,
  };
}
const noDemo = { isDemoMode: false, demoRole: null, demoProfile: null };

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnAuthSubmit    = null; capturedOnToggleMode    = null;
  capturedSetEmail        = null; capturedSetPassword     = null; capturedSetName = null;
  capturedOnPlaceOrder    = null; capturedOnUpdateCartQty = null;
  capturedOnEmergencySubmit = null; capturedOnSetEmergencySeat = null;
  capturedOnIssueSubmit   = null; capturedOnDescriptionChange = null;
  mockUseDemoMode.mockReturnValue(noDemo);
});

// ── handleAuthSubmit validation ───────────────────────────────────────────────
describe('FanDashboard — handleAuthSubmit validation (unauthenticated)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth());
  });

  it('calls setError for an invalid email format', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    await act(async () => {
      capturedSetEmail?.('not-an-email');
      capturedSetPassword?.('password123');
    });
    await act(async () => {
      capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockSetError).toHaveBeenCalledWith('Please enter a valid email address.');
  });

  it('calls setError when email is empty', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    await act(async () => {
      capturedSetEmail?.('');
      capturedSetPassword?.('password123');
    });
    await act(async () => {
      capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockSetError).toHaveBeenCalledWith('Please enter a valid email address.');
  });

  it('calls setError for a password shorter than 6 characters', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    await act(async () => {
      capturedSetEmail?.('fan@example.com');
      capturedSetPassword?.('abc');
    });
    await act(async () => {
      capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockSetError).toHaveBeenCalledWith('Password must be at least 6 characters.');
  });

  it('calls setError when registering without a name', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    // email + password valid; name stays empty (default)
    await act(async () => {
      capturedSetEmail?.('fan@example.com');
      capturedSetPassword?.('validpass');
      capturedSetName?.('');
    });
    await act(async () => {
      capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockSetError).toHaveBeenCalledWith('Full name is required.');
  });

  it('calls loginUser when in login mode with valid credentials', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    // Switch to login mode
    act(() => { capturedOnToggleMode?.(); });
    await act(async () => {
      capturedSetEmail?.('fan@example.com');
      capturedSetPassword?.('validpass');
    });
    await act(async () => {
      capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockLoginUser).toHaveBeenCalledWith('fan@example.com', 'validpass', 'fan');
  });

  it('trims whitespace from email before validation', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    act(() => { capturedOnToggleMode?.(); }); // login mode
    await act(async () => {
      capturedSetEmail?.('  fan@example.com  ');
      capturedSetPassword?.('validpass');
    });
    await act(async () => {
      capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockLoginUser).toHaveBeenCalledWith('fan@example.com', 'validpass', 'fan');
  });
});

// ── handlePlaceOrder ──────────────────────────────────────────────────────────
describe('FanDashboard — handlePlaceOrder (authenticated)', () => {
  const fanUser    = { uid: 'u1', email: 'fan@test.com', displayName: 'Fan' };
  const fanProfile = { uid: 'u1', email: 'fan@test.com', role: 'fan' as const, fullName: 'Fan', seatNumber: 'B-042' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth({ user: fanUser, profile: fanProfile, role: 'fan' }));
  });

  it('calls createRecordWithTask when cart has items', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-food'));
    // Add an item to the cart
    act(() => { capturedOnUpdateCartQty?.('burger-1', 1); });
    await act(async () => {
      capturedOnPlaceOrder?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockCreateRecordWithTask).toHaveBeenCalledWith(
      'foodOrders',
      expect.objectContaining({ seatNumber: 'B-042' }),
      expect.objectContaining({ type: 'Deliver Food' })
    );
  });

  it('does NOT call createRecordWithTask when cart is empty', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-food'));
    await act(async () => {
      capturedOnPlaceOrder?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockCreateRecordWithTask).not.toHaveBeenCalled();
  });

  it('appends an AI acknowledgement to chat after a successful order', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-food'));
    const initialCount = Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'));
    act(() => { capturedOnUpdateCartQty?.('burger-1', 1); });
    await act(async () => {
      capturedOnPlaceOrder?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    // Chat log should grow by one AI message
    await waitFor(() => {
      const newCount = Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'));
      expect(newCount).toBeGreaterThan(initialCount);
    });
  });
});

// ── handleTriggerEmergency ────────────────────────────────────────────────────
describe('FanDashboard — handleTriggerEmergency (authenticated)', () => {
  const fanUser    = { uid: 'u2', email: 'fan@test.com', displayName: 'Fan' };
  const fanProfile = { uid: 'u2', email: 'fan@test.com', role: 'fan' as const, fullName: 'Fan', seatNumber: 'C-007' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth({ user: fanUser, profile: fanProfile, role: 'fan' }));
  });

  it('calls createRecordWithTask with emergencyRequests', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-medical'));
    await act(async () => {
      capturedOnEmergencySubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockCreateRecordWithTask).toHaveBeenCalledWith(
      'emergencyRequests',
      expect.objectContaining({ status: 'active' }),
      expect.objectContaining({ type: 'Medical Emergency', priority: 'High' })
    );
  });

  it('does NOT submit if emergencySeat is empty', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-medical'));
    // Clear the seat
    act(() => { capturedOnSetEmergencySeat?.(''); });
    await act(async () => {
      capturedOnEmergencySubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockCreateRecordWithTask).not.toHaveBeenCalled();
  });

  it('appends an emergency AI acknowledgement to chat', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-medical'));
    const initialCount = Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'));
    await act(async () => {
      capturedOnEmergencySubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    await waitFor(() => {
      expect(
        Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'))
      ).toBeGreaterThan(initialCount);
    });
  });
});

// ── handleSubmitIssue ─────────────────────────────────────────────────────────
describe('FanDashboard — handleSubmitIssue (authenticated)', () => {
  const fanUser    = { uid: 'u3', email: 'fan@test.com', displayName: 'Fan' };
  const fanProfile = { uid: 'u3', email: 'fan@test.com', role: 'fan' as const, fullName: 'Fan', seatNumber: 'A-101' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth({ user: fanUser, profile: fanProfile, role: 'fan' }));
  });

  it('calls createRecordWithTask with issueReports when description is non-empty', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-issue'));
    act(() => { capturedOnDescriptionChange?.('Broken seat armrest'); });
    await act(async () => {
      capturedOnIssueSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockCreateRecordWithTask).toHaveBeenCalledWith(
      'issueReports',
      expect.objectContaining({ status: 'open' }),
      expect.any(Object)
    );
  });

  it('does NOT call createRecordWithTask when description is empty', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-issue'));
    // description is empty by default; just submit
    await act(async () => {
      capturedOnIssueSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockCreateRecordWithTask).not.toHaveBeenCalled();
  });

  it('does NOT call createRecordWithTask when description is whitespace only', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-issue'));
    act(() => { capturedOnDescriptionChange?.('   '); });
    await act(async () => {
      capturedOnIssueSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    expect(mockCreateRecordWithTask).not.toHaveBeenCalled();
  });

  it('appends an AI acknowledgement after successfully submitting an issue', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-issue'));
    const initialCount = Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'));
    act(() => { capturedOnDescriptionChange?.('My seat is broken'); });
    await act(async () => {
      capturedOnIssueSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    await waitFor(() => {
      expect(
        Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'))
      ).toBeGreaterThan(initialCount);
    });
  });
});

// ── Error catch paths (lines 142, 191, 234, 272) ─────────────────────────────
// Each of these tests exercises the `catch` block of its respective handler,
// ensuring the error is swallowed / logged rather than propagated to React.

describe('FanDashboard — handleAuthSubmit error catch (line 142)', () => {
  beforeEach(() => {
    // Unauthenticated state — shows FanAuth stub so we can call capturedOnAuthSubmit
    mockUseAuth.mockReturnValue(makeAuth({ user: null, profile: null, role: null }));
  });

  it('catches the error from signUpFan without crashing (line 142)', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    // Provide valid credentials so client-side validation passes
    await act(async () => {
      capturedSetEmail?.('fan@example.com');
      capturedSetPassword?.('validpassword');
      capturedSetName?.('Jane Doe');
    });
    mockSignUpFan.mockRejectedValueOnce(new Error('auth/email-already-in-use'));

    await expect(
      act(async () => {
        capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      })
    ).resolves.not.toThrow();

    // signUpFan was attempted despite the rejection being caught
    expect(mockSignUpFan).toHaveBeenCalledOnce();
  });

  it('catches the error from loginUser without crashing when in login mode (line 142)', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    await act(async () => { capturedOnToggleMode?.(); }); // switch to login mode
    await act(async () => {
      capturedSetEmail?.('fan@example.com');
      capturedSetPassword?.('wrongpass');
    });
    mockLoginUser.mockRejectedValueOnce(new Error('auth/wrong-password'));

    await expect(
      act(async () => {
        capturedOnAuthSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      })
    ).resolves.not.toThrow();

    expect(mockLoginUser).toHaveBeenCalledOnce();
  });
});

describe('FanDashboard — handlePlaceOrder error catch (line 191)', () => {
  const fanUser    = { uid: 'u5', email: 'fan@test.com', displayName: 'Fan' };
  const fanProfile = { uid: 'u5', email: 'fan@test.com', role: 'fan' as const, fullName: 'Fan', seatNumber: 'C-010' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth({ user: fanUser, profile: fanProfile, role: 'fan' }));
    mockCreateRecordWithTask.mockResolvedValue({ id: 'order-ok' });
  });

  it('catches Firestore failure in handlePlaceOrder without crashing (line 191)', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-food'));

    // Add an item to trigger cartSubtotal > 0
    act(() => { capturedOnUpdateCartQty?.('burger-1', 1); });
    mockCreateRecordWithTask.mockRejectedValueOnce(new Error('Firestore write failed'));

    await expect(
      act(async () => {
        capturedOnPlaceOrder?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      })
    ).resolves.not.toThrow();

    expect(mockCreateRecordWithTask).toHaveBeenCalledWith(
      'foodOrders', expect.any(Object), expect.any(Object)
    );
  });
});

describe('FanDashboard — handleEmergencySubmit error catch (line 234)', () => {
  const fanUser    = { uid: 'u6', email: 'fan@test.com', displayName: 'Fan' };
  const fanProfile = { uid: 'u6', email: 'fan@test.com', role: 'fan' as const, fullName: 'Fan', seatNumber: 'B-021' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth({ user: fanUser, profile: fanProfile, role: 'fan' }));
    mockCreateRecordWithTask.mockResolvedValue({ id: 'emrg-ok' });
  });

  it('catches Firestore failure in handleEmergencySubmit without crashing (line 234)', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-medical'));
    // Emergency seat is pre-populated from fanProfile.seatNumber — no need to set it
    mockCreateRecordWithTask.mockRejectedValueOnce(new Error('Firestore emergency write failed'));

    await expect(
      act(async () => {
        capturedOnEmergencySubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      })
    ).resolves.not.toThrow();

    expect(mockCreateRecordWithTask).toHaveBeenCalledWith(
      'emergencyRequests', expect.any(Object), expect.any(Object)
    );
  });
});

describe('FanDashboard — handleSubmitIssue error catch (line 272)', () => {
  const fanUser    = { uid: 'u7', email: 'fan@test.com', displayName: 'Fan' };
  const fanProfile = { uid: 'u7', email: 'fan@test.com', role: 'fan' as const, fullName: 'Fan', seatNumber: 'D-099' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth({ user: fanUser, profile: fanProfile, role: 'fan' }));
    mockCreateRecordWithTask.mockResolvedValue({ id: 'issue-ok' });
  });

  it('catches Firestore failure in handleSubmitIssue without crashing (line 272)', async () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    fireEvent.click(screen.getByTestId('tab-issue'));
    act(() => { capturedOnDescriptionChange?.('Seat cushion missing'); });
    mockCreateRecordWithTask.mockRejectedValueOnce(new Error('Firestore issue write failed'));

    await expect(
      act(async () => {
        capturedOnIssueSubmit?.({ preventDefault: vi.fn() } as unknown as React.FormEvent);
      })
    ).resolves.not.toThrow();

    expect(mockCreateRecordWithTask).toHaveBeenCalledWith(
      'issueReports', expect.any(Object), expect.any(Object)
    );
  });
});

// ── appendChatMessage ─────────────────────────────────────────────────────────
describe('FanDashboard — appendChatMessage (authenticated)', () => {
  const fanUser    = { uid: 'u4', email: 'fan@test.com', displayName: 'Fan' };
  const fanProfile = { uid: 'u4', email: 'fan@test.com', role: 'fan' as const, fullName: 'Fan', seatNumber: 'D-001' };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(makeAuth({ user: fanUser, profile: fanProfile, role: 'fan' }));
  });

  it('adds a message to the chat log when onAppendMessage is called', () => {
    render(<FanDashboard onLogout={vi.fn()} stadiumBg="" />);
    const initialCount = Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'));
    fireEvent.click(screen.getByTestId('append-chat'));
    expect(
      Number(screen.getByTestId('fan-ai-chat').getAttribute('data-msg-count'))
    ).toBe(initialCount + 1);
  });
});
