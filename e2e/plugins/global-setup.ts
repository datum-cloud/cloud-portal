/**
 * Playwright global setup for the Portal Plugin System e2e suite.
 *
 * Orchestrates everything the specs need, in order:
 *   1. Fetch a platform token from datumctl (read-only).
 *   2. Reconcile the portal's `.env` endpoints with datumctl's login and
 *      compute env overrides so the token validates.
 *   3. Discover a real, accessible project to navigate to (read-only).
 *   4. Start the sample plugin server (:7777) and the Tier 0 portal (:3000),
 *      then exchange the token for a session cookie (storageState).
 *   5. If kwok + devenv are available, bring up the local registry and the
 *      Tier 1 portal (:3100); otherwise mark Tier 1 to be skipped.
 *
 * SAFETY: strictly read-only against the remote platform. The only mutations
 * are against local dev servers and the local kwok registry.
 */
import {
  ARTIFACTS_DIR,
  AUTH_HEALTH_TIMEOUT,
  CMD_DEVENV_UP,
  CMD_DEVENV_DOWN,
  CMD_SAMPLE_PLUGIN,
  DEVENV_KUBECONFIG,
  HEALTHZ_PATH,
  PORTAL_PLUGINS_VALUE,
  REPO_ROOT,
  SAMPLE_HOME_PATH,
  SAMPLE_MANIFEST_URL,
  SAMPLE_PLATFORM_DATA_PATH,
  SAMPLE_SLUG,
  TIER0_PORTAL_PORT,
  TIER0_PORTAL_URL,
  TIER1_PLUGIN_NAME,
  TIER1_PORTAL_PORT,
  TIER1_PORTAL_URL,
  TIER1_SLUG,
} from './lib/config';
import { getPlatformToken, tryWhoami, discoverProject } from './lib/datumctl';
import { exchangeTokenForStorageState } from './lib/dev-session';
import { computeAlignment, decodeJwtClaims, readEnvAlignmentLines } from './lib/env-align';
import { writeRuntimeState } from './lib/runtime-state';
import {
  registerTeardownCommand,
  resetPidfile,
  startServer,
  waitForFile,
  waitForHttp,
} from './lib/server-manager';
import type { FullConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function log(msg: string) {
  console.log(`[plugin-e2e:setup] ${msg}`);
}

function has(bin: string): boolean {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Decide whether the Tier 1 (kwok CRD registration) path can run.
 *
 * `task devenv:up` bootstraps its own kwok binary (devenv/scripts/ensure-kwok.sh
 * → .devenv/bin/kwokctl), so kwokctl need NOT be on PATH — we only require the
 * `task` runner, `kubectl` (for CR assertions), and the devenv Taskfile. If the
 * bootstrap can't fetch kwok (no network/docker/kind), `devenv:up` fails loudly.
 */
function detectTier1(): { enabled: boolean; reason?: string } {
  if (process.env.E2E_TIER1 === '0') return { enabled: false, reason: 'disabled via E2E_TIER1=0' };
  if (process.env.E2E_TIER1 === '1') return { enabled: true };
  const taskfile =
    fs.existsSync(`${REPO_ROOT}/Taskfile.yml`) || fs.existsSync(`${REPO_ROOT}/Taskfile.yaml`);
  if (!has('task') || !taskfile)
    return { enabled: false, reason: 'devenv Taskfile / `task` binary not available' };
  if (!has('kubectl')) return { enabled: false, reason: 'kubectl not installed' };
  return { enabled: true };
}

/** Refuse to spawn onto a port that is already answering (clean-checkout contract). */
async function assertPortFree(port: number, url: string) {
  if (process.env.E2E_REUSE_PORTAL === '1') return;
  try {
    const res = await fetch(`${url}${HEALTHZ_PATH}`, { redirect: 'manual' });
    if (res.ok)
      throw new Error(
        `Port ${port} is already serving a portal. Stop it, or set E2E_REUSE_PORTAL=1 ` +
          `if it is a compatibly-configured portal, or override the port (E2E_TIER0_PORT/E2E_TIER1_PORT).`
      );
  } catch (e) {
    if ((e as Error).message.includes('already serving')) throw e;
    // Connection refused → port is free. Good.
  }
}

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  resetPidfile();

  // 1. Token (read-only).
  log('Fetching platform token via `datumctl auth get-token`…');
  const token = getPlatformToken();
  const { iss: tokenIssuer, aud } = decodeJwtClaims(token);
  // whoami is skipped only under the E2E_ACCESS_TOKEN override; the token
  // drives alignment + discovery either way.
  const ctx = tryWhoami();
  log(
    process.env.E2E_ACCESS_TOKEN
      ? 'Using E2E_ACCESS_TOKEN override (datumctl not invoked).'
      : `datumctl endpoint=${ctx.endpoint ?? 'unknown'} user=${ctx.user ?? 'unknown'}`
  );
  log(`token iss=${tokenIssuer ?? 'unknown'} aud=${JSON.stringify(aud) ?? 'unknown'}`);

  // 2. Alignment (reads only API_URL / AUTH_OIDC_ISSUER from .env).
  const envLines = readEnvAlignmentLines();
  const alignment = computeAlignment({
    envApiUrl: envLines.apiUrl,
    envOidcIssuer: envLines.oidcIssuer,
    datumctlEndpoint: ctx.endpoint ?? '',
    tokenIssuer,
  });
  alignment.notes.forEach((n) => log(n));

  const overrideEnv: Record<string, string> = {};
  if (alignment.overrides.API_URL) overrideEnv.API_URL = alignment.overrides.API_URL;
  if (alignment.overrides.AUTH_OIDC_ISSUER)
    overrideEnv.AUTH_OIDC_ISSUER = alignment.overrides.AUTH_OIDC_ISSUER;

  // The dev registry sources (PORTAL_PLUGINS / PLUGIN_REGISTRY_KUBECONFIG) and the
  // dev-session endpoint are hard-disabled outside development — by design. Pin
  // NODE_ENV so the launched portal is in dev mode even when CI sets NODE_ENV=test
  // elsewhere. (`bun run dev` is dev anyway; this makes it explicit + CI-safe.)
  overrideEnv.NODE_ENV = 'development';

  // The repo `.env` ships `SENTRY_DSN=` (empty). Bun loads that as "" and the
  // portal's Zod env schema rejects it (`z.url().optional()` allows undefined,
  // not ""), which aborts boot. We can't force it back to undefined (Bun re-adds
  // the empty value from .env), so pin a value that (a) passes `z.url()` and
  // (b) makes Sentry a no-op. Note: `z.url()` rejects any URL with userinfo, so
  // a real-shaped DSN (`key@host`) would fail — a keyless URL both validates and
  // makes Sentry disable itself (invalid DSN → no transport). Tests never report.
  overrideEnv.SENTRY_DSN = 'https://sentry.example.com/0';

  // PROMETHEUS_URL / CLOUDVALID_* are required (non-test-mode) server env vars
  // with no built-in default — locally they come from the dev's gitignored
  // .env (seeded from .env.example); CI writes no .env at all. The plugin e2e
  // suite never exercises these features, so placeholders are enough to pass
  // validation and let the portal boot.
  overrideEnv.PROMETHEUS_URL = 'http://localhost:9090';
  overrideEnv.CLOUDVALID_API_URL = 'http://localhost:8081';
  overrideEnv.CLOUDVALID_API_KEY = 'test-cloudvalid-api-key';
  overrideEnv.CLOUDVALID_TEMPLATE_ID = 'test-cloudvalid-template-id';

  // Plugin UI lives under the project-detail layout, which is hard-gated by the
  // legacy-setup billing middleware: every project route redirects to
  // /onboarding/billing unless the owning org has contact info + a billing
  // account + an active payment method. The test account has no billing-complete
  // org in the datumctl environment, and we must NOT mutate remote billing to
  // create one. This dev-only flag (already used by the fraud-redirect path)
  // must also short-circuit orgLegacySetupMiddleware/projectLegacySetupMiddleware
  // so automated dev sessions can reach a real project. See the note to
  // portal-core; until that wiring lands, the four project-navigation specs
  // stay red (honest), while registry/auth/API assertions pass.
  overrideEnv.ONBOARDING_DEV_BYPASS = 'true';

  // 3. Navigation target — verified against the TOKEN's environment (read-only).
  const effectiveApiUrl = alignment.effectiveApiUrl ?? envLines.apiUrl ?? 'https://api.datum.net';
  const { projectId, orgId } = await discoverProject({ token, apiUrl: effectiveApiUrl });
  log(`Navigation target: project=${projectId} org=${orgId} (api=${effectiveApiUrl})`);

  // 4a. Sample plugin server.
  log(`Starting sample plugin: ${CMD_SAMPLE_PLUGIN}`);
  const sample = startServer({ name: 'sample-plugin', command: CMD_SAMPLE_PLUGIN, cwd: REPO_ROOT });
  await waitForHttp(SAMPLE_MANIFEST_URL, {
    timeoutMs: 120_000,
    label: 'sample plugin manifest',
    logFile: sample.logFile,
  });
  log('Sample plugin manifest is serving.');

  // 4b. Tier 0 portal, statically overridden onto the sample plugin.
  await assertPortFree(TIER0_PORTAL_PORT, TIER0_PORTAL_URL);
  log(`Starting Tier 0 portal on :${TIER0_PORTAL_PORT} (PORTAL_PLUGINS=${PORTAL_PLUGINS_VALUE})`);
  const tier0 = startServer({
    name: 'portal-tier0',
    command: 'bun run dev',
    cwd: REPO_ROOT,
    env: {
      ...overrideEnv,
      PORT: String(TIER0_PORTAL_PORT),
      PORTAL_PLUGINS: PORTAL_PLUGINS_VALUE,
      AUTH_DEV_TOKEN_EXCHANGE: '1',
    },
  });
  await waitForHttp(`${TIER0_PORTAL_URL}${HEALTHZ_PATH}`, {
    timeoutMs: AUTH_HEALTH_TIMEOUT,
    expectStatus: 200,
    label: 'Tier 0 portal /_healthz',
    logFile: tier0.logFile,
  });
  log('Tier 0 portal is healthy.');

  // 4c. Exchange token → session cookie → storageState.
  log('Exchanging token for a portal session cookie…');
  await exchangeTokenForStorageState({ portalUrl: TIER0_PORTAL_URL, token });
  log('storageState written.');

  // 5. Tier 1 (kwok CRD registration path), only if prerequisites are present.
  const tier1 = detectTier1();
  if (tier1.enabled) {
    log(`Bringing up local registry: ${CMD_DEVENV_UP}`);
    execFileSync('/bin/sh', ['-c', CMD_DEVENV_UP], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      timeout: 180_000,
    });
    registerTeardownCommand({ name: 'devenv-down', command: CMD_DEVENV_DOWN, cwd: REPO_ROOT });
    await waitForFile(DEVENV_KUBECONFIG, 60_000, 'kwok kubeconfig');
    log('kwok registry is up; kubeconfig present.');

    await assertPortFree(TIER1_PORTAL_PORT, TIER1_PORTAL_URL);
    log(
      `Starting Tier 1 portal on :${TIER1_PORTAL_PORT} (PLUGIN_REGISTRY_KUBECONFIG=${DEVENV_KUBECONFIG})`
    );
    const t1 = startServer({
      name: 'portal-tier1',
      command: 'bun run dev',
      cwd: REPO_ROOT,
      env: {
        ...overrideEnv,
        PORT: String(TIER1_PORTAL_PORT),
        // Absolute path, mirroring the `devenv:portal` task.
        PLUGIN_REGISTRY_KUBECONFIG: DEVENV_KUBECONFIG,
        AUTH_DEV_TOKEN_EXCHANGE: '1',
      },
    });
    await waitForHttp(`${TIER1_PORTAL_URL}${HEALTHZ_PATH}`, {
      timeoutMs: AUTH_HEALTH_TIMEOUT,
      expectStatus: 200,
      label: 'Tier 1 portal /_healthz',
      logFile: t1.logFile,
    });
    log('Tier 1 portal is healthy.');
  } else {
    log(`Tier 1 skipped: ${tier1.reason}`);
  }

  writeRuntimeState({
    projectId,
    orgId,
    tier1Enabled: tier1.enabled,
    tier1SkipReason: tier1.reason,
    sampleSlug: SAMPLE_SLUG,
    sampleHomePath: SAMPLE_HOME_PATH,
    tier1Slug: TIER1_SLUG,
    tier1PluginName: TIER1_PLUGIN_NAME,
    alignmentNotes: alignment.notes,
    datumctlEndpoint: ctx.endpoint,
    tokenIssuer,
    platformDataPath: SAMPLE_PLATFORM_DATA_PATH,
  });
  log('Global setup complete.');
}
