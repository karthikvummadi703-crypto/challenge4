/**
 * Runtime validation tests for domain types defined in src/types.ts.
 *
 * TypeScript's structural typing is erased at runtime, so these tests
 * verify that the shapes we actually receive from the data layer (Firestore
 * docs / demo store) satisfy the contracts we rely on throughout the UI.
 */
import { describe, it, expect } from 'vitest';
import type {
  Match,
  Volunteer,
  Task,
  FoodOrder,
  MedicalEmergency,
  IssueReport,
  ChatMessage,
  StadiumAlert,
  OrderedItem,
} from '../src/types';

// ── Type-guard helpers (mirror the implicit constraints in types.ts) ───────────

function isMatch(obj: unknown): obj is Match {
  const o = obj as Partial<Match>;
  return (
    typeof o?.id === 'string' &&
    typeof o?.stadiumName === 'string' &&
    typeof o?.matchName === 'string' &&
    typeof o?.matchDate === 'string' &&
    typeof o?.matchTime === 'string' &&
    typeof o?.ticketPrice === 'number' &&
    typeof o?.published === 'boolean'
  );
}

function isVolunteer(obj: unknown): obj is Volunteer {
  const o = obj as Partial<Volunteer>;
  return (
    typeof o?.id === 'string' &&
    typeof o?.name === 'string' &&
    typeof o?.volunteerId === 'string' &&
    (o?.status === 'active' || o?.status === 'inactive')
  );
}

function isTask(obj: unknown): obj is Task {
  const o = obj as Partial<Task>;
  return (
    typeof o?.id === 'string' &&
    typeof o?.type === 'string' &&
    typeof o?.details === 'string' &&
    typeof o?.seatNumber === 'string' &&
    typeof o?.priority === 'string' &&
    typeof o?.status === 'string' &&
    typeof o?.timestamp === 'string'
  );
}

function isFoodOrder(obj: unknown): obj is FoodOrder {
  const o = obj as Partial<FoodOrder>;
  return (
    typeof o?.id === 'string' &&
    Array.isArray(o?.items) &&
    typeof o?.seatNumber === 'string' &&
    typeof o?.totalPrice === 'number' &&
    typeof o?.timestamp === 'string'
  );
}

function isMedicalEmergency(obj: unknown): obj is MedicalEmergency {
  const o = obj as Partial<MedicalEmergency>;
  return (
    typeof o?.id === 'string' &&
    typeof o?.seatNumber === 'string' &&
    (o?.status === 'active' || o?.status === 'resolved') &&
    typeof o?.timestamp === 'string'
  );
}

function isIssueReport(obj: unknown): obj is IssueReport {
  const o = obj as Partial<IssueReport>;
  return (
    typeof o?.id === 'string' &&
    typeof o?.category === 'string' &&
    typeof o?.seatNumber === 'string' &&
    typeof o?.description === 'string' &&
    (o?.status === 'open' || o?.status === 'resolved') &&
    typeof o?.timestamp === 'string'
  );
}

function isChatMessage(obj: unknown): obj is ChatMessage {
  const o = obj as Partial<ChatMessage>;
  return (
    typeof o?.id === 'string' &&
    (o?.sender === 'user' || o?.sender === 'ai') &&
    typeof o?.text === 'string' &&
    typeof o?.timestamp === 'string'
  );
}

function isStadiumAlert(obj: unknown): obj is StadiumAlert {
  const o = obj as Partial<StadiumAlert>;
  return (
    typeof o?.id === 'string' &&
    typeof o?.type === 'string' &&
    typeof o?.message === 'string' &&
    typeof o?.timestamp === 'string'
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Match type guard', () => {
  it('accepts a valid Match', () => {
    const m: Match = {
      id: '1', stadiumName: 'Azteca', matchName: 'BRA vs ARG',
      matchDate: '2026-07-14', matchTime: '20:00',
      ticketPrice: 150, published: true,
    };
    expect(isMatch(m)).toBe(true);
  });

  it('accepts a Match with an optional image', () => {
    const m: Match = {
      id: '2', stadiumName: 'MetLife', matchName: 'USA vs MEX',
      matchDate: '2026-07-10', matchTime: '18:00',
      ticketPrice: 200, published: false, image: 'https://example.com/img.jpg',
    };
    expect(isMatch(m)).toBe(true);
  });

  it('rejects an object missing required fields', () => {
    expect(isMatch({ id: '1', stadiumName: 'X' })).toBe(false);
  });

  it('rejects null', () => {
    expect(isMatch(null)).toBe(false);
  });
});

describe('Volunteer type guard', () => {
  it('accepts an active volunteer', () => {
    const v: Volunteer = { id: 'v1', name: 'Alice', volunteerId: 'VOL-001', status: 'active' };
    expect(isVolunteer(v)).toBe(true);
  });

  it('accepts an inactive volunteer', () => {
    const v: Volunteer = { id: 'v2', name: 'Bob', volunteerId: 'VOL-002', status: 'inactive' };
    expect(isVolunteer(v)).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(isVolunteer({ id: 'v3', name: 'C', volunteerId: 'VOL-003', status: 'suspended' })).toBe(false);
  });
});

describe('Task type guard', () => {
  const validTask: Task = {
    id: 't1', type: 'Deliver Food', details: 'Row 12', seatNumber: 'A-10',
    priority: 'High', status: 'pending', timestamp: new Date().toISOString(),
  };

  it('accepts a valid task', () => {
    expect(isTask(validTask)).toBe(true);
  });

  it('accepts a task with an optional assignedTo', () => {
    expect(isTask({ ...validTask, assignedTo: 'VOL-001' })).toBe(true);
  });

  it('accepts a task with an optional linkedId', () => {
    expect(isTask({ ...validTask, linkedId: 'order-123' })).toBe(true);
  });

  it('rejects a task missing timestamp', () => {
    const { timestamp: _t, ...noTimestamp } = validTask;
    expect(isTask(noTimestamp)).toBe(false);
  });
});

describe('FoodOrder type guard', () => {
  const orderedItem: OrderedItem = { name: 'Hot Dog', quantity: 2, price: 8 };

  it('accepts a valid food order', () => {
    const order: FoodOrder = {
      id: 'fo1', items: [orderedItem], seatNumber: 'B-7',
      totalPrice: 16, status: 'pending', timestamp: '2026-07-14T12:00:00Z',
    };
    expect(isFoodOrder(order)).toBe(true);
  });

  it('accepts an order with zero items', () => {
    const order: FoodOrder = {
      id: 'fo2', items: [], seatNumber: 'C-1',
      totalPrice: 0, status: 'delivered', timestamp: '2026-07-14T12:00:00Z',
    };
    expect(isFoodOrder(order)).toBe(true);
  });
});

describe('MedicalEmergency type guard', () => {
  it('accepts an active emergency', () => {
    const e: MedicalEmergency = { id: 'e1', seatNumber: 'D-3', status: 'active', timestamp: 'now' };
    expect(isMedicalEmergency(e)).toBe(true);
  });

  it('accepts a resolved emergency', () => {
    const e: MedicalEmergency = { id: 'e2', seatNumber: 'D-4', status: 'resolved', timestamp: 'now' };
    expect(isMedicalEmergency(e)).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(isMedicalEmergency({ id: 'e3', seatNumber: 'A-1', status: 'pending', timestamp: 'now' })).toBe(false);
  });
});

describe('IssueReport type guard', () => {
  it('accepts an open issue report', () => {
    const r: IssueReport = {
      id: 'r1', category: 'Broken Seat', seatNumber: 'A-5',
      description: 'Armrest broken', status: 'open', timestamp: 'now',
    };
    expect(isIssueReport(r)).toBe(true);
  });

  it('accepts a resolved issue report', () => {
    const r: IssueReport = {
      id: 'r2', category: 'Other', seatNumber: 'B-9',
      description: 'Noise', status: 'resolved', timestamp: 'now',
    };
    expect(isIssueReport(r)).toBe(true);
  });
});

describe('ChatMessage type guard', () => {
  it('accepts a user message', () => {
    const m: ChatMessage = { id: 'm1', sender: 'user', text: 'Hello', timestamp: 'now' };
    expect(isChatMessage(m)).toBe(true);
  });

  it('accepts an AI message', () => {
    const m: ChatMessage = { id: 'm2', sender: 'ai', text: 'Hi there!', timestamp: 'now' };
    expect(isChatMessage(m)).toBe(true);
  });

  it('rejects an unknown sender', () => {
    expect(isChatMessage({ id: 'm3', sender: 'system', text: 'x', timestamp: 'now' })).toBe(false);
  });
});

describe('StadiumAlert type guard', () => {
  it('accepts a valid alert', () => {
    const a: StadiumAlert = { id: 'a1', type: 'Emergency', message: 'Medical at A-3', timestamp: 'now' };
    expect(isStadiumAlert(a)).toBe(true);
  });

  it('accepts any non-empty type string', () => {
    const a: StadiumAlert = { id: 'a2', type: 'Operational', message: 'Gate B delayed', timestamp: 'now' };
    expect(isStadiumAlert(a)).toBe(true);
  });
});

describe('OrderedItem shape', () => {
  it('matches the expected contract', () => {
    const item: OrderedItem = { name: 'Cola', quantity: 3, price: 4.5 };
    expect(typeof item.name).toBe('string');
    expect(typeof item.quantity).toBe('number');
    expect(typeof item.price).toBe('number');
  });
});
