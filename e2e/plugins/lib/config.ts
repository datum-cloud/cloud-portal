/**
 * Central configuration for the Portal Plugin System Playwright e2e suite.
 *
 * Everything tunable lives here so that, as the other plugin-system teammates
 * finalize their contracts, only this file changes. Every value can be
 * overridden from the environment, which keeps the suite runnable in CI and on
 * a contributor's laptop without editing code.
 *
 * SAFETY: This suite is STRICTLY READ-ONLY against the remote platform. It logs
 * in, lists, and navigates. The only mutations it performs are against the
 * LOCAL kwok registry (PortalPlugin CRs) and local dev servers.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Repository root (…/cloud-portal), derived from this file's location. */
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Directory for all ephemeral run artifacts (git-ignored). */
export const ARTIFACTS_DIR = path.join(REPO_ROOT, 'e2e', 'plugins', '.artifacts');

/** Playwright storageState written by global-setup and consumed by every spec. */
export const STORAGE_STATE = path.join(ARTIFACTS_DIR, 'storage-state.json');

/** Runtime state (project id, tier availability, …) passed setup → specs. */
export const RUNTIME_STATE = path.join(ARTIFACTS_DIR, 'runtime-state.json');

/** Records spawned server PIDs so global-teardown can stop them. */
export const PIDFILE = path.join(ARTIFACTS_DIR, 'servers.json');

// ───────────────────────────────────────────────────────────────────────────
// Ports & URLs
// ───────────────────────────────────────────────────────────────────────────

const num = (v: string | undefined, fallback: number) =>
  v && Number.isFinite(Number(v)) ? Number(v) : fallback;

/** Tier 0 portal (PORTAL_PLUGINS static override). Matches the app's dev port. */
export const TIER0_PORTAL_PORT = num(process.env.E2E_TIER0_PORT, 3000);
/**
 * Tier 1 portal (kubeconfig registry source). A separate port so both portals
 * can run at once. Session cookies are host-scoped (not port-scoped per RFC
 * 6265), so one storageState authenticates both origins.
 */
export const TIER1_PORTAL_PORT = num(process.env.E2E_TIER1_PORT, 3100);
/** Sample plugin dev server. */
export const SAMPLE_PLUGIN_PORT = num(process.env.E2E_SAMPLE_PLUGIN_PORT, 7777);

export const TIER0_PORTAL_URL = `http://localhost:${TIER0_PORTAL_PORT}`;
export const TIER1_PORTAL_URL = `http://localhost:${TIER1_PORTAL_PORT}`;
export const SAMPLE_PLUGIN_URL = `http://localhost:${SAMPLE_PLUGIN_PORT}`;

/** Portal health endpoint used to gate readiness (see app/server/entry.ts). */
export const HEALTHZ_PATH = '/_healthz';
/** Max wait for a portal to compile (Vite dev) and serve /_healthz. */
export const AUTH_HEALTH_TIMEOUT = num(process.env.E2E_PORTAL_HEALTH_TIMEOUT, 180_000);
/** Sample plugin readiness signal: its manifest must be servable. */
export const SAMPLE_MANIFEST_URL = `${SAMPLE_PLUGIN_URL}/plugin-manifest.json`;

// ───────────────────────────────────────────────────────────────────────────
// Plugin identity (confirm with devenv's sample plugin manifest)
// ───────────────────────────────────────────────────────────────────────────

/** Slug for the sample plugin; drives PORTAL_PLUGINS and the mount URL. */
export const SAMPLE_SLUG = process.env.E2E_SAMPLE_SLUG ?? 'sample';
/** First page path the sample plugin exposes under its mount. */
export const SAMPLE_HOME_PATH = process.env.E2E_SAMPLE_HOME_PATH ?? 'home';
/** Static-override wiring for the Tier 0 portal. */
export const PORTAL_PLUGINS_VALUE = `${SAMPLE_SLUG}=${SAMPLE_PLUGIN_URL}`;

/** Mount-relative path the sample plugin's Milo-backed page exposes. */
export const SAMPLE_PLATFORM_DATA_PATH = process.env.E2E_SAMPLE_PLATFORM_DATA_PATH ?? 'platform';

/**
 * PortalPlugin resource name applied/deleted in Tier 1. Deterministic per the
 * CRD design (Service.spec.serviceName). Confirm with devenv's CR fixture.
 */
export const TIER1_PLUGIN_NAME = process.env.E2E_TIER1_PLUGIN_NAME ?? 'sample.miloapis.com';
/** Slug the Tier 1 CR advertises (defaults to the same sample slug). */
export const TIER1_SLUG = process.env.E2E_TIER1_SLUG ?? SAMPLE_SLUG;

// ───────────────────────────────────────────────────────────────────────────
// Local dev environment (kwok) — commands owned by devenv (task #3)
// ───────────────────────────────────────────────────────────────────────────

/** Kubeconfig kwok writes; also passed to the Tier 1 portal as the registry. */
export const DEVENV_KUBECONFIG = path.join(REPO_ROOT, '.devenv', 'kubeconfig');

/**
 * Task commands. Defaults follow docs/enhancements/portal-plugin-system.md and
 * the task-board wording; override once devenv confirms the exact names.
 */
/**
 * Serve the sample plugin for Tier 0 via `task plugin:preview` (devenv's
 * proxy-safe task: deps → build → `vite preview` on :7777). We use the BUILT
 * remote rather than `task plugin:dev` because the Vite DEV remote entry imports
 * host-absolute `/node_modules/.vite/deps/*` and `/@id/*` paths that don't
 * resolve through the portal's same-origin asset proxy. The built remote uses
 * proxy-relative imports and is the realistic loading path; HMR is irrelevant
 * to automated e2e.
 */
export const CMD_SAMPLE_PLUGIN = process.env.E2E_SAMPLE_PLUGIN_CMD ?? 'task plugin:preview';
export const CMD_DEVENV_UP = process.env.E2E_DEVENV_UP_CMD ?? 'task devenv:up';
export const CMD_DEVENV_DOWN = process.env.E2E_DEVENV_DOWN_CMD ?? 'task devenv:down';
export const CMD_DEVENV_REGISTER = process.env.E2E_DEVENV_REGISTER_CMD ?? 'task devenv:register';

// ───────────────────────────────────────────────────────────────────────────
// Auth / dev-session (contract owned by portal-core, task #1)
// ───────────────────────────────────────────────────────────────────────────

/** Dev-only token-exchange endpoint. Gated by AUTH_DEV_TOKEN_EXCHANGE=1. */
export const DEV_SESSION_PATH = process.env.E2E_DEV_SESSION_PATH ?? '/api/auth/dev-session';
/** Session cookie name the portal issues (matches the app's `_session`). */
export const SESSION_COOKIE_NAME = process.env.E2E_SESSION_COOKIE ?? '_session';
/** Public registry endpoint used for the registry-health assertions. */
export const PLUGINS_API_PATH = '/api/plugins';

// ───────────────────────────────────────────────────────────────────────────
// Navigation target (a real, read-only project on the remote platform)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Project to navigate to. Defaults to the datumctl-context project; overridable.
 * Discovery (datumctl.ts) confirms this is accessible before the run.
 */
export const DEFAULT_PROJECT_ID = process.env.E2E_PROJECT_ID ?? 'datum-cloud';
export const DEFAULT_ORG_ID = process.env.E2E_ORG_ID ?? 'datum';
