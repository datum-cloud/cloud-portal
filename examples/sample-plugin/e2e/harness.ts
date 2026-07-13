/**
 * Standalone e2e harness for testing a Portal Plugin against a real portal.
 *
 * COPY-ME: this file (and the rest of `e2e/`) is meant to be copied into a
 * service team's own plugin repository. It deliberately has NO imports from the
 * cloud-portal app or its internal e2e suite — a copied plugin won't have those.
 * Everything it needs (datumctl auth, dev-session exchange, kwok registry
 * lifecycle, process orchestration) is self-contained here.
 *
 * What it does, driven entirely by `plugin-e2e.config.ts`:
 *   1. Get a platform token from datumctl and align the portal's API_URL to it.
 *   2. Bring up the portal's local kwok registry (`task devenv:up`).
 *   3. Start your plugin (its `preview` script: built assets).
 *   4. Start the portal from PORTAL_REPO_DIR watching the kwok registry.
 *   5. Exchange the token for a portal session cookie (Playwright storageState).
 * The spec then applies your PortalPlugin CR and asserts the plugin appears.
 *
 * SAFETY: strictly READ-ONLY against the remote platform (log in, list,
 * navigate). The only mutations are local dev servers and the local kwok
 * registry (your PortalPlugin CR).
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config contract (what a plugin team edits in plugin-e2e.config.ts) ──────

export interface NavItemSpec {
  /** Mount-relative path, e.g. "platform". */
  path: string;
  /** Visible nav item text, e.g. "Platform data". */
  title: string;
}

export interface PageSpec {
  /** Mount-relative path, e.g. "home" or "platform". */
  path: string;
  /** A selector that is present once the page has rendered. */
  readySelector: string;
}

export interface PluginE2EConfig {
  /** Plugin URL slug (the `<slug>` in /project/:id/services/<slug>/…). */
  slug: string;
  /** PortalPlugin metadata.name (== manifest `name`), e.g. sample.miloapis.com. */
  manifestName: string;
  /** Path to your PortalPlugin CR manifest, relative to the plugin package root. */
  crManifestPath: string;
  /** Nav items your plugin contributes (asserted to appear once registered). */
  navItems: NavItemSpec[];
  /** Pages to smoke-test: navigate to each and assert its ready selector. */
  pages: PageSpec[];
  /**
   * Command that serves your built plugin. There is no backend to start here —
   * every API call your plugin issues goes through the portal's Milo
   * control-plane proxy, including calls to your own aggregated apiserver.
   */
  pluginCommand: string;
  /** URL that returns 200 once your plugin's manifest is served. */
  pluginReadyUrl: string;
  /** Port the portal listens on for this run. */
  portalPort: number;
}

// ─── Paths & artifacts ───────────────────────────────────────────────────────

/** The plugin package root (the directory that holds this e2e/ folder). */
export const PACKAGE_ROOT = path.resolve(__dirname, '..');
/** The cloud-portal checkout. In-tree the sample lives at examples/sample-plugin. */
export const PORTAL_REPO_DIR =
  process.env.PORTAL_REPO_DIR ?? path.resolve(PACKAGE_ROOT, '..', '..');
export const DEVENV_KUBECONFIG = path.join(PORTAL_REPO_DIR, '.devenv', 'kubeconfig');

const ARTIFACTS = path.join(__dirname, '.artifacts');
export const STORAGE_STATE = path.join(ARTIFACTS, 'storage-state.json');
const RUNTIME_STATE = path.join(ARTIFACTS, 'runtime-state.json');
const PIDFILE = path.join(ARTIFACTS, 'servers.json');
const LOG_DIR = path.join(ARTIFACTS, 'logs');

const PORTAL_PLUGIN_PLURAL = 'portalplugins';

function log(msg: string) {
  console.log(`[plugin-e2e] ${msg}`);
}

// ─── Runtime state passed setup → spec (workers are separate processes) ──────

export interface RuntimeState {
  projectId: string;
  orgId: string;
  portalUrl: string;
  kubeconfig: string;
}

export function readState(): RuntimeState {
  return JSON.parse(fs.readFileSync(RUNTIME_STATE, 'utf8'));
}

// ─── datumctl (read-only) ────────────────────────────────────────────────────

function datumctl(args: string[]): string {
  return execFileSync('datumctl', args, { encoding: 'utf8', timeout: 60_000 }).trim();
}

function getToken(): string {
  for (let i = 0; i < 4; i++) {
    let t = '';
    try {
      t = datumctl(['auth', 'get-token', '-o', 'token']);
    } catch {
      /* transient; retry */
    }
    if (t && t.split('.').length === 3) return t;
    execFileSync('sleep', ['1']);
  }
  throw new Error('datumctl auth get-token did not return a JWT — run `datumctl login` first.');
}

function hostOf(url?: string): string | undefined {
  if (!url) return undefined;
  const withScheme = /^https?:\/\//.test(url) ? url : `https://${url}`;
  try {
    return new URL(withScheme).host;
  } catch {
    return undefined;
  }
}

/** The token's `iss` claim is authoritative for which API the token validates against. */
function tokenIssuer(token: string): string | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.iss;
  } catch {
    return undefined;
  }
}

/**
 * Derive the portal's API_URL from the token issuer (auth.<env> → api.<env>).
 * datumctl `whoami` can drift from the token's real environment when multiple
 * sessions exist; the token issuer is the reliable signal.
 */
function apiUrlFromToken(token: string): string {
  const host = hostOf(tokenIssuer(token));
  if (host?.startsWith('auth.')) return `https://api.${host.slice('auth.'.length)}`;
  // Fall back to datumctl's endpoint if the issuer isn't the expected shape.
  const ep = (() => {
    try {
      const m = datumctl(['whoami']).match(/Endpoint:\s+(\S+)/);
      return m?.[1];
    } catch {
      return undefined;
    }
  })();
  return ep ? `https://${ep.replace(/^https?:\/\//, '')}` : 'https://api.datum.net';
}

/** First project the token can GET (read-only), for a real navigation target. */
async function discoverProject(
  token: string,
  apiUrl: string
): Promise<{ projectId: string; orgId: string }> {
  if (process.env.E2E_PROJECT_ID) {
    return { projectId: process.env.E2E_PROJECT_ID, orgId: process.env.E2E_ORG_ID ?? '' };
  }
  const base = `${apiUrl.replace(/\/+$/, '')}/apis/resourcemanager.miloapis.com/v1alpha1/projects`;
  const auth = { Authorization: `Bearer ${token}` };
  const candidates: string[] = [];
  try {
    const m = datumctl(['whoami']).match(/Project:\s+.*\(([^)]+)\)|Project:\s+(\S+)/);
    const p = m?.[1] ?? m?.[2];
    if (p) candidates.push(p);
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch(base, { headers: auth });
    if (res.ok) {
      const list = await res.json();
      for (const it of list?.items ?? []) if (it?.metadata?.name) candidates.push(it.metadata.name);
    }
  } catch {
    /* ignore */
  }
  for (const name of candidates) {
    try {
      const res = await fetch(`${base}/${encodeURIComponent(name)}`, { headers: auth });
      if (res.ok) {
        const proj = await res.json();
        const org = proj?.spec?.ownerRef?.name ?? '';
        return { projectId: name, orgId: org };
      }
    } catch {
      /* try next */
    }
  }
  throw new Error('Could not discover an accessible project — set E2E_PROJECT_ID.');
}

// ─── Process orchestration ───────────────────────────────────────────────────

interface Pidfile {
  servers: { name: string; pid: number }[];
  teardown: { command: string; cwd: string }[];
}

function readPidfile(): Pidfile {
  try {
    return JSON.parse(fs.readFileSync(PIDFILE, 'utf8'));
  } catch {
    return { servers: [], teardown: [] };
  }
}
function writePidfile(pf: Pidfile) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  fs.writeFileSync(PIDFILE, JSON.stringify(pf, null, 2));
}

function startServer(
  name: string,
  command: string,
  cwd: string,
  env: Record<string, string> = {}
): string {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, `${name}.log`);
  const out = fs.openSync(logFile, 'a');
  const child = spawn('/bin/sh', ['-c', command], {
    cwd,
    env: { ...process.env, ...env } as NodeJS.ProcessEnv,
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  if (!child.pid) throw new Error(`Failed to spawn ${name}`);
  const pf = readPidfile();
  pf.servers.push({ name, pid: child.pid });
  writePidfile(pf);
  return logFile;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitHttp(url: string, label: string, timeoutMs = 180_000, logFile?: string) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok || res.status === 200) return;
      last = `status ${res.status}`;
    } catch (e) {
      last = (e as Error).message;
    }
    await sleep(500);
  }
  const tail = logFile ? `\n--- ${logFile} ---\n${tailFile(logFile)}` : '';
  throw new Error(`Timed out waiting for ${label} (${url}); last: ${last}.${tail}`);
}

async function waitFile(file: string, label: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return;
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label} (${file}).`);
}

function tailFile(file: string, n = 30): string {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(-n).join('\n');
  } catch {
    return '(no log)';
  }
}

function registerTeardown(command: string, cwd: string) {
  const pf = readPidfile();
  pf.teardown.push({ command, cwd });
  writePidfile(pf);
}

// ─── kubectl against the local kwok registry (spec uses these) ───────────────

export function kubectl(args: string[]): string {
  return execFileSync('kubectl', ['--kubeconfig', DEVENV_KUBECONFIG, ...args], {
    encoding: 'utf8',
    timeout: 60_000,
  }).trim();
}

export function applyCR(manifestPath: string) {
  kubectl(['apply', '-f', path.resolve(PACKAGE_ROOT, manifestPath)]);
}
export function deleteCR(manifestPath: string) {
  kubectl(['delete', '-f', path.resolve(PACKAGE_ROOT, manifestPath), '--ignore-not-found']);
}
export function portalPluginReady(name: string): boolean {
  try {
    const s = kubectl([
      'get',
      PORTAL_PLUGIN_PLURAL,
      name,
      '-o',
      'jsonpath={.status.conditions[?(@.type=="Ready")].status}',
    ]);
    return s === 'True';
  } catch {
    return false;
  }
}

// ─── dev-session exchange → Playwright storageState ──────────────────────────

async function exchangeDevSession(portalUrl: string, token: string) {
  const res = await fetch(`${portalUrl}/api/auth/dev-session`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `dev-session exchange failed: ${res.status}. Ensure the portal ran with ` +
        `AUTH_DEV_TOKEN_EXCHANGE=1 and API_URL matches the token env. ${body.slice(0, 200)}`
    );
  }
  const setCookies: string[] =
    (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
  const session = setCookies.map(parseCookie).find((c) => c?.name === '_session');
  if (!session) throw new Error('dev-session returned 200 but no `_session` cookie.');
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  fs.writeFileSync(
    STORAGE_STATE,
    JSON.stringify({ cookies: [{ ...session, domain: 'localhost' }], origins: [] }, null, 2)
  );
}

function parseCookie(header: string) {
  const [nv, ...attrs] = header.split(';').map((s) => s.trim());
  const eq = nv.indexOf('=');
  if (eq < 0) return null;
  const c = {
    name: nv.slice(0, eq),
    value: nv.slice(eq + 1),
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as 'Lax' | 'Strict' | 'None',
  };
  for (const a of attrs) {
    const [k, v] = a.split('=');
    const key = k.toLowerCase();
    if (key === 'path') c.path = v ?? '/';
    else if (key === 'httponly') c.httpOnly = true;
    else if (key === 'secure') c.secure = true;
    else if (key === 'max-age' && v) c.expires = Math.floor(Date.now() / 1000) + Number(v);
    else if (key === 'samesite' && v)
      c.sameSite =
        v.toLowerCase() === 'strict' ? 'Strict' : v.toLowerCase() === 'none' ? 'None' : 'Lax';
  }
  return c;
}

// ─── Orchestration entry points (used by global-setup / global-teardown) ─────

export async function setup(config: PluginE2EConfig): Promise<void> {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  writePidfile({ servers: [], teardown: [] });

  if (!fs.existsSync(path.join(PORTAL_REPO_DIR, 'Taskfile.yml'))) {
    throw new Error(
      `PORTAL_REPO_DIR (${PORTAL_REPO_DIR}) has no Taskfile.yml — point PORTAL_REPO_DIR at a cloud-portal checkout.`
    );
  }

  // 1. Token + endpoint alignment (read-only).
  log('Fetching platform token via datumctl…');
  const token = getToken();
  const apiUrl = apiUrlFromToken(token);
  log(`Using API_URL=${apiUrl} (derived from token issuer).`);
  const { projectId, orgId } = await discoverProject(token, apiUrl);
  log(`Navigation target: project=${projectId} org=${orgId || '(unknown)'}`);

  // 2. Local kwok registry.
  log('Bringing up local registry: task devenv:up');
  execFileSync('/bin/sh', ['-c', 'task devenv:up'], {
    cwd: PORTAL_REPO_DIR,
    stdio: 'inherit',
    timeout: 180_000,
  });
  registerTeardown('task devenv:down', PORTAL_REPO_DIR);
  await waitFile(DEVENV_KUBECONFIG, 'kwok kubeconfig');

  // 3. Plugin (built assets).
  log(`Starting plugin: ${config.pluginCommand}`);
  const pluginLog = startServer('plugin', config.pluginCommand, PACKAGE_ROOT);
  await waitHttp(config.pluginReadyUrl, 'plugin manifest', 120_000, pluginLog);
  log('Plugin is serving.');

  // 4. Portal, watching the kwok registry.
  const portalUrl = `http://localhost:${config.portalPort}`;
  log(`Starting portal on :${config.portalPort} (PLUGIN_REGISTRY_KUBECONFIG)…`);
  const portalLog = startServer('portal', 'bun run dev', PORTAL_REPO_DIR, {
    PORT: String(config.portalPort),
    PLUGIN_REGISTRY_KUBECONFIG: DEVENV_KUBECONFIG,
    AUTH_DEV_TOKEN_EXCHANGE: '1',
    ONBOARDING_DEV_BYPASS: 'true',
    API_URL: apiUrl,
    AUTH_OIDC_ISSUER: tokenIssuer(token) ?? 'https://auth.datum.net',
    // The portal's .env ships SENTRY_DSN empty; Zod z.url() rejects "". Pin a
    // keyless URL that validates and makes Sentry a no-op.
    SENTRY_DSN: 'https://sentry.example.com/0',
  });
  await waitHttp(`${portalUrl}/_healthz`, 'portal /_healthz', 180_000, portalLog);
  log('Portal is healthy.');

  // 5. Auth: token → dev-session → storageState.
  log('Exchanging token for a portal session cookie…');
  await exchangeDevSession(portalUrl, token);

  const state: RuntimeState = { projectId, orgId, portalUrl, kubeconfig: DEVENV_KUBECONFIG };
  fs.writeFileSync(RUNTIME_STATE, JSON.stringify(state, null, 2));
  // Ensure a clean slate: remove the plugin CR if a prior run left it.
  deleteCR(config.crManifestPath);
  log('Setup complete.');
}

export async function teardown(): Promise<void> {
  const pf = readPidfile();
  for (const t of pf.teardown) {
    try {
      execFileSync('/bin/sh', ['-c', t.command], { cwd: t.cwd, stdio: 'ignore', timeout: 120_000 });
    } catch {
      /* best effort */
    }
  }
  const kill = (pid: number, sig: NodeJS.Signals) => {
    try {
      process.kill(-pid, sig);
    } catch {
      try {
        process.kill(pid, sig);
      } catch {
        /* gone */
      }
    }
  };
  for (const s of pf.servers) kill(s.pid, 'SIGTERM');
  await sleep(1500);
  for (const s of pf.servers) kill(s.pid, 'SIGKILL');
  writePidfile({ servers: [], teardown: [] });
}
