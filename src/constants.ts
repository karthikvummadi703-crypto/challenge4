/**
 * Shared application-wide constants.
 *
 * Keeping magic numbers and strings here makes them easy to find, change once,
 * and reference by intent-revealing names throughout the codebase.
 */

// ── Stadium / Event ───────────────────────────────────────────────────────────
/** Official in-game attendance used for display and AI context. */
export const STADIUM_ATTENDANCE = 48_567;

/** Human-friendly venue name shown across dashboards. */
export const STADIUM_NAME = 'Estádio do Nexus';

/** Starting match time in seconds for the live timer (68 min 24 sec). */
export const MATCH_INITIAL_SECONDS = 4_104;

// ── API / Server ──────────────────────────────────────────────────────────────
/** Express port — must match vite.config.ts server.port. */
export const SERVER_PORT = 5_000;

/** Maximum characters accepted in an AI command string. */
export const AI_COMMAND_MAX_LENGTH = 500;

/** Short-lived cache TTL for Firestore telemetry reads (milliseconds). */
export const TELEMETRY_CACHE_TTL_MS = 10_000;

/** Timeout for n8n upstream webhook requests (milliseconds). */
export const N8N_TIMEOUT_MS = 8_000;

/** Timeout for Gemini AI upstream requests (milliseconds). */
export const GEMINI_TIMEOUT_MS = 12_000;

// ── Seat Numbers ──────────────────────────────────────────────────────────────
/** Default seat shown when a fan's stored seat is unavailable. */
export const DEFAULT_SEAT_NUMBER = 'A-118';

/** Maximum seat number generation attempts before falling back. */
export const SEAT_GENERATION_MAX_ATTEMPTS = 100;

// ── Volunteer IDs ─────────────────────────────────────────────────────────────
/** Fallback volunteer ID prefix when UID is unavailable. */
export const VOLUNTEER_ID_FALLBACK = 'VOL-0000';

// ── Timing ────────────────────────────────────────────────────────────────────
/** How long success banners remain visible before auto-dismissing (ms). */
export const SUCCESS_BANNER_DURATION_MS = 4_000;

/** How long emergency banners remain visible (ms). */
export const EMERGENCY_BANNER_DURATION_MS = 5_000;
