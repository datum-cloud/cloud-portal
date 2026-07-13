/**
 * Thin wrappers around the `datumctl` CLI.
 *
 * All calls here are READ-ONLY: fetch a token, read the current context, list
 * projects. Nothing mutates remote platform state.
 */
import { DEFAULT_ORG_ID, DEFAULT_PROJECT_ID } from './config';
import { execFileSync } from 'node:child_process';

function datumctl(args: string[]): string {
  return execFileSync('datumctl', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  }).trim();
}

/**
 * Obtain a fresh platform access token.
 *
 * Default path (local AND CI): `datumctl auth get-token`. In CI, a dedicated
 * service account is already logged into datumctl's keyring by the
 * `setup-datumctl-action` step, so this is the same call a local dev's session
 * would make. The very first call in a session can return empty while datumctl
 * silently refreshes the token, so retry.
 *
 * Override path: when `E2E_ACCESS_TOKEN` is set (a JWT), it is used directly
 * and datumctl is never invoked — for runs without the CLI installed.
 */
export function getPlatformToken(): string {
  const injected = process.env.E2E_ACCESS_TOKEN?.trim();
  if (injected) {
    if (injected.split('.').length !== 3) {
      throw new Error('E2E_ACCESS_TOKEN is set but is not a JWT (expected 3 dot-separated parts).');
    }
    return injected;
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    let token = '';
    try {
      token = datumctl(['auth', 'get-token', '-o', 'token']);
    } catch {
      /* transient; retry */
    }
    if (token && token.split('.').length === 3) return token;
    // Small backoff to let a background refresh settle.
    execFileSync('sleep', ['1']);
  }
  throw new Error(
    'datumctl auth get-token did not return a JWT after retries. Run `datumctl login` ' +
      'first (the plugin e2e suite requires an authenticated datumctl session).'
  );
}

export interface WhoAmI {
  endpoint?: string;
  organization?: string;
  project?: string;
  user?: string;
}

/** Parse `datumctl whoami` (label/value table) into structured fields. */
export function whoami(): WhoAmI {
  const raw = datumctl(['whoami']);
  const out: WhoAmI = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^(\w[\w ]*?):\s+(.*)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();
    if (key === 'endpoint') out.endpoint = val;
    else if (key === 'organization') out.organization = extractParen(val) ?? val;
    else if (key === 'project') out.project = extractParen(val) ?? val;
    else if (key === 'user') out.user = val;
  }
  return out;
}

/**
 * `whoami` that never throws — returns `{}` when datumctl is absent or errors.
 * Callers must treat every field as optional; the token, not whoami, is
 * authoritative for environment alignment and project discovery.
 */
export function tryWhoami(): WhoAmI {
  // Override path: with an injected token we never invoke datumctl at all.
  if (process.env.E2E_ACCESS_TOKEN) return {};
  try {
    return whoami();
  } catch {
    return {};
  }
}

/** "Datum Technology, Inc. (datum)" → "datum". */
function extractParen(v: string): string | undefined {
  const m = v.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : undefined;
}

const PROJECTS_API = '/apis/resourcemanager.miloapis.com/v1alpha1/projects';

function ownerOrgOf(project: any): string | undefined {
  return (
    project?.spec?.ownerRef?.name ??
    project?.metadata?.labels?.['resourcemanager.miloapis.com/owner-name']
  );
}

/**
 * Pick a real, accessible project to navigate to (read-only), verified against
 * the TOKEN's environment over HTTP — not datumctl's `whoami` context, which can
 * point at a different environment than the token when multiple sessions exist.
 *
 * Preference: explicit E2E_PROJECT_ID → the datumctl context project if it GETs
 * 200 in the token's env → the first project the token can GET from the list.
 * Returns `metadata.name` (the portal's `:projectId`) and the owning org id.
 */
export async function discoverProject(opts: {
  token: string;
  apiUrl: string;
}): Promise<{ projectId: string; orgId: string }> {
  if (process.env.E2E_PROJECT_ID) {
    return {
      projectId: process.env.E2E_PROJECT_ID,
      orgId: process.env.E2E_ORG_ID ?? DEFAULT_ORG_ID,
    };
  }

  const base = `${opts.apiUrl.replace(/\/+$/, '')}${PROJECTS_API}`;
  const auth = { Authorization: `Bearer ${opts.token}` };

  const getProject = async (name: string): Promise<any | null> => {
    try {
      const res = await fetch(`${base}/${encodeURIComponent(name)}`, { headers: auth });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  const candidates: string[] = [];
  // whoami is a best-effort hint (absent in CI); the token's project list below
  // is what actually determines an accessible project.
  const ctx = tryWhoami();
  if (ctx.project) candidates.push(ctx.project);

  try {
    const res = await fetch(base, { headers: auth });
    if (res.ok) {
      const list = await res.json();
      for (const item of list?.items ?? []) {
        const name = item?.metadata?.name;
        if (name) candidates.push(name);
      }
    }
  } catch {
    // Fall through to defaults.
  }

  for (const name of candidates) {
    const project = await getProject(name);
    if (project) {
      return { projectId: name, orgId: ownerOrgOf(project) ?? ctx.organization ?? DEFAULT_ORG_ID };
    }
  }

  return {
    projectId: ctx.project ?? DEFAULT_PROJECT_ID,
    orgId: ctx.organization ?? DEFAULT_ORG_ID,
  };
}
