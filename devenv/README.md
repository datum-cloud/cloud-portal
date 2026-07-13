# Local plugin dev environment

This directory is the **Tier 1** local plugin registry for the
[Portal Plugin System](../docs/enhancements/portal-plugin-system.md). It stands
up a real, lightweight Kubernetes API with the `PortalPlugin` CRD so you can
exercise the portal's actual watch + discovery + status machinery locally —
without a full cluster and without touching the remote platform control plane.

The guiding principle from the design: **the platform control plane stays
remote; the local environment is the plugin registry.** The portal still
authenticates and fetches orgs, projects, entitlements, and every existing
resource from the remote environment exactly as `bun run dev` does today. Only
the plugin registry and the plugin under development run locally.

## The two tiers

| Tier | What runs | Discovery source | Use it for |
|------|-----------|------------------|------------|
| **Tier 0** — direct override | plugin dev server + portal | `PORTAL_PLUGINS="<slug>=<url>"` — no Kubernetes at all | Fast UI inner loop |
| **Tier 1** — local registry | kwok + `PortalPlugin` CRD + plugin dev server + portal | `PLUGIN_REGISTRY_KUBECONFIG=<path>` — watches a real kube-apiserver | The CRD registration + discovery path |

Both feed the **identical** downstream pipeline in the portal (server-side
manifest fetch, schema + SDK-range validation, asset proxying, module-federated
loading). Tier 0 just short-circuits discovery. `static` (Tier 0) entries win on
slug collision, so you can override one plugin while the rest come from the
local registry.

Both dev sources are **hard-disabled outside development builds** — they are
plugin-loading vectors and must never exist in production.

## Layout

```
devenv/
  crds/portalplugin.yaml              PortalPlugin CRD (portal.miloapis.com/v1alpha1, cluster-scoped)
  manifests/sample-portalplugin.yaml  Sample PortalPlugin (slug: sample → http://localhost:7777)
  scripts/ensure-kwok.sh              Idempotent pinned-kwok install + cluster create
  README.md                           This file
```

Everything the harness generates lives under `.devenv/` at the repo root
(gitignored):

```
.devenv/
  bin/            pinned kwok + kwokctl binaries
  kwok/           kwok cluster state (KWOK_WORKDIR)
  kubeconfig      loopback kubeconfig for the local registry
  runtime         which runtime the cluster used (kwok-binary | kwok-docker | kind)
```

## Quick start (Tier 1)

Run from the repo root. Three terminals:

```bash
# 1. Stand up the local registry (kwok cluster + CRD). Idempotent.
task devenv:up

# 2. Serve the sample plugin on :7777. Use plugin:preview (built, proxy-safe) —
#    the portal loads plugin assets through its same-origin proxy, and the Vite
#    dev server's module URLs don't survive that proxy (see the dev-vs-preview
#    note under Task commands). plugin:dev is for the standalone :7777 preview.
task plugin:preview

# 3. Register the sample plugin, then run the portal against the registry.
task devenv:register
task devenv:portal        # PLUGIN_REGISTRY_KUBECONFIG=.devenv/kubeconfig AUTH_DEV_TOKEN_EXCHANGE=1 bun run dev
```

Then log in with your real remote account, open a real project, and the sample
plugin's nav items (Platform data, Sample Plugin) appear in the project
sidebar.

Every API call the plugin issues goes through the portal's existing Milo
control-plane proxy (`/api/proxy`) — the Platform data page reads project DNS
zones this way. There is no plugin-declared backend; a plugin's data must live
behind a Milo (or Milo-aggregated) control plane. See
[`examples/sample-plugin/README.md`](../examples/sample-plugin/README.md).

Inspect the registry the same way production is inspected:

```bash
kubectl --kubeconfig .devenv/kubeconfig get portalplugins
# NAME                  SLUG     READY   VERSION   AGE
# sample.miloapis.com   sample   True    0.3.0     30s
```

`READY` / `VERSION` are written by the **portal** (`task devenv:portal`) once it
fetches and validates the manifest — they are blank until the portal has run
against the registry at least once.

## Task commands

| Command | What it does |
|---------|--------------|
| `task devenv:up` | Ensure kwok binaries, create the cluster (idempotent), apply the CRD, write `.devenv/kubeconfig`, print next steps. Alias: `task portal:registry`. |
| `task devenv:down` | Delete the cluster and remove `.devenv/kubeconfig`. |
| `task devenv:register` | Apply `manifests/sample-portalplugin.yaml` to the registry and list plugins. |
| `task devenv:unregister` | Delete the sample PortalPlugin (exercises the portal's unload-on-delete path). |
| `task devenv:status` | Show chosen runtime, CRD, and registered plugins. |
| `task devenv:portal` | Run the portal against the local registry (Tier 1). |
| `task devenv:portal:tier0` | Run the portal in Tier 0 (no Kubernetes) via `PORTAL_PLUGINS`. |
| `task plugin:dev` | Run the sample plugin: Vite dev server (:7777). Human/standalone loop — see the dev-vs-preview note below. |
| `task plugin:preview` | Build then serve the STATIC plugin (:7777). **Proxy-safe** — use this for e2e/CI. |
| `task plugin:build` | Build the sample plugin to a static `dist/`. |
| `task crds:apply` | (Re)apply the CRD and wait for it to establish. |
| `task devenv:platform-kubeconfig` | Point the SAME portal knob at a real platform control plane (see below). |

### `plugin:dev` vs `plugin:preview` (which to serve on :7777)

Both serve the plugin on :7777, but they differ in how their module URLs resolve
when the portal loads them through the same-origin asset proxy
(`/api/plugins/<slug>/…`):

- **`task plugin:preview`** (built + `vite preview`) — the remote entry and chunks
  use **proxy-relative** paths (`./assets/…`, MF `publicPath: auto`), so they load
  correctly through the portal proxy. This is byte-for-byte the production
  asset-loading path. **Use it for `devenv:portal:tier0`, `devenv:portal`, e2e, and
  CI.**
- **`task plugin:dev`** (Vite dev, HMR) — the dev remote entry imports
  **host-absolute** paths (`/node_modules/.vite/deps/…`, `/@id/…`). Loaded through
  the proxy, those resolve against the portal origin (:3000), not :7777, and 404 —
  so the plugin won't render *through the proxy* from the dev server. `plugin:dev`
  is for the **standalone** human preview at `http://localhost:7777/` (direct,
  no proxy) and for iterating on components in isolation.

Full Vite-dev HMR *through* the portal proxy needs proxy-side support for the dev
module paths + HMR websocket (a portal-server concern, tracked as a follow-up).
Until then: automated Tier 0 = `plugin:preview`; human component HMR = `plugin:dev`
standalone.

## How `PLUGIN_REGISTRY_KUBECONFIG` works

The portal server's plugin registry is a **pluggable source**. In dev builds it
recognizes `PLUGIN_REGISTRY_KUBECONFIG=<path>`: it starts a real Kubernetes
watch of `PortalPlugin` resources against whatever cluster that kubeconfig
points at, and writes plugin health back into each resource's `status`. That is
exactly what production does against the platform control plane — the only thing
that changes between local and production is which kubeconfig the portal watches.

`task devenv:portal` sets `PLUGIN_REGISTRY_KUBECONFIG=.devenv/kubeconfig` (the
local kwok cluster) plus `AUTH_DEV_TOKEN_EXCHANGE=1` (so the portal can obtain
the machine credential it needs to watch/patch the registry in dev). Everything
else about the portal — auth, orgs, projects, entitlements — stays pointed at
the remote environment via your normal `.env`.

## The runtime kwok uses

`ensure-kwok.sh` installs a **pinned** kwok/kwokctl (`v0.7.0` by default;
override with `KWOK_VERSION`) into `.devenv/bin/` — direct GitHub release
download for your OS/arch, falling back to `brew install kwok`. It then creates
the cluster, trying runtimes in order and recording the winner in
`.devenv/runtime`:

1. **`kwok-binary`** — no Docker. kwok downloads darwin/arm64 (and linux/amd64)
   `kube-apiserver`, `etcd`, `kube-controller-manager`, `kube-scheduler` from the
   `kwok-ci/k8s` release fork and runs them as local processes. Cluster is ready
   in ~2–12 s. **This is what macOS arm64 uses.**
2. **`kwok-docker`** — Docker runtime, used only if the binary runtime can't run.
3. **`kind`** — contingency only, if kwok is unusable entirely. Disable with
   `DEVENV_NO_KIND=1` to fail loudly instead.

`task devenv:down` reads `.devenv/runtime` and tears down whichever was used.

## Platform-backed option (real control plane)

Once a plugin passes the local Tier 1 loop, a service team can point the **same**
portal registry knob at a real Datum control plane instead of kwok — no code
change, just a different kubeconfig. This uses the `datumctl` credential the team
already has:

```bash
# Requires an active `datumctl` session (datumctl login) and an org or project id.
DATUM_ORG=<org-id> task devenv:platform-kubeconfig
#   → writes .devenv/platform-kubeconfig (kubectl exec-plugin backed by datumctl)

PLUGIN_REGISTRY_KUBECONFIG=.devenv/platform-kubeconfig AUTH_DEV_TOKEN_EXCHANGE=1 bun run dev
```

`devenv:platform-kubeconfig` is a documented convenience for humans validating
against staging/production; it is **never** run by the automated tests, which
must stay hermetic against the local kwok registry.

## Requirements

- `task` (go-task), `kubectl`, and `curl`.
- For the default `kwok-binary` runtime: outbound access to GitHub releases (for
  the one-time binary download). No Docker needed.
- For `kwok-docker` / `kind` fallbacks: a running Docker daemon.
