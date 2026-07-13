import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, requireAdmin, requireAppCheck, getAdminDb, isAdminSdkConfigured, AuthedRequest } from './lib/firebaseAdmin';

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const genAI = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const app = express();
const PORT = 5000;
const isDev = process.env.NODE_ENV !== 'production';

// ── Security headers ─────────────────────────────────────────────────────────
// helmet fills in the headers this app didn't already set by hand (removes
// X-Powered-By, adds X-DNS-Prefetch-Control/X-Download-Options/
// X-Permitted-Cross-Domain-Policies/Cross-Origin-Opener-Policy/
// Origin-Agent-Cluster). Everything helmet would otherwise set that the
// custom middleware below already tailors per dev/prod (CSP, HSTS,
// X-Frame-Options, Referrer-Policy, X-XSS-Protection) is turned off here so
// the two never fight over the same header.
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
  frameguard: false,
  referrerPolicy: false,
  xssFilter: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));
// Per-request CSP nonce. Production script-src drops 'unsafe-inline' and
// only trusts scripts carrying this nonce (see the index.html templating in
// startServer() below, which stamps it onto every <script> tag).
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Locks down powerful browser APIs the app never uses, reducing the blast
  // radius of any future XSS by denying access to camera/mic/geolocation/etc.
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  if (isDev) {
    // Vite's dev-time HMR client relies on eval() for module transforms, so
    // 'unsafe-eval' is scoped to development only and never ships to prod.
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ws: wss: https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;");
  } else {
    // Production bundle is pre-compiled by Vite/esbuild and never calls eval(),
    // so 'unsafe-eval' is dropped here. script-src has no 'unsafe-inline' —
    // only scripts carrying the per-request nonce below are trusted. 'unsafe-inline'
    // on style-src remains for Tailwind's dynamically-applied inline style attributes.
    res.setHeader('Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${res.locals.cspNonce}'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; frame-ancestors 'none';`);
    // HSTS only makes sense once the app is actually served over HTTPS
    // (true for Replit's autoscale deployments) — forces browsers to remember
    // that and never downgrade to plain HTTP for a year.
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

/** General API limiter — 120 requests per minute per IP */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/', apiLimiter);

app.use(express.json({ limit: '64kb' }));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strips control characters and trims whitespace from a string. */
const sanitize = (val: unknown): string =>
  // eslint-disable-next-line no-control-regex -- intentionally stripping control chars from user input
  typeof val === 'string' ? val.replace(/[\x00-\x1F\x7F]/g, '').trim() : '';

/** Returns 400 with a consistent error shape. */
const badRequest = (res: Response, message: string) =>
  res.status(400).json({ error: message });

// ── CSRF ──────────────────────────────────────────────────────────────────────
// This app has no cookie-based session — every authenticated request carries
// its Firebase ID token as an `Authorization: Bearer <token>` header, attached
// client-side in apiClient.ts. A cross-site <form> submission (the classic
// CSRF vector) cannot set a custom Authorization header or an
// application/json body, so the browser can never forge a request that would
// pass `requireAuth`. Traditional CSRF tokens (csurf, double-submit cookie)
// exist to protect cookie-based sessions and don't apply to bearer-token
// APIs — adding one here would protect nothing while adding a second,
// unrelated token to manage.
//
// As defense-in-depth, this middleware still rejects any state-changing
// request that isn't declared as JSON: forcing `Content-Type: application/json`
// means a plain HTML form (which can only send
// application/x-www-form-urlencoded, multipart/form-data, or text/plain)
// can never trigger a "simple request" against these routes without
// tripping a CORS preflight first.
function requireJsonContentType(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json.' });
  }
  next();
}
app.use('/api/', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  return requireJsonContentType(req, res, next);
});

// Non-secret runtime config (n8n URLs). Real app data (matches, volunteers,
// tasks, orders, issues, emergencies) lives in Firestore and is read/written
// directly by the frontend via onSnapshot — there is no in-memory copy here.
const config = {
  n8nWebhookUrl:      process.env.N8N_WEBHOOK_URL        || process.env.VITE_N8N_WEBHOOK_PRODUCTION_URL || '',
  n8nAiAssistantUrl:  process.env.N8N_AI_ASSISTANT_URL   || '',
  useMockAI: true,
};

// ── Telemetry cache (10-second TTL) ──────────────────────────────────────────
// The AI command endpoint calls getStadiumTelemetry on every request. Each
// call fires 4 parallel Firestore reads. Caching for 10 seconds eliminates
// redundant reads under burst traffic without making the data feel stale.
interface TelemetryResult {
  volunteersActive: number; volunteersTotal: number;
  pendingOrders: number;    totalOrders: number;
  openIssues: number;       totalIssues: number;
  activeEmergencies: number;
}
let _telemetryCache: { value: TelemetryResult; expiresAt: number } | null = null;
const TELEMETRY_TTL_MS = 10_000;

/** Live counts from Firestore for AI context — falls back to zeros if Admin SDK isn't configured. */
async function getStadiumTelemetry(): Promise<TelemetryResult> {
  const empty: TelemetryResult = {
    volunteersActive: 0, volunteersTotal: 0,
    pendingOrders: 0, totalOrders: 0,
    openIssues: 0, totalIssues: 0,
    activeEmergencies: 0,
  };
  if (!isAdminSdkConfigured()) return empty;

  // Return cached result if still fresh
  if (_telemetryCache && Date.now() < _telemetryCache.expiresAt) {
    return _telemetryCache.value;
  }

  try {
    const db = getAdminDb();
    const [volSnap, ordersSnap, issuesSnap, emergSnap] = await Promise.all([
      db.collection('volunteers').get(),
      db.collection('foodOrders').get(),
      db.collection('issueReports').get(),
      db.collection('emergencyRequests').get(),
    ]);
    const value: TelemetryResult = {
      volunteersActive: volSnap.docs.filter(d => d.data().active !== false).length,
      volunteersTotal: volSnap.size,
      pendingOrders: ordersSnap.docs.filter(d => d.data().status === 'pending').length,
      totalOrders: ordersSnap.size,
      openIssues: issuesSnap.docs.filter(d => d.data().status === 'open').length,
      totalIssues: issuesSnap.size,
      activeEmergencies: emergSnap.docs.filter(d => d.data().status === 'active').length,
    };
    _telemetryCache = { value, expiresAt: Date.now() + TELEMETRY_TTL_MS };
    return value;
  } catch (err) {
    console.warn('[Nexus] Failed to read live telemetry from Firestore; using zeros.', err);
    return empty;
  }
}

// ── Config (admin-only: exposes internal n8n webhook URLs) ────────────────────

app.get('/api/config', requireAuth, requireAdmin, requireAppCheck, (_req, res) => res.json(config));

app.post('/api/config', requireAuth, requireAdmin, requireAppCheck, (req: Request, res: Response) => {
  const { n8nWebhookUrl, n8nAiAssistantUrl, useMockAI } = req.body;
  const urlPattern = /^https?:\/\/.+/;

  if (n8nWebhookUrl !== undefined) {
    const url = sanitize(n8nWebhookUrl);
    if (url && !urlPattern.test(url)) return badRequest(res, 'n8nWebhookUrl must be a valid HTTP/HTTPS URL.');
    config.n8nWebhookUrl = url;
  }
  if (n8nAiAssistantUrl !== undefined) {
    const url = sanitize(n8nAiAssistantUrl);
    if (url && !urlPattern.test(url)) return badRequest(res, 'n8nAiAssistantUrl must be a valid HTTP/HTTPS URL.');
    config.n8nAiAssistantUrl = url;
  }
  if (useMockAI !== undefined) config.useMockAI = Boolean(useMockAI);
  res.json({ message: 'Configuration updated.', config });
});

interface Telemetry {
  volunteersActive: number;
  volunteersTotal: number;
  pendingOrders: number;
  totalOrders: number;
  openIssues: number;
  totalIssues: number;
  activeEmergencies: number;
}

/**
 * Shared answer pipeline: n8n webhook → Gemini → local rule-based engine.
 * Used by both the real, authenticated `/api/ai/command` (fed live Firestore
 * telemetry) and the unauthenticated `/api/ai/demo-command` (fed sanitized
 * in-memory demo numbers from the client — never real Firestore data).
 */
async function answerStadiumQuestion(text: string, telemetry: Telemetry): Promise<{ response: string; source: string }> {
  // Forward to n8n webhook if configured — n8n is the primary orchestration router
  if (config.n8nAiAssistantUrl.trim()) {
    try {
      const upstream = await fetch(config.n8nAiAssistantUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            volunteersCount:    telemetry.volunteersTotal,
            foodOrdersCount:    telemetry.totalOrders,
            pendingOrdersCount: telemetry.pendingOrders,
            issuesCount:        telemetry.totalIssues,
            openIssuesCount:    telemetry.openIssues,
            emergenciesCount:   telemetry.activeEmergencies,
            attendance: 48_567,
          },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        const aiResponse = data.output || data.text || data.response || JSON.stringify(data);
        return { response: aiResponse, source: 'n8n Webhook' };
      }
      console.warn('[Nexus] n8n returned non-OK status; falling back to Gemini.');
    } catch (err) {
      console.warn('[Nexus] n8n unreachable; falling back to Gemini.', err);
    }
  }

  // ── Gemini AI (direct) ────────────────────────────────────────────────────
  // Used when n8n is unconfigured/unreachable — gives genuine generative answers
  // instead of the canned rule-based responses below.
  if (genAI) {
    try {
      const stadiumContext = `You are Nexus AI, the stadium intelligence assistant for a FIFA World Cup 2026 venue.
Current live telemetry:
- Volunteers: ${telemetry.volunteersActive} active / ${telemetry.volunteersTotal} total
- Food orders: ${telemetry.pendingOrders} pending / ${telemetry.totalOrders} total
- Issue reports: ${telemetry.openIssues} open / ${telemetry.totalIssues} total
- Medical emergencies: ${telemetry.activeEmergencies} active
- Attendance: 48,567

Answer the operator's question concisely (2-4 sentences), in character as a stadium operations assistant. Question: ${text}`;

      // The SDK's `contents` field accepts a plain string at runtime but its TypeScript
      // definition only allows ContentListUnion (an array of Content objects). We cast
      // just that field rather than silencing the entire call with `as any`.
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: stadiumContext as Parameters<typeof genAI.models.generateContent>[0]['contents'],
        config: { abortSignal: AbortSignal.timeout(12_000) },
      });

      const aiResponse = result.text?.trim();
      if (aiResponse) {
        return { response: aiResponse, source: 'Gemini AI' };
      }
      console.warn('[Nexus] Gemini returned an empty response; falling back to local engine.');
    } catch (err) {
      console.warn('[Nexus] Gemini request failed; falling back to local engine.', err);
    }
  }

  // ── Local rule-based engine ──────────────────────────────────────────────
  // Final fallback if neither n8n nor Gemini are available.
  const q = text.toLowerCase();
  const { pendingOrders, openIssues, activeEmergencies, volunteersActive, totalIssues, totalOrders } = telemetry;

  let responseText: string;

  if (q.includes('incident') || q.includes('issue') || q.includes('summarize')) {
    responseText = `**Stadium Incident Summary**: ${totalIssues} total issues — **${openIssues} open**.
*All open issues have been dispatched to the Volunteer Live Task Stack.*`;
  } else if (q.includes('food') || q.includes('order') || q.includes('hungry')) {
    responseText = `**Food Logistics Report**:
- Total Orders: ${totalOrders}
- Pending Deliveries: ${pendingOrders}
- Avg delivery time: **8.4 min** across all sectors.`;
  } else if (q.includes('gate') || q.includes('congested') || q.includes('crowd')) {
    responseText = `**Gate Ingress Analysis**:
- Gate C (High): ~14 min delay.
- Gate A (Moderate): ~6 min delay.
- Gate B & D (Optimal): <2 min delay.
*Recommendation: Reroute North transit fans to Gate B via digital signage.*`;
  } else if (q.includes('volunteer') || q.includes('available') || q.includes('staff')) {
    responseText = `**Volunteer Deployment Matrix**:
- Active: ${volunteersActive} volunteers synchronized.
*SLA compliance: 91% on high-priority alerts this hour.*`;
  } else if (q.includes('medical') || q.includes('emergency')) {
    responseText = activeEmergencies === 0
      ? '**Medical Safety Dashboard**: ✓ Zero active medical emergencies. All cases resolved.'
      : `**Medical Emergency Alert**: ${activeEmergencies} active case(s) — paramedics dispatched (PRIORITY: HIGH).\n*Average response time: 2.4 min.*`;
  } else if (q.includes('hello') || q.includes('hi') || q.includes('who are you')) {
    responseText = `Hello! I am **Nexus AI**, the Stadium Intelligence Assistant for FIFA World Cup 2026.
Try: *"Summarize today's incidents"*, *"Food orders pending?"*, *"Which gate is congested?"*, *"Available volunteers?"*`;
  } else {
    responseText = `**Nexus Telemetry** (Attendance: 48,567):
- Food queue: **${pendingOrders} pending** orders.
- Open issues: **${openIssues} tickets**.
- Medical: **${activeEmergencies} active** cases being handled.

Ask me about incidents, volunteers, gate congestion, or food logistics.`;
  }

  return { response: responseText, source: 'Nexus Local Engine' };
}

/** Stricter limiter for the unauthenticated demo AI endpoint — 30 requests/min per IP. */
const demoAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many demo requests. Please slow down.' },
});

/** Bounds-checks a telemetry field from the (untrusted) demo client payload. */
const toSafeCount = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 && n <= 100_000 ? Math.floor(n) : 0;
};

// ── AI command — Demo Mode (no Firebase Auth; client-supplied demo telemetry only) ──
// Never touches Firestore or Firebase Admin — safe to leave unauthenticated because
// it can only ever produce chat text, never read/write real stadium data.
app.post('/api/ai/demo-command', demoAiLimiter, async (req: Request, res: Response) => {
  const text = sanitize(req.body.text);
  if (!text) return badRequest(res, 'Command string is required.');
  if (text.length > 500) return badRequest(res, 'Command too long. Maximum 500 characters.');

  const t = req.body.telemetry || {};
  const telemetry: Telemetry = {
    volunteersActive: toSafeCount(t.volunteersActive),
    volunteersTotal: toSafeCount(t.volunteersTotal),
    pendingOrders: toSafeCount(t.pendingOrders),
    totalOrders: toSafeCount(t.totalOrders),
    openIssues: toSafeCount(t.openIssues),
    totalIssues: toSafeCount(t.totalIssues),
    activeEmergencies: toSafeCount(t.activeEmergencies),
  };

  try {
    const result = await answerStadiumQuestion(text, telemetry);
    res.json(result);
  } catch (err) {
    console.error('[Nexus] Demo AI command failed:', err);
    res.status(500).json({ error: 'AI command failed.' });
  }
});

// ── AI command (any authenticated fan/volunteer/admin) ─────────────────────────

app.post('/api/ai/command', requireAuth, requireAppCheck, async (req: AuthedRequest, res: Response) => {
  const text = sanitize(req.body.text);
  if (!text) return badRequest(res, 'Command string is required.');
  if (text.length > 500) return badRequest(res, 'Command too long. Maximum 500 characters.');

  const telemetry = await getStadiumTelemetry();

  try {
    const result = await answerStadiumQuestion(text, telemetry);
    return res.json(result);
  } catch (err) {
    console.error('[Nexus] AI command failed:', err);
    return res.status(500).json({ error: 'AI command failed.' });
  }
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
    // `index: false` stops express.static from auto-serving index.html for
    // "/" — that path must go through the handler below instead, so every
    // <script> tag gets stamped with the current request's CSP nonce.
    app.use(express.static(distPath, { index: false }));
    const indexHtmlPath = path.join(distPath, 'index.html');
    let indexHtmlTemplate: string | null = null;
    app.get('*', (_req: Request, res: Response) => {
      if (indexHtmlTemplate === null) {
        indexHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf-8');
      }
      const nonce = res.locals.cspNonce;
      // Stamp the nonce onto every <script> tag (inline or src=) so each
      // satisfies the 'nonce-...' script-src directive above. `<script` only
      // matches opening tags — `</script>` has a `/` right after `<`, so it
      // never matches this pattern.
      const html = indexHtmlTemplate.replace(/<script/g, `<script nonce="${nonce}"`);
      res.type('html').send(html);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nexus Server] running on http://localhost:${PORT}`);
  });
}

// ── Boot-time admin integrity guard ──────────────────────────────────────────
// The entire admin security model assumes exactly one document in the
// `admins` collection (see scripts/seedAdmin.ts / scripts/verifyAdminIntegrity.ts).
// That invariant can only be broken by someone editing Firestore directly
// (the console bypasses firestore.rules), so the app itself would otherwise
// never notice. This check runs once at startup and logs loudly — it never
// blocks boot or touches request handling — so a stray console edit shows up
// in the server logs immediately instead of silently granting access.
async function checkAdminIntegrityOnBoot() {
  if (!isAdminSdkConfigured()) return; // no service account key in this env — nothing to check
  try {
    const snap = await getAdminDb().collection('admins').get();
    if (snap.size === 1) {
      console.log(`[Nexus Server] Admin integrity check: OK (1 admin doc, uid=${snap.docs[0].id}).`);
    } else {
      console.error(
        `[Nexus Server] ⚠ ADMIN INTEGRITY WARNING: expected exactly 1 document in ` +
        `'admins', found ${snap.size}. Someone may have edited Firestore directly. ` +
        `Run "npm run verify:admin" for details and remove any stray documents.`
      );
    }
  } catch (err) {
    console.warn('[Nexus Server] Admin integrity check failed to run:', err);
  }
}

// Exported so tests/server.test.ts can exercise the REAL app with supertest
// instead of a disconnected reimplementation. Only auto-start the HTTP
// listener (and Vite dev middleware) outside of the Vitest test runner.
export { app };
if (!process.env.VITEST) {
  startServer();
  checkAdminIntegrityOnBoot();
}
