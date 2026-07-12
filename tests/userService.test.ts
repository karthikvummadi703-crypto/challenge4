/**
 * Unit tests for src/services/userService.ts
 *
 * Tests cover:
 *  - Input validation logic (validateRegistrationFields is private but
 *    exercised through the public API functions)
 *  - createFanProfile / createVolunteerProfile / createAdminProfile happy-path
 *    and error-path behaviour
 *  - Gate assignment logic in createFanProfile
 *  - verifyAdminAccess with all lookup paths
 *  - getUserRole resolution order
 *
 * Firebase is mocked entirely — no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mock state ─────────────────────────────────────────────────────────
/** Firestore DocumentSnapshot shape — exists() is a method, not a property. */
interface MockDoc { exists: () => boolean; data: () => Record<string, unknown> }

const mockDocData: Record<string, MockDoc> = {};

const mockSetDoc    = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc    = vi.fn().mockImplementation((_db: unknown, path: string, id: string) => {
  const key = `${path}/${id}`;
  return Promise.resolve(mockDocData[key] ?? { exists: () => false, data: () => ({}) });
});
const mockGetDocs   = vi.fn().mockImplementation((_query: unknown) => {
  return Promise.resolve({ empty: true, docs: [] });
});

// ── Firebase mocks ────────────────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  doc:              (_db: unknown, col: string, id: string) => ({ path: col, id }),
  getDoc:           (ref: { path: string; id: string }) => mockGetDoc(null, ref.path, ref.id),
  setDoc:           (_ref: unknown, data: unknown) => mockSetDoc(_ref, data),
  updateDoc:        (_ref: unknown, data: unknown) => mockUpdateDoc(_ref, data),
  getDocs:          (q: unknown) => mockGetDocs(q),
  collection:       (_db: unknown, name: string) => ({ name }),
  query:            (col: unknown, ..._args: unknown[]) => ({ col }),
  where:            (..._args: unknown[]) => ({}),
  serverTimestamp:  () => ({ _type: 'serverTimestamp' }),
}));

vi.mock('../src/firebase', () => ({ db: {} }));

// Mock secondary firebase app functions used by adminCreateVolunteer
vi.mock('firebase/app', () => ({
  initializeApp:  vi.fn(() => ({ name: 'SecondaryAdminApp' })),
  deleteApp:      vi.fn().mockResolvedValue(undefined),
  getApps:        vi.fn(() => []),
  getApp:         vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth:                         vi.fn(() => ({
    currentUser: { email: 'test@test.com' },
  })),
  createUserWithEmailAndPassword:  vi.fn().mockResolvedValue({
    user: { uid: 'new-uid-123' },
  }),
  signOut:                         vi.fn().mockResolvedValue(undefined),
}));

import {
  createFanProfile,
  createVolunteerProfile,
  createAdminProfile,
  verifyAdminAccess,
  getUserRole,
  updateLastLogin,
} from '../src/services/userService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedDoc(collection: string, id: string, data: Record<string, unknown> = {}): void {
  mockDocData[`${collection}/${id}`] = { exists: () => true, data: () => data };
}

function clearDocs(): void {
  Object.keys(mockDocData).forEach(k => delete mockDocData[k]);
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  clearDocs();
});

// ── createFanProfile ──────────────────────────────────────────────────────────

describe('createFanProfile', () => {
  it('calls setDoc once with the correct collection and fields', async () => {
    await createFanProfile('uid-fan-1', 'Ada Lovelace', 'ada@example.com', 'A-101');
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.uid).toBe('uid-fan-1');
    expect(data.fullName).toBe('Ada Lovelace');
    expect(data.email).toBe('ada@example.com');
    expect(data.role).toBe('fan');
    expect(data.seatNumber).toBe('A-101');
  });

  it('trims and lowercases the email', async () => {
    await createFanProfile('uid-2', 'Test Fan', '  UPPER@TEST.COM  ', 'B-202');
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.email).toBe('upper@test.com');
  });

  it('trims the full name', async () => {
    await createFanProfile('uid-3', '  Padded Name  ', 'p@test.com', 'A-1');
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.fullName).toBe('Padded Name');
  });

  it('assigns Gate A for seat numbers starting with A', async () => {
    await createFanProfile('uid-4', 'Alpha Fan', 'a@test.com', 'A-200');
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.assignedGate).toBe('Gate A');
  });

  it('assigns Gate B for seat numbers starting with B', async () => {
    await createFanProfile('uid-5', 'Beta Fan', 'b@test.com', 'B-100');
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.assignedGate).toBe('Gate B');
  });

  it('assigns Gate C for seat numbers starting with C', async () => {
    await createFanProfile('uid-6', 'Gamma Fan', 'c@test.com', 'C-300');
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.assignedGate).toBe('Gate C');
  });

  it('assigns Gate D for VIP seats', async () => {
    await createFanProfile('uid-7', 'VIP Fan', 'v@test.com', 'VIP-001');
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.assignedGate).toBe('Gate D');
  });

  it('rejects an empty full name', async () => {
    await expect(createFanProfile('uid-8', '   ', 'ok@test.com', 'A-1'))
      .rejects.toThrow('Full name is required.');
  });

  it('rejects an invalid email address', async () => {
    await expect(createFanProfile('uid-9', 'Valid Name', 'not-an-email', 'A-1'))
      .rejects.toThrow('Please enter a valid email address.');
  });

  it('rejects an email that exceeds 254 characters', async () => {
    const longEmail = `${'a'.repeat(250)}@x.com`;
    await expect(createFanProfile('uid-10', 'Valid Name', longEmail, 'A-1'))
      .rejects.toThrow('Email address is too long.');
  });

  it('rejects a full name exceeding 100 characters', async () => {
    const longName = 'A'.repeat(101);
    await expect(createFanProfile('uid-11', longName, 'ok@test.com', 'A-1'))
      .rejects.toThrow('Full name must be 100 characters or fewer.');
  });

  it('stores extra registration details', async () => {
    await createFanProfile('uid-12', 'Detail Fan', 'd@test.com', 'A-5', {
      phone: '+1 555 1234',
      country: 'Brazil',
      preferredLanguage: 'Portuguese',
      favoriteTeam: 'Brazil',
    });
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.phone).toBe('+1 555 1234');
    expect(data.country).toBe('Brazil');
    expect(data.preferredLanguage).toBe('Portuguese');
    expect(data.favoriteTeam).toBe('Brazil');
  });
});

// ── createVolunteerProfile ────────────────────────────────────────────────────

describe('createVolunteerProfile', () => {
  it('creates a volunteer document with role "volunteer"', async () => {
    await createVolunteerProfile('vol-uid-1', 'Marco Silva', 'marco@test.com', 'Gate B');
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.role).toBe('volunteer');
    expect(data.assignedGate).toBe('Gate B');
    expect(data.active).toBe(true);
  });

  it('defaults assignedGate to "Gate A"', async () => {
    await createVolunteerProfile('vol-uid-2', 'Default Gate', 'dg@test.com');
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.assignedGate).toBe('Gate A');
  });

  it('rejects a blank full name', async () => {
    await expect(createVolunteerProfile('vol-uid-3', '', 'ok@test.com'))
      .rejects.toThrow('Full name is required.');
  });

  it('rejects a malformed email', async () => {
    await expect(createVolunteerProfile('vol-uid-4', 'Name', 'bad-email'))
      .rejects.toThrow('Please enter a valid email address.');
  });
});

// ── createAdminProfile ────────────────────────────────────────────────────────

describe('createAdminProfile', () => {
  it('creates an admin document with role "admin"', async () => {
    await createAdminProfile('admin-uid-1', 'admin@nexus.com');
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.role).toBe('admin');
    expect(data.uid).toBe('admin-uid-1');
    expect(data.email).toBe('admin@nexus.com');
  });
});

// ── verifyAdminAccess ─────────────────────────────────────────────────────────

describe('verifyAdminAccess', () => {
  it('returns true when admin doc exists keyed by UID', async () => {
    seedDoc('admins', 'admin-uid-1', { role: 'admin' });
    const result = await verifyAdminAccess('admin-uid-1', 'admin@nexus.com');
    expect(result).toBe(true);
  });

  it('returns false when no admin doc exists for this UID or email', async () => {
    const result = await verifyAdminAccess('unknown-uid', 'nobody@test.com');
    expect(result).toBe(false);
  });

  it('returns false when getDoc throws (e.g. PERMISSION_DENIED)', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    const result = await verifyAdminAccess('some-uid', 'some@test.com');
    expect(result).toBe(false);
  });
});

// ── getUserRole ───────────────────────────────────────────────────────────────

describe('getUserRole', () => {
  it('returns "admin" when the user has an admins document', async () => {
    seedDoc('admins', 'uid-admin', { role: 'admin' });
    const role = await getUserRole('uid-admin');
    expect(role).toBe('admin');
  });

  it('returns "volunteer" when the user has a volunteers document (not admin)', async () => {
    seedDoc('volunteers', 'uid-vol', { role: 'volunteer' });
    const role = await getUserRole('uid-vol');
    expect(role).toBe('volunteer');
  });

  it('returns "fan" when the user has a fans document (not admin/volunteer)', async () => {
    seedDoc('fans', 'uid-fan', { role: 'fan' });
    const role = await getUserRole('uid-fan');
    expect(role).toBe('fan');
  });

  it('returns null when the user has no document in any collection', async () => {
    const role = await getUserRole('uid-nobody');
    expect(role).toBeNull();
  });
});

// ── updateLastLogin ───────────────────────────────────────────────────────────

describe('updateLastLogin', () => {
  it('calls updateDoc with a serverTimestamp for an admin', async () => {
    await updateLastLogin('uid-admin', 'admin');
    expect(mockUpdateDoc).toHaveBeenCalledOnce();
    const [, data] = mockUpdateDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.lastLogin).toBeDefined();
  });

  it('calls updateDoc with a serverTimestamp for a volunteer', async () => {
    await updateLastLogin('uid-vol', 'volunteer');
    expect(mockUpdateDoc).toHaveBeenCalledOnce();
  });

  it('calls updateDoc with a serverTimestamp for a fan', async () => {
    await updateLastLogin('uid-fan', 'fan');
    expect(mockUpdateDoc).toHaveBeenCalledOnce();
  });

  it('does not throw even when updateDoc rejects (non-critical path)', async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    await expect(updateLastLogin('uid-any', 'fan')).resolves.toBeUndefined();
  });
});
