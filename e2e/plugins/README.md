# Portal Plugin System — Playwright e2e

End-to-end proof that a plugin integrates into the portal through the two local
development tiers described in
[`docs/enhancements/portal-plugin-system.md`](../../docs/enhancements/portal-plugin-system.md):

- **Tier 0 (static override)** — portal launched with
  `PORTAL_PLUGINS=sample=http://localhost:7777`, serving the **built** sample
  plugin (`vite preview` of `dist/`). Proves nav injection, remote component
  rendering under the catch-all mount, React-singleton interactivity (counter),
  the dev-plugin badge, the not-found state, and `/api/plugins` registry health.
  (The built remote is used rather than `task plugin:dev` because the Vite dev
  remote entry imports host-absolute `/node_modules/.vite/deps/*` paths that do
  not resolve through the portal's same-origin asset proxy.)
- **Tier 1 (CRD registration path)** — portal launched with
  `PLUGIN_REGISTRY_KUBECONFIG=.devenv/kubeconfig` against a local **kwok**
  cluster. Proves the real Kubernetes watch machinery: applying a `PortalPlugin`
  CR makes the plugin appear; deleting it makes it vanish and 404s the mount.

## Host behavior this suite depends on

Two host behaviors, both surfaced by this suite and now landed by their owners:

1. **`app/modules/plugins/client/federation-host.ts`** — `registerRemotes`
   declares `type: 'module'` (owned by portal-runtime). Plugin remote entries
   (from `@module-federation/vite`) are ESM; without this the host loads them as
   a classic script and every plugin throws
   `Uncaught SyntaxError: Cannot use import statement outside a module`.
2. **`app/utils/middlewares/legacy-setup.middleware.ts`** — the org/project
   legacy-setup billing gate short-circuits when `isOnboardingDevBypassEnabled()`
   (dev-only `ONBOARDING_DEV_BYPASS=true`, owned by portal-core). Otherwise every
   project route redirects to `/onboarding/billing` for accounts without a
   billing-complete org, and no project-scoped plugin UI can render. The suite
   sets this flag on the portal it launches. Prod is unaffected (flag is inert
   outside dev).

## Safety: strictly read-only against the platform

The portal in dev talks to a **real remote platform**. This suite only logs in,
lists, and navigates. **It never creates, updates, or deletes any remote
resource.** The only mutations are against local dev servers and the local kwok
registry (PortalPlugin CRs).

## Authentication: datumctl (default) vs E2E_ACCESS_TOKEN (manual override)

The suite needs a platform access token to mint a portal session via
`POST /api/auth/dev-session`. It gets one two ways:

- **Default (local AND CI):** `datumctl auth get-token`. Locally this is your
  own `datumctl login` session. In CI, the `datum-cloud/setup-datumctl-action`
  step logs a dedicated, least-privilege service account into datumctl's
  keyring before the suite runs (credentials come from the
  `DATUM_SA_CREDENTIALS` repo secret, base64-encoded) — so CI exercises the
  exact same code path as local dev, no long-lived token secret required.
- **Manual override:** set **`E2E_ACCESS_TOKEN`** to a platform JWT to bypass
  datumctl entirely (useful if datumctl isn't installed, e.g. a quick local run
  without the CLI). Endpoint alignment is derived from the token's `iss` claim,
  and project discovery runs entirely over the authenticated platform API with
  that token, so no `datumctl whoami` is needed. Set `E2E_PROJECT_ID` to pin the
  navigation target if the token can reach many projects.

Either way the suite is strictly READ-ONLY against the platform.

## Prerequisites

Both tiers:

1. **A platform token** — `datumctl login` locally (or the CI service-account
   login), or `E2E_ACCESS_TOKEN` to override (see above). Both are read-only.
2. **Chromium** — `bunx playwright install chromium` (once).
3. **Portal deps** — `bun install` (already done in a normal checkout).

Tier 1 additionally:

4. **`task` + `kubectl`** — the `task` runner and `kubectl` on PATH. `task
   devenv:up` **bootstraps its own kwok** binary (`.devenv/bin/kwokctl` via
   `devenv/scripts/ensure-kwok.sh`), so kwokctl need not be pre-installed — but
   the bootstrap needs network access (or a local docker/kind fallback) to fetch
   it. If `task`/`kubectl`/the Taskfile are missing, Tier 1 is **skipped with a
   clear message** (Tier 0 still runs). Force with `E2E_TIER1=1`, disable with
   `E2E_TIER1=0`.

## Platform alignment

datumctl and the portal's `.env` can point at different environments (e.g.
datumctl → `api.datum.net` while `.env` → `api.staging.env.datum.net`). A token
minted for one issuer will not validate against the other. `global-setup`
detects this by comparing `datumctl whoami` + the token's `iss` claim against the
`.env` `API_URL` / `AUTH_OIDC_ISSUER` lines, and **overrides those two vars on the
portal process it launches** so the token validates. The chosen overrides are
printed at setup and included in the run report. (It reads only those two lines
from `.env` and never prints the token.)

## Running

```bash
bun run test:e2e:plugins
```

`global-setup` orchestrates everything: fetches the token, aligns endpoints,
discovers a real project to navigate to, starts the sample plugin (:7777) and the
Tier 0 portal (:3000), exchanges the token for a session cookie (storageState),
and — if kwok/devenv are present — brings up the registry and the Tier 1 portal
(:3100). `global-teardown` stops every server and runs `task devenv:down`.

Reports/artifacts (git-ignored): `playwright-report/`, `test-results/`, and
`e2e/plugins/.artifacts/` (storageState, server logs, orchestration state).

## Environment overrides

| Var | Default | Purpose |
|-----|---------|---------|
| `E2E_PROJECT_ID` / `E2E_ORG_ID` | datumctl context | Project/org to navigate to |
| `E2E_TIER0_PORT` / `E2E_TIER1_PORT` | `3000` / `3100` | Portal ports |
| `E2E_SAMPLE_PLUGIN_PORT` | `7777` | Sample plugin port |
| `E2E_SAMPLE_SLUG` / `E2E_SAMPLE_HOME_PATH` | `sample` / `home` | Sample plugin slug + first page |
| `E2E_TIER1` | auto-detect | Force Tier 1 on (`1`) or off (`0`) |
| `E2E_TIER1_PLUGIN_NAME` | `sample.miloapis.com` | PortalPlugin CR name for apply/delete |
| `E2E_SAMPLE_PLUGIN_CMD` | `task plugin:preview` | Command to build + serve the sample plugin |
| `E2E_DEVENV_UP_CMD` / `_DOWN_CMD` / `_REGISTER_CMD` | `task devenv:{up,down,register}` | Registry lifecycle |
| `E2E_REUSE_PORTAL` | unset | Reuse a portal already on the target port |
| `E2E_PORTAL_HEALTH_TIMEOUT` | `180000` | Max wait for a portal to compile + serve |

## What each tier asserts

**Tier 0** (`tier0-static-override.spec.ts`): nav item "Sample Plugin" in the
project sidebar → click navigates to `/project/<id>/services/sample/home` → remote
heading renders → counter button increments (React singleton) → dev-plugin badge
visible → bogus sub-path shows not-found → `/api/plugins` lists the plugin with
`portal.nav/project` + `portal.page/project` extension counts → the platform-data
page renders the read-only DNS-zones list or its empty state, read via the
portal's Milo control-plane proxy (`/api/proxy`) → the project-home card shows
the live DNS zone count. There is no plugin-declared backend: every API call the
plugin issues goes through Milo.

**Tier 1** (`tier1-crd-registration.spec.ts`, serial): nav empty initially →
`task devenv:register` applies the CR → nav item appears (watch-driven) and
`/api/plugins` reflects it → `kubectl delete portalplugin` removes the nav item
and 404s the mount.

## Relationship to Cypress

This suite is fully isolated: `playwright.config.ts` is scoped to `e2e/` and does
not touch `cypress.config.ts` or `cypress/**`. Playwright never sets the `CYPRESS`
env var, so the Vite server-module stubs used by Cypress are unaffected.
