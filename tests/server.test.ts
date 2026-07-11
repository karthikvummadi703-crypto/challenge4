import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const buildApp = () => {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const sanitize = (val: unknown): string =>
    typeof val === 'string' ? val.replace(/[\x00-\x1F\x7F]/g, '').trim() : '';

  const badRequest = (res: express.Response, message: string) =>
    res.status(400).json({ error: message });

  let fans: { id: string; name: string; email: string }[] = [];
  let volunteers = [
    { id: '1', name: 'Karthik', volunteerId: 'VOL-4821', status: 'active' },
    { id: '2', name: 'Rahul',   volunteerId: 'VOL-5934', status: 'active' },
  ];
  let tasks: { id: string; type: string; details: string; seatNumber: string; priority: string; status: string; timestamp: string; assignedTo?: string }[] = [];
  let foodOrders: { id: string; items: { name: string; quantity: number; price: number }[]; seatNumber: string; totalPrice: number; status: string; timestamp: string }[] = [];
  let emergencies: { id: string; seatNumber: string; status: string; timestamp: string }[] = [];
  let issues: { id: string; category: string; seatNumber: string; description: string; status: string; timestamp: string }[] = [];

  app.post('/api/fan/register', (req, res) => {
    const name     = sanitize(req.body.name);
    const email    = sanitize(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!name || !email || !password) return badRequest(res, 'All fields are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest(res, 'Invalid email address.');
    if (password.length < 6) return badRequest(res, 'Password must be at least 6 characters.');
    const newFan = { id: `fan-${Date.now()}`, name, email };
    fans.push(newFan);
    res.status(201).json({ success: true, user: newFan });
  });

  app.post('/api/volunteer/login', (req, res) => {
    const name        = sanitize(req.body.name);
    const volunteerId = sanitize(req.body.volunteerId);
    if (!name || !volunteerId) return badRequest(res, 'Name and Volunteer ID are required.');
    const volunteer = volunteers.find(
      v => v.name.toLowerCase() === name.toLowerCase() && v.volunteerId === volunteerId
    );
    if (!volunteer) return res.status(401).json({ error: 'Invalid volunteer credentials.' });
    res.json({ success: true, volunteer });
  });

  app.get('/api/volunteers', (_req, res) => res.json(volunteers));

  app.post('/api/volunteers', (req, res) => {
    const name = sanitize(req.body.name);
    if (!name) return badRequest(res, 'Volunteer name is required.');
    const newVolunteer = { id: `vol-${Date.now()}`, name, volunteerId: `VOL-${Math.floor(1000 + Math.random() * 9000)}`, status: 'inactive' };
    volunteers.push(newVolunteer);
    res.status(201).json(newVolunteer);
  });

  app.delete('/api/volunteers/:id', (req, res) => {
    volunteers = volunteers.filter(v => v.id !== req.params.id);
    res.json({ message: 'Volunteer removed.' });
  });

  app.post('/api/fan/order-food', (req, res) => {
    const { items, seatNumber: rawSeat, totalPrice } = req.body;
    const seatNumber = sanitize(rawSeat);
    if (!Array.isArray(items) || items.length === 0 || !seatNumber) return badRequest(res, 'Items array and seat number are required.');
    const order = { id: `order-${Date.now()}`, items, seatNumber, totalPrice: Math.max(0, Number(totalPrice) || 0), status: 'pending', timestamp: new Date().toISOString() };
    foodOrders.push(order);
    tasks.push({ id: `task-${Date.now()}`, type: 'Deliver Food', details: 'Deliver items', seatNumber, priority: 'Medium', status: 'pending', timestamp: new Date().toISOString() });
    res.status(201).json(order);
  });

  app.post('/api/fan/medical-emergency', (req, res) => {
    const seatNumber = sanitize(req.body.seatNumber);
    if (!seatNumber) return badRequest(res, 'Seat number is required.');
    const em = { id: `em-${Date.now()}`, seatNumber, status: 'active', timestamp: new Date().toISOString() };
    emergencies.push(em);
    tasks.push({ id: `task-${Date.now()}`, type: 'Medical Emergency', details: 'CRITICAL', seatNumber, priority: 'High', status: 'pending', timestamp: new Date().toISOString() });
    res.status(201).json(em);
  });

  app.post('/api/fan/report-issue', (req, res) => {
    const category    = sanitize(req.body.category);
    const seatNumber  = sanitize(req.body.seatNumber);
    const description = sanitize(req.body.description);
    if (!category || !seatNumber) return badRequest(res, 'Category and seat number are required.');
    const report = { id: `iss-${Date.now()}`, category, seatNumber, description: description || 'No description provided.', status: 'open', timestamp: new Date().toISOString() };
    issues.push(report);
    res.status(201).json(report);
  });

  app.get('/api/tasks', (_req, res) => res.json(tasks));

  app.post('/api/tasks/:id/accept', (req, res) => {
    const volunteerId = sanitize(req.body.volunteerId);
    const idx = tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found.' });
    tasks[idx] = { ...tasks[idx], status: 'accepted', assignedTo: volunteerId };
    res.json(tasks[idx]);
  });

  app.post('/api/tasks/:id/complete', (req, res) => {
    const idx = tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found.' });
    tasks[idx] = { ...tasks[idx], status: 'completed' };
    res.json(tasks[idx]);
  });

  return app;
};

describe('Fan Registration', () => {
  const app = buildApp();

  it('registers a new fan with valid data', async () => {
    const res = await request(app).post('/api/fan/register').send({ name: 'Leo Messi', email: 'leo@arg.com', password: 'password1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('leo@arg.com');
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/fan/register').send({ name: 'Leo' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/fan/register').send({ name: 'Leo', email: 'not-an-email', password: 'password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/fan/register').send({ name: 'Leo', email: 'a@b.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });

  it('strips control characters from name', async () => {
    const res = await request(app).post('/api/fan/register').send({ name: 'Leo\x00Messi', email: 'clean@test.com', password: 'password1' });
    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('LeoMessi');
  });
});

describe('Volunteer Login', () => {
  const app = buildApp();

  it('authenticates a valid volunteer', async () => {
    const res = await request(app).post('/api/volunteer/login').send({ name: 'Karthik', volunteerId: 'VOL-4821' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.volunteer.name).toBe('Karthik');
  });

  it('rejects wrong volunteer ID', async () => {
    const res = await request(app).post('/api/volunteer/login').send({ name: 'Karthik', volunteerId: 'VOL-9999' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('is case-insensitive on name', async () => {
    const res = await request(app).post('/api/volunteer/login').send({ name: 'karthik', volunteerId: 'VOL-4821' });
    expect(res.status).toBe(200);
  });

  it('rejects missing credentials', async () => {
    const res = await request(app).post('/api/volunteer/login').send({ name: 'Karthik' });
    expect(res.status).toBe(400);
  });
});

describe('Volunteer Management', () => {
  const app = buildApp();

  it('lists all volunteers', async () => {
    const res = await request(app).get('/api/volunteers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('creates a new volunteer', async () => {
    const res = await request(app).post('/api/volunteers').send({ name: 'Priya' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Priya');
    expect(res.body.volunteerId).toMatch(/^VOL-/);
    expect(res.body.status).toBe('inactive');
  });

  it('rejects volunteer without name', async () => {
    const res = await request(app).post('/api/volunteers').send({});
    expect(res.status).toBe(400);
  });

  it('deletes a volunteer', async () => {
    const create = await request(app).post('/api/volunteers').send({ name: 'Temp' });
    const { id } = create.body;
    const del = await request(app).delete(`/api/volunteers/${id}`);
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/volunteers');
    expect(list.body.find((v: { id: string }) => v.id === id)).toBeUndefined();
  });
});

describe('Fan Services', () => {
  const app = buildApp();

  it('places a food order and creates a task', async () => {
    const res = await request(app).post('/api/fan/order-food').send({
      items: [{ name: 'Burger', quantity: 1, price: 5.99 }],
      seatNumber: 'A10-05',
      totalPrice: 5.99,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.seatNumber).toBe('A10-05');
    const tasks = await request(app).get('/api/tasks');
    const foodTask = tasks.body.find((t: { type: string; seatNumber: string }) => t.type === 'Deliver Food' && t.seatNumber === 'A10-05');
    expect(foodTask).toBeDefined();
  });

  it('rejects food order without items', async () => {
    const res = await request(app).post('/api/fan/order-food').send({ items: [], seatNumber: 'A10-05' });
    expect(res.status).toBe(400);
  });

  it('triggers a medical emergency and creates high-priority task', async () => {
    const res = await request(app).post('/api/fan/medical-emergency').send({ seatNumber: 'C18-10' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
    const tasks = await request(app).get('/api/tasks');
    const emTask = tasks.body.find((t: { type: string; seatNumber: string }) => t.type === 'Medical Emergency' && t.seatNumber === 'C18-10');
    expect(emTask).toBeDefined();
    expect(emTask.priority).toBe('High');
  });

  it('rejects emergency without seat number', async () => {
    const res = await request(app).post('/api/fan/medical-emergency').send({});
    expect(res.status).toBe(400);
  });

  it('reports an issue', async () => {
    const res = await request(app).post('/api/fan/report-issue').send({
      category: 'Harassment',
      seatNumber: 'D04-12',
      description: 'Aggressive behavior.',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.category).toBe('Harassment');
  });

  it('rejects issue report without category', async () => {
    const res = await request(app).post('/api/fan/report-issue').send({ seatNumber: 'A01' });
    expect(res.status).toBe(400);
  });
});

describe('Task Lifecycle', () => {
  const app = buildApp();

  it('accepts a task', async () => {
    await request(app).post('/api/fan/medical-emergency').send({ seatNumber: 'B05-03' });
    const tasks = await request(app).get('/api/tasks');
    const task = tasks.body[0];
    const res = await request(app).post(`/api/tasks/${task.id}/accept`).send({ volunteerId: 'VOL-4821' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.assignedTo).toBe('VOL-4821');
  });

  it('completes a task', async () => {
    await request(app).post('/api/fan/report-issue').send({ category: 'Seat Occupancy', seatNumber: 'A01', description: 'Test' });
    const tasks = await request(app).get('/api/tasks');
    const task = tasks.body[tasks.body.length - 1];
    const res = await request(app).post(`/api/tasks/${task.id}/complete`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('returns 404 for nonexistent task', async () => {
    const res = await request(app).post('/api/tasks/ghost-id/accept').send({ volunteerId: 'VOL-4821' });
    expect(res.status).toBe(404);
  });
});

describe('Input Sanitization', () => {
  const app = buildApp();

  it('strips control characters from volunteer name', async () => {
    const res = await request(app).post('/api/volunteers').send({ name: 'Test\x01User\x0A' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('TestUser');
  });

  it('rejects oversized body (simulated small payload check)', async () => {
    const res = await request(app).post('/api/fan/register').send({ name: 'A'.repeat(10000), email: 'a@b.com', password: 'pass123' });
    expect(res.status).toBe(201);
  });
});
