# Sample Portal Plugin

A standalone reference plugin for the
[Portal Plugin System](../../docs/enhancements/portal-plugin-system.md). It is a
**Module Federation remote** (plus a tiny backend) that the cloud portal loads
at runtime. It exercises every v1 extension point AND both data-proxy tiers, so
it doubles as living documentation for plugin authors and as the end-to-end test
fixture for the portal repo.

**Nav + pages (a mini service console):**

- `portal.nav/project` — three sidebar items: **Instances** (icon `server`),
  **Platform data** (icon `globe`, RBAC-gated), and **Sample Plugin** (icon
  `puzzle`, the minimal demo).
- `portal.page/project`:
  - `instances` — a table of instances from the plugin's **own backend** through
    the portal proxy (TanStack Query, status badges, refresh, loading/error/empty
    states, a "UserToken mediation" badge). Default export `InstancesList`.
  - `instances/:instanceId` — instance detail with a **Restart** button
    (`useMutation` + cache invalidation; polls while Restarting). Default export
    `InstanceDetail`.
  - `platform` — read-only **DNS zones** for the current project, read from the
    **Milo control plane** through `/api/proxy`. Carries
    `requirements.permissions {dns.networking.miloapis.com, dnszones, list}`, so
    the host RBAC-gates the nav item and page. Default export `PlatformData`.
  - `home` — heading, interactive counter, route-param readout (the minimal demo;
    default export `SamplePage`).
  - `items/:itemId` — a detail page resolved from a **named export**
    (`$codeRef: "SampleDetail.DetailView"`), exercising the host's `Module.export`
    coderef path and `:param` handling.
- `portal.card/project-home` — a home-page card showing a **live instance count**
  via TanStack Query (`SampleHomeCard`).

## Data & proxying — two tiers, both portal-mediated

The browser only ever calls the portal origin; the portal mediates all data.

1. **The plugin's own backend** (`backend/server.ts`, Bun on :7778) — a stand-in
   for a service team's API with in-memory instances (`GET /instances`,
   `GET /instances/:id`, `POST /instances/:id/restart`). The plugin calls it at
   `/api/plugins/sample/proxy/api/…`; the portal forwards to the backend through
   the CR's declared proxy alias `api` and injects the user's bearer token
   (`authorization: UserToken`). The backend echoes whether it saw an
   `Authorization` header (never validating/storing it) so the UI can prove the
   mediation. It needs **no CORS** — it is never called cross-origin from a browser.
2. **Milo control-plane data** — the "Platform data" page lists DNS zones via the
   portal's existing authenticated proxy at
   `/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/<id>/control-plane/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnszones`.
   No proxy alias needed — this is the common case.

Both use `@tanstack/react-query` (a host-shared singleton), so plugin queries
live in the host's cache next to built-in pages. Plugins must **not** create
their own `QueryClient`.

## This is its own project

`examples/sample-plugin/` has its **own** `package.json` and lockfile,
independent of the portal. It declares its own dependencies (`react`,
`react-dom`, `react-router`, `@tanstack/react-query`, `@module-federation/vite`,
`vite`, and `concurrently` for running the frontend + backend together) and never
touches the root `package.json`. Install and run it in isolation:

```bash
bun install
bun run dev      # Vite dev server (:7777, HMR) + backend (:7778) — standalone/direct
bun run preview  # built dist/ served (:7777) + backend (:7778) — proxy-safe
bun run backend  # just the backend (:7778)
bun run build    # static dist/ (remoteEntry.js + plugin-manifest.json + chunks)
```

`dev` and `preview` run BOTH the frontend and the backend (via `concurrently`).
From the repo root: `task plugin:dev`, `task plugin:preview`, `task plugin:backend`,
`task plugin:build`.

### Serve `dev` or `preview`? (it matters for the portal proxy)

The portal loads plugin assets through its **same-origin asset proxy**
(`/api/plugins/sample/…`), never directly from :7777. That changes which server
you want on :7777:

- **`preview`** (built) — remote-entry/chunk imports are **proxy-relative**
  (`./assets/…`, MF `publicPath: auto`), so they load correctly through the
  portal proxy. This is the production asset-loading path. **Use `preview` (or
  `task plugin:preview`) whenever the portal will load the plugin — Tier 0, Tier
  1, e2e, CI.**
- **`dev`** (Vite, HMR) — the dev remote entry imports **host-absolute** URLs
  (`/node_modules/.vite/deps/…`, `/@id/…`). Through the proxy those resolve
  against the portal origin and 404, so the plugin won't render *via the proxy*.
  Use `dev` for the **standalone** preview at `http://localhost:7777/` (direct,
  no proxy) and for iterating on components in isolation.

## What it serves

| Server | Path | What | Who fetches it |
|--------|------|------|----------------|
| Vite (:7777) | `/plugin-manifest.json` | The portal plugin contract manifest | Portal server, server-side |
| Vite (:7777) | `/remoteEntry.js` | The Module Federation remote entry | Portal client, via the asset proxy |
| Vite (:7777) | `/` | Standalone human preview of the pages + card | Humans only — the portal never loads this |
| Backend (:7778) | `/instances`, `/instances/:id`, `POST /instances/:id/restart` | The plugin's own API | Portal server, via the `api` proxy alias |

The portal never talks to `localhost:7777` from the browser. It fetches the
manifest server-side and proxies every asset through
`/api/plugins/sample/…` (same-origin), so plain `http://localhost` in dev is
fine.

## How it fits the contract

`public/plugin-manifest.json` conforms to the `PluginManifest` type in
[`app/modules/plugins/types.ts`](../../app/modules/plugins/types.ts):

```jsonc
{
  "name": "sample.miloapis.com",            // MUST equal the MF container name
  "version": "0.2.0",
  "sdk": { "name": "@datum-cloud/portal-plugin-sdk", "range": "^1.0.0" },
  "remoteEntry": "remoteEntry.js",          // MUST equal vite.config federation `filename`
  "exposedModules": {                       // keys are the $codeRef targets
    "InstancesList": "./src/pages/instances-list.tsx",
    "SampleHomeCard": "./src/cards/sample-home-card.tsx"
    // …SamplePage, SampleDetail, InstanceDetail, PlatformData
  },
  "extensions": [ /* 3 nav, 5 page, 1 card */ ]
}
```

Three things must stay in lockstep:

1. **MF container `name`** (`vite.config.ts`) = manifest `name` = the deterministic
   `PortalPlugin` metadata.name — the host keys the remote by this id.
2. **`filename`** (`vite.config.ts`) = manifest `remoteEntry`.
3. **MF `exposes` keys** (`./SamplePage`) = manifest `exposedModules` keys
   (`SamplePage`) = the `$codeRef` values in `extensions`.

### Shared singletons

The host provides exactly four shared singletons via Module Federation:
`react`, `react-dom`, `react-router`, and `@tanstack/react-query` — backed by
the host's own instances, so the host always wins and the plugin renders with
the host's exact React, router, and query client. `vite.config.ts` marks the
ones this sample uses (`react`, `react-dom`, `react-router`) `singleton: true`
with the host's majors (react 19, react-router 7). Declare shared deps in the
`shared` block — do **not** externalize them (`import: false`), which breaks the
shared-scope negotiation. Never bundle your own React — two React instances
break hooks. Components read route params with `useParams()` from the shared
`react-router`, exactly like a built-in page.

Only share what you import: if your plugin uses React Query, add
`'@tanstack/react-query': { singleton: true, requiredVersion: '^5.0.0' }` to get
the host's client for free. Do **not** add `@datum-cloud/datum-ui` or the plugin
SDK to `shared` in v1 — the host does not provide them as singletons yet, so a
plugin that imports datum-ui simply bundles its own copy (fine, as long as its
CSS ships).

Exposed components are referenced by `$codeRef`: a bare name (`"SamplePage"`)
resolves the module's **default export**; `"Module.export"`
(`"SampleDetail.DetailView"`) resolves a **named export**. This sample uses both.
Page components receive no props; they read `projectId` / `serviceSlug` / route
params from `useParams()`.

## Copy this for your own service

1. Copy `examples/sample-plugin/` into your service repo.
2. Rename the MF container `name`, manifest `name`, and slug to your service
   (e.g. `compute.miloapis.com`, slug `compute`).
3. Replace the page/card components with your UI. Add extensions as needed
   (more `portal.page/project` routes, more nav items, a home card).
4. Keep `exposes`, `exposedModules`, and `$codeRef`s in sync (see above).
5. For your own backend: call it at `/api/plugins/<slug>/proxy/<alias>/…` and
   declare the matching `proxy` alias in your `ServiceConfiguration`'s
   `spec.userInterface` (`authorization: UserToken` to receive the user's token).
   For Milo control-plane data, call `/api/proxy/…` — no alias needed — and add
   `requirements.permissions` to the extension so the host RBAC-gates it. Use
   `@tanstack/react-query` (the host singleton) and never create your own client.
6. Deploy the built `dist/` behind an HTTPS endpoint your team operates, and set
   `assets.baseURL` in your `ServiceConfiguration`'s `spec.userInterface` to that
   origin.
7. Iterate locally against the real portal using
   [`devenv/`](../../devenv/README.md): `task plugin:preview` (built, proxy-safe)
   for the Tier 0/1 inner loop.

When you release the `ServiceConfiguration` through the catalog, the services
operator fans out a `PortalPlugin` and the portal discovers your plugin — no
portal code change, no portal deploy.

## Testing your plugin against the portal

`e2e/` is a **copy-me** Playwright harness that proves your plugin integrates
with a real, running portal: it registers your `PortalPlugin` CR against a local
kwok registry, logs in with your real account, and asserts your nav items and
pages render — then that deleting the CR unloads the plugin. It is generic and
**config-driven**: you edit one config file, not test code.

**Prerequisites**

- `datumctl login` — a real platform account (the suite is strictly READ-ONLY
  against the remote platform: it logs in, lists, and navigates; it never
  creates/updates/deletes remote resources).
- A `cloud-portal` checkout. In-tree the sample uses `../..`; set
  `PORTAL_REPO_DIR=/path/to/cloud-portal` from your own repo.
- `task`, `kubectl`, and outbound access for the portal's `task devenv:up` to
  fetch its pinned `kwokctl` (no Docker needed).
- Chromium once: `bunx playwright install chromium`.

**Run**

```bash
bun run test:e2e
```

`e2e/global-setup.ts` fetches a datumctl token, aligns the portal's `API_URL` to
it, brings up the kwok registry, serves your built plugin (`bun run preview`),
starts the portal watching that registry, and exchanges the token for a session
cookie. `e2e/plugin.spec.ts` then applies your CR and asserts discovery → nav →
pages → unload. `e2e/global-teardown.ts` stops everything and runs
`task devenv:down`.

**Adapt it to your plugin** — edit only [`e2e/plugin-e2e.config.ts`](e2e/plugin-e2e.config.ts):
your `slug` + `manifestName`, the path to your `PortalPlugin` CR
([`e2e/portalplugin.yaml`](e2e/portalplugin.yaml)), your `navItems` (path +
title), the `pages` to smoke-test (path + a ready selector), and how your plugin
is served (`pluginCommand` / ready URLs / whether a backend starts). No changes
to `harness.ts` or `plugin.spec.ts` needed.

**Copy it into your repo**: copy `e2e/`, `playwright.config.ts`, and the
`test:e2e` script + `@playwright/test` devDep from `package.json`. The harness
has **no imports from the cloud-portal repo**, so it runs standalone against a
`PORTAL_REPO_DIR` checkout.

**Ports** (in-tree): this reuses the portal dev port (3000), the sample's
preview ports (7777 web / 7778 backend), and the shared `.devenv` kwok cluster —
so don't run it at the same time as the cloud-portal repo's own
`test:e2e:plugins`. Override with `PORTAL_REPO_DIR`, `E2E_PORTAL_PORT`,
`E2E_PLUGIN_PORT`, `E2E_BACKEND_PORT`, or `E2E_PROJECT_ID` as needed.
