import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import {
  Match, Volunteer, Task, FoodOrder, MedicalEmergency, IssueReport
} from './src/types';

dotenv.config();

const app = express();
const PORT = 5000;
const isDev = process.env.NODE_ENV !== 'production';

// ── Security headers ─────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;");
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

/** Strict limiter for auth endpoints — 10 attempts per 15 min per IP */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

/** General API limiter — 120 requests per minute per IP */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/fan/register', authLimiter);
app.use('/api/volunteer/login', authLimiter);
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '64kb' }));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strips control characters and trims whitespace from a string. */
const sanitize = (val: unknown): string =>
  typeof val === 'string' ? val.replace(/[\x00-\x1F\x7F]/g, '').trim() : '';

/** Returns 400 with a consistent error shape. */
const badRequest = (res: Response, message: string) =>
  res.status(400).json({ error: message });

// ── In-memory store ───────────────────────────────────────────────────────────

let matches: Match[] = [
  {
    id: 'match-2026-1',
    stadiumName: 'Mercedes-Benz Stadium',
    matchName: 'Portugal vs Argentina',
    matchDate: '18/07/2026',
    matchTime: '07:30 PM',
    ticketPrice: 120,
    published: true,
  },
];

let volunteers: Volunteer[] = [
  { id: '1', name: 'Karthik',  volunteerId: 'VOL-4821', status: 'active' },
  { id: '2', name: 'Rahul',    volunteerId: 'VOL-5934', status: 'active' },
  { id: '3', name: 'Priya',    volunteerId: 'VOL-8102', status: 'active' },
  { id: '4', name: 'John',     volunteerId: 'VOL-2647', status: 'active' },
  { id: '5', name: 'Ananya',   volunteerId: 'VOL-9913', status: 'active' },
];

let tasks: Task[] = [
  { id: 'task-1', type: 'Deliver Food',       details: 'Deliver Veg Burger and 1 Coke',                     seatNumber: 'A12-24', priority: 'High',   status: 'pending', timestamp: new Date().toISOString() },
  { id: 'task-2', type: 'Medical Emergency',  details: 'Medical Emergency assistance – severe chest pain',   seatNumber: 'C18-10', priority: 'High',   status: 'pending', timestamp: new Date().toISOString() },
  { id: 'task-3', type: 'Complaint Resolution', details: 'Seat Occupancy Report – double booking',           seatNumber: 'C07-18', priority: 'Medium', status: 'pending', timestamp: new Date().toISOString() },
];

let foodOrders: FoodOrder[] = [
  { id: 'order-1', items: [{ name: 'Veg Burger', quantity: 1, price: 6.99 }, { name: 'Coke', quantity: 1, price: 2.49 }], seatNumber: 'A12-24', totalPrice: 9.48,  status: 'pending',   timestamp: new Date().toISOString() },
  { id: 'order-2', items: [{ name: 'French Fries', quantity: 2, price: 3.49 }],                                            seatNumber: 'B15-10', totalPrice: 6.98,  status: 'delivered', timestamp: new Date().toISOString() },
];

let emergencies: MedicalEmergency[] = [
  { id: 'em-1', seatNumber: 'C18-10', status: 'active',   timestamp: new Date().toISOString() },
  { id: 'em-2', seatNumber: 'B15-15', status: 'resolved', timestamp: new Date().toISOString() },
];

let issues: IssueReport[] = [
  { id: 'iss-1', category: 'Seat Occupancy', seatNumber: 'C07-18',    description: 'Unoccupied ticket holder has occupied seat C07-18.', status: 'open', timestamp: new Date().toISOString() },
  { id: 'iss-2', category: 'Dirty Washroom', seatNumber: 'Section A', description: 'Washroom in Sector A has a leakage.',                status: 'open', timestamp: new Date().toISOString() },
  { id: 'iss-3', category: 'Harassment',     seatNumber: 'Section D', description: 'Aggressive behavior reported in Row 4.',            status: 'open', timestamp: new Date().toISOString() },
];

let fans: { id: string; name: string; email: string }[] = [];

let config = {
  n8nWebhookUrl:      process.env.N8N_WEBHOOK_URL        || process.env.VITE_N8N_WEBHOOK_PRODUCTION_URL || '',
  n8nAiAssistantUrl:  process.env.N8N_AI_ASSISTANT_URL   || '',
  useMockAI: true,
};

// ── Config ────────────────────────────────────────────────────────────────────

app.get('/api/config', (_req, res) => res.json(config));

app.post('/api/config', (req: Request, res: Response) => {
  const { n8nWebhookUrl, n8nAiAssistantUrl, useMockAI } = req.body;
  if (n8nWebhookUrl !== undefined)     config.n8nWebhookUrl     = sanitize(n8nWebhookUrl);
  if (n8nAiAssistantUrl !== undefined) config.n8nAiAssistantUrl = sanitize(n8nAiAssistantUrl);
  if (useMockAI !== undefined)         config.useMockAI         = Boolean(useMockAI);
  res.json({ message: 'Configuration updated.', config });
});

// ── Matches ───────────────────────────────────────────────────────────────────

app.get('/api/matches', (_req, res) => res.json(matches));

app.post('/api/matches', (req: Request, res: Response) => {
  const stadiumName = sanitize(req.body.stadiumName);
  const matchName   = sanitize(req.body.matchName);
  const matchDate   = sanitize(req.body.matchDate);
  const matchTime   = sanitize(req.body.matchTime);
  const ticketPrice = Number(req.body.ticketPrice);

  if (!stadiumName || !matchName || !matchDate || !matchTime || isNaN(ticketPrice) || ticketPrice < 0) {
    return badRequest(res, 'All match fields are required and ticket price must be a positive number.');
  }

  const newMatch: Match = {
    id: `match-${Date.now()}`,
    stadiumName,
    matchName,
    matchDate,
    matchTime,
    ticketPrice,
    published: false,
  };
  matches.push(newMatch);
  res.status(201).json(newMatch);
});

// ── Volunteers ────────────────────────────────────────────────────────────────

app.get('/api/volunteers', (_req, res) => res.json(volunteers));

app.post('/api/volunteers', (req: Request, res: Response) => {
  const name = sanitize(req.body.name);
  if (!name) return badRequest(res, 'Volunteer name is required.');

  let volunteerId = '';
  let attempts = 0;
  do {
    volunteerId = `VOL-${Math.floor(1000 + Math.random() * 9000)}`;
    attempts++;
  } while (volunteers.some(v => v.volunteerId === volunteerId) && attempts < 100);

  const newVolunteer: Volunteer = {
    id: `vol-${Date.now()}`,
    name,
    volunteerId,
    status: 'inactive',
  };
  volunteers.push(newVolunteer);
  res.status(201).json(newVolunteer);
});

app.delete('/api/volunteers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  volunteers = volunteers.filter(v => v.id !== id);
  res.json({ message: 'Volunteer removed.' });
});

// ── Publish ───────────────────────────────────────────────────────────────────

app.post('/api/publish', (_req, res) => {
  matches    = matches.map(m => ({ ...m, published: true }));
  volunteers = volunteers.map(v => ({ ...v, status: 'active' }));
  res.json({ message: 'Event published. Matches are live and volunteers are active.', matches, volunteers });
});

// ── Volunteer auth ────────────────────────────────────────────────────────────

app.post('/api/volunteer/login', (req: Request, res: Response) => {
  const name        = sanitize(req.body.name);
  const volunteerId = sanitize(req.body.volunteerId);

  if (!name || !volunteerId) {
    return badRequest(res, 'Name and Volunteer ID are required.');
  }

  const volunteer = volunteers.find(
    v => v.name.toLowerCase() === name.toLowerCase() && v.volunteerId === volunteerId
  );

  if (!volunteer) {
    return res.status(401).json({ error: 'Invalid volunteer credentials.' });
  }

  res.json({ success: true, volunteer });
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

app.get('/api/tasks', (_req, res) => res.json(tasks));

app.post('/api/tasks/:id/accept', (req: Request, res: Response) => {
  const { id } = req.params;
  const volunteerId = sanitize(req.body.volunteerId);

  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found.' });

  tasks[idx] = { ...tasks[idx], status: 'accepted', assignedTo: volunteerId };
  res.json(tasks[idx]);
});

app.post('/api/tasks/:id/complete', (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found.' });

  tasks[idx] = { ...tasks[idx], status: 'completed' };

  const { seatNumber, type } = tasks[idx];
  if (type === 'Deliver Food') {
    const order = foodOrders.find(o => o.seatNumber === seatNumber && o.status !== 'delivered');
    if (order) order.status = 'delivered';
  } else if (type === 'Medical Emergency') {
    const em = emergencies.find(e => e.seatNumber === seatNumber && e.status !== 'resolved');
    if (em) em.status = 'resolved';
  } else if (type === 'Complaint Resolution' || type === 'Seat Issue') {
    const issue = issues.find(i => i.seatNumber === seatNumber && i.status !== 'resolved');
    if (issue) issue.status = 'resolved';
  }

  res.json(tasks[idx]);
});

// ── Fan ───────────────────────────────────────────────────────────────────────

app.post('/api/fan/register', (req: Request, res: Response) => {
  const name     = sanitize(req.body.name);
  const email    = sanitize(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || !email || !password) {
    return badRequest(res, 'All fields are required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest(res, 'Invalid email address.');
  }
  if (password.length < 6) {
    return badRequest(res, 'Password must be at least 6 characters.');
  }

  const newFan = { id: `fan-${Date.now()}`, name, email };
  fans.push(newFan);
  res.status(201).json({ success: true, user: newFan });
});

// ── Fan services ──────────────────────────────────────────────────────────────

app.post('/api/fan/order-food', (req: Request, res: Response) => {
  const { items, seatNumber: rawSeat, totalPrice } = req.body;
  const seatNumber = sanitize(rawSeat);

  if (!Array.isArray(items) || items.length === 0 || !seatNumber) {
    return badRequest(res, 'Items array and seat number are required.');
  }

  const newOrder: FoodOrder = {
    id: `order-${Date.now()}`,
    items,
    seatNumber,
    totalPrice: Math.max(0, Number(totalPrice) || 0),
    status: 'pending',
    timestamp: new Date().toISOString(),
  };
  foodOrders.push(newOrder);

  const taskDetails = items
    .map((i: any) => `${sanitize(i.name)} (x${Number(i.quantity) || 1})`)
    .join(', ');

  tasks.push({
    id: `task-${Date.now()}`,
    type: 'Deliver Food',
    details: `Deliver ${taskDetails}`,
    seatNumber,
    priority: 'Medium',
    status: 'pending',
    timestamp: new Date().toISOString(),
  });

  res.status(201).json(newOrder);
});

app.post('/api/fan/medical-emergency', (req: Request, res: Response) => {
  const seatNumber = sanitize(req.body.seatNumber);
  if (!seatNumber) return badRequest(res, 'Seat number is required.');

  const newEmergency: MedicalEmergency = {
    id: `em-${Date.now()}`,
    seatNumber,
    status: 'active',
    timestamp: new Date().toISOString(),
  };
  emergencies.push(newEmergency);

  tasks.push({
    id: `task-${Date.now()}`,
    type: 'Medical Emergency',
    details: 'CRITICAL: First Responder assistance requested.',
    seatNumber,
    priority: 'High',
    status: 'pending',
    timestamp: new Date().toISOString(),
  });

  res.status(201).json(newEmergency);
});

app.post('/api/fan/report-issue', (req: Request, res: Response) => {
  const category    = sanitize(req.body.category);
  const seatNumber  = sanitize(req.body.seatNumber);
  const description = sanitize(req.body.description);

  if (!category || !seatNumber) {
    return badRequest(res, 'Category and seat number are required.');
  }

  const newReport: IssueReport = {
    id: `iss-${Date.now()}`,
    category: category as IssueReport['category'],
    seatNumber,
    description: description || 'No description provided.',
    status: 'open',
    timestamp: new Date().toISOString(),
  };
  issues.push(newReport);

  tasks.push({
    id: `task-${Date.now()}`,
    type: 'Complaint Resolution',
    details: `${category} — ${description || 'No detail'}`,
    seatNumber,
    priority: category === 'Harassment' ? 'High' : 'Medium',
    status: 'pending',
    timestamp: new Date().toISOString(),
  });

  res.status(201).json(newReport);
});

// ── Organizer stats ───────────────────────────────────────────────────────────

app.get('/api/organizer/stats', (_req, res) => {
  const recentAlerts = [
    ...emergencies.filter(e => e.status === 'active').map(e => ({
      id: e.id, type: 'medical', text: `Medical Assistance at Seat ${e.seatNumber}`,
      time: 'Just now', priority: 'critical',
    })),
    ...issues.filter(i => i.status === 'open').map(i => ({
      id: i.id, type: 'issue', text: `${i.category} Report at ${i.seatNumber}`,
      time: '2 mins ago', priority: i.category === 'Harassment' ? 'critical' : 'warning',
    })),
    ...foodOrders.filter(o => o.status === 'pending').map(o => ({
      id: o.id, type: 'food', text: `Pending Food Delivery for Seat ${o.seatNumber}`,
      time: '5 mins ago', priority: 'normal',
    })),
  ];

  res.json({
    volunteers: {
      total: volunteers.length,
      active: volunteers.filter(v => v.status === 'active').length,
    },
    foodOrders: {
      total: foodOrders.length,
      pending:   foodOrders.filter(o => o.status === 'pending').length,
      delivered: foodOrders.filter(o => o.status === 'delivered').length,
    },
    issues: {
      total: issues.length,
      open:  issues.filter(i => i.status === 'open').length,
    },
    emergencies: {
      active: emergencies.filter(e => e.status === 'active').length,
      total:  emergencies.length,
    },
    attendance: 48_567,
    recentAlerts: recentAlerts.slice(0, 6),
  });
});

// ── AI command ────────────────────────────────────────────────────────────────

app.post('/api/ai/command', async (req: Request, res: Response) => {
  const text = sanitize(req.body.text);
  if (!text) return badRequest(res, 'Command string is required.');

  // Forward to n8n webhook if configured
  if (config.n8nAiAssistantUrl.trim()) {
    try {
      const upstream = await fetch(config.n8nAiAssistantUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            volunteersCount:    volunteers.length,
            foodOrdersCount:    foodOrders.length,
            pendingOrdersCount: foodOrders.filter(o => o.status === 'pending').length,
            issuesCount:        issues.length,
            openIssuesCount:    issues.filter(i => i.status === 'open').length,
            emergenciesCount:   emergencies.filter(e => e.status === 'active').length,
            attendance: 48_567,
          },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        const aiResponse = data.output || data.text || data.response || JSON.stringify(data);
        return res.json({ response: aiResponse, source: 'n8n Webhook' });
      }
      console.warn('[Nexus] n8n returned non-OK status; falling back to local engine.');
    } catch (err) {
      console.warn('[Nexus] n8n unreachable; falling back to local engine.', err);
    }
  }

  // ── Local rule-based engine ──────────────────────────────────────────────
  const q = text.toLowerCase();
  const pendingOrders      = foodOrders.filter(o => o.status === 'pending').length;
  const openIssues         = issues.filter(i => i.status === 'open').length;
  const activeEmergencies  = emergencies.filter(e => e.status === 'active');
  const activeVolunteers   = volunteers.filter(v => v.status === 'active').length;
  const busyVolunteers     = tasks.filter(t => t.status === 'accepted').length;

  let responseText = '';

  if (q.includes('incident') || q.includes('issue') || q.includes('summarize')) {
    const open = issues.filter(i => i.status === 'open');
    responseText = `**Stadium Incident Summary**: ${issues.length} total issues — **${open.length} open**.
- Seat Occupancy: ${open.filter(i => i.category === 'Seat Occupancy').length} unresolved.
- Dirty Washrooms: ${open.filter(i => i.category === 'Dirty Washroom').length} cleaning tickets.
- Harassment: ${open.filter(i => i.category === 'Harassment').length} critical incidents.
*All open issues have been dispatched to the Volunteer Live Task Stack.*`;
  } else if (q.includes('food') || q.includes('order') || q.includes('hungry')) {
    responseText = `**Food Logistics Report**:
- Total Orders: ${foodOrders.length}
- Pending Deliveries: ${pendingOrders}
- Delivered: ${foodOrders.filter(o => o.status === 'delivered').length}
- Avg delivery time: **8.4 min** across all sectors.`;
  } else if (q.includes('gate') || q.includes('congested') || q.includes('crowd')) {
    responseText = `**Gate Ingress Analysis**:
- Gate C (High): ~14 min delay.
- Gate A (Moderate): ~6 min delay.
- Gate B & D (Optimal): <2 min delay.
*Recommendation: Reroute North transit fans to Gate B via digital signage.*`;
  } else if (q.includes('volunteer') || q.includes('available') || q.includes('staff')) {
    responseText = `**Volunteer Deployment Matrix**:
- Active: ${activeVolunteers} volunteers synchronized.
- Available: ${Math.max(0, activeVolunteers - busyVolunteers)} on standby.
- Assigned: ${busyVolunteers} handling active tasks.
*SLA compliance: 91% on high-priority alerts this hour.*`;
  } else if (q.includes('medical') || q.includes('emergency')) {
    if (activeEmergencies.length === 0) {
      responseText = '**Medical Safety Dashboard**: ✓ Zero active medical emergencies. All cases resolved.';
    } else {
      responseText = `**Medical Emergency Alert**: ${activeEmergencies.length} active case(s):\n${activeEmergencies.map((e, i) => `${i + 1}. **Seat ${e.seatNumber}** — Paramedics dispatched (PRIORITY: HIGH)`).join('\n')}\n*Average response time: 2.4 min.*`;
    }
  } else if (q.includes('hello') || q.includes('hi') || q.includes('who are you')) {
    responseText = `Hello! I am **Nexus AI**, the Stadium Intelligence Assistant for FIFA World Cup 2026.
Try: *"Summarize today's incidents"*, *"Food orders pending?"*, *"Which gate is congested?"*, *"Available volunteers?"*`;
  } else {
    responseText = `**Nexus Telemetry** (Attendance: 48,567):
- Food queue: **${pendingOrders} pending** orders.
- Open issues: **${openIssues} tickets**.
- Medical: **${activeEmergencies.length} active** cases being handled.

Ask me about incidents, volunteers, gate congestion, or food logistics.`;
  }

  res.json({ response: responseText, source: 'Nexus Local Engine' });
});

// ── Vite / static serving ─────────────────────────────────────────────────────

async function startServer() {
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) =>
      res.sendFile(path.join(distPath, 'index.html'))
    );
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nexus Server] running on http://localhost:${PORT}`);
  });
}

startServer();
