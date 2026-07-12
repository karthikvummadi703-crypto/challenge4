# Nexus AI – FIFA Stadium Intelligence Platform 🏟️⚽
### *FIFA World Cup 2026 Stadium Operations Orchestration & Telemetry Hub*

Nexus AI is a premium, full-stack stadium intelligence platform engineered for the **FIFA World Cup 2026**. Designed to streamline complex stadium logistics, volunteer assignment dispatching, crowd heatmaps, and fan catering, it represents the future of large-scale event automation.

---

## 🚀 Key Architectural Pillars

1. **Dual-Engine Orchestration (n8n Webhooks + Local Brain)**
   All AI functions are completely abstracted. The system is designed to route commands, alerts, and dispatch queues directly to configurable **n8n.io Webhook endpoints**. When webhooks are unconfigured or offline, a highly capable **local rule-based intelligence engine** instantly takes over, keeping the dashboard 100% operational.
2. **Interactive Seating & Alert Map**
   A fully responsive SVG stadium coordinate tracker mapping **Sector A (North)**, **Sector B (East)**, **Sector C (South)**, and **Sector D (West)**. Highlights active paramedic alerts, food orders, and seat-specific coordinate pins.
3. **World-Class SaaS Dashboard Aesthetics**
   A custom dark-mode interface inspired by modern cloud command centers. Built with a premium color palette: **Black, Deep Navy, Glowing Neon Green, and High-Contrast Coral**. 

---

## 🛠️ Tech Stack & Dependencies

- **Frontend Core**: React 19, TypeScript, Vite, Tailwind CSS `@tailwindcss/vite`
- **Animation Suite**: Framer Motion `motion/react` for card glows, slide-ins, and scoreboards
- **Iconographies**: Lucide Icons
- **Backend Hub**: Full-stack Express API mapping FastAPI REST specs (with parallel FastAPI mapping instructions included)
- **Deployment Build System**: Bundled with `esbuild` to support high-performance cold starts in secure server-side containers

---

## 📁 Project Folder Map

```text
/
├── .env.example              # Template configuration variables including n8n Webhook mappings
├── README.md                 # Project handbook (this file)
├── requirements.txt          # Python FastAPI package manifests
├── server.ts                 # Full-stack Node & Express API hub serving the Vite asset pipeline
├── index.html                # Entry web point
├── package.json              # Client + Server scripts & node dependencies
├── src/
│   ├── App.tsx               # Main Role Router & general configuration state
│   ├── main.tsx              # React mounting root
│   ├── index.css             # Tailwind base & custom @theme rules (Inter + JetBrains Mono)
│   ├── types.ts              # Global type definitions (Matches, Volunteers, Tasks, Orders)
│   └── components/
│       ├── LandingPage.tsx   # Portal entry for Organizers, Volunteers, & Fans
│       ├── OrganizerDashboard.tsx # Setup forms, Volunteer management tables, & AI Command Center
│       ├── VolunteerDashboard.tsx # Active task stack dispatches & route assistant guides
│       ├── FanDashboard.tsx  # Interactive stadium scoring, food carts, & emergency beacons
│       ├── StadiumSeatMap.tsx # SVG Seating coordinate matrix & heatmap rendering overlays
│       └── WebhookSettingsModal.tsx # Control modal for managing n8n workflow webhook integrations
```

---

## 📡 REST API Specifications

The Express backend maps clean, RESTful APIs supporting full operational telemetry:

### 1. Match Operations
- `GET /api/matches` - Fetches all registered stadium games (e.g., Portugal vs. Argentina).
- `POST /api/matches` - Allows administrators to draft and schedule new game parameters (Stadium, Time, Ticket Prices).

### 2. Volunteer Dispatch
- `GET /api/volunteers` - Returns lists of enregistered volunteer stewards.
- `POST /api/volunteers` - Registers a new volunteer, auto-generating a unique ID (e.g., `VOL-4821`).
- `DELETE /api/volunteers/:id` - Dissolves volunteer credentials from database.
- `POST /api/publish` - Publishes the drafted matches to the fan portals and sets all volunteer credentials as **ACTIVE** (enabling logins).

### 3. Live Task Stack Queues
- `GET /api/tasks` - Returns active alerts in the stadium (Food Deliveries, Medical Emergency, Washroom spillages, Harassment).
- `POST /api/tasks/:id/accept` - Locks a task to a volunteer’s active assignment tray.
- `POST /api/tasks/:id/complete` - Marks task as complete, automatically resolving corresponding orders or emergencies.

### 4. Fan Services
- `POST /api/fan/register` - Generates a temporary fan seat pass.
- `POST /api/fan/order-food` - Orders catering to the fan's auto-resolved seat coordinate.
- `POST /api/fan/medical-emergency` - Triggers a high-priority emergency paramedic dispatch.
- `POST /api/fan/report-issue` - Logs comfort or security incidents.

### 5. AI Command Assist
- `POST /api/ai/command` - Queries the stadium state. If `N8N_AI_ASSISTANT_URL` is set, coordinates through n8n. Otherwise, parses queries locally (e.g. *"how many food orders are pending"*, *"summarize today's incidents"*, *"which gate is most congested"*).

---

## 🚀 Quick Start Guide

### 1. Environment Configuration
Verify your environment settings or duplicate `.env.example`:
```env
# n8n Webhook Mappings
N8N_WEBHOOK_URL="https://your-n8n.com/webhook/..."
N8N_AI_ASSISTANT_URL="https://your-n8n.com/webhook/ai-assistant"
```

### 2. Install & Run in Dev Mode
Boot the full-stack system:
```bash
npm run dev
```
The server will start running on **`http://localhost:3000`** serving both the REST APIs and Vite HMR assets.

### 3. Firebase App Check (optional, off by default)
App Check attests that requests to Firebase and to `/api/config` /
`/api/ai/command` come from this real app build, not a script calling the
APIs directly. It's fully opt-in — with nothing configured, the app behaves
exactly as it always has.

To turn it on:
1. **Manual Firebase Console step (cannot be done from code):** open
   Firebase Console → App Check → register this web app → choose
   **reCAPTCHA v3** → create/attach a reCAPTCHA v3 site key.
2. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` to that site key (client-side —
   makes the client start attaching App Check tokens).
3. For local dev only, register a debug token in Firebase Console → App
   Check → "Manage debug tokens" (the client logs one to the browser
   console on first run once the site key is set).
4. Set the `ENFORCE_APP_CHECK=true` server env var once you're ready for
   `/api/config` and `/api/ai/command` to actually reject requests without a
   valid token — leave it unset to keep enforcement off while you roll the
   client change out.

---

## 🏆 Hackathon Winner Features

* **Ronaldo Concept Integrations**: Gorgeous, high-fidelity digital artwork overlays celebrating iconic Jersey No. 7 styles.
* **1-Click Volunteer Demo Picker**: Automatically generates and randomizes login profiles on refresh, allowing zero-friction grading.
* **Instant Heatmap Overlays**: Toggle live crowd occupancy densities in Sector C (South) or Sector D (West) immediately.
* **Emergency Paramedic Beacon**: Includes live, high-priority pulsing rings on the stadium layout to track incident responses.

*Crafted with absolute dedication for the FIFA World Cup 2026 Stadium Experience.* 🏟️⚽
