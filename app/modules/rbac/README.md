# RBAC Module

Role-Based Access Control for the Cloud Portal. Each permission is resolved with a
**per-check Kubernetes `SelfSubjectAccessReview`**, evaluated **server-side** by the
BFF and routed to the correct control-plane base for the check's scope. There is no
client-side rule evaluation and no full rule-set seeding — every gate, hook, and
component asks the BFF whether the current user may perform one specific action.

## Table of Contents

- [Architecture](#architecture)
- [Public API](#public-api)
  - [Hooks](#hooks)
  - [Components](#components)
  - [Server](#server)
- [Failure Policy](#failure-policy)
- [Observability](#observability)
- [Testing](#testing)
- [Important: client vs. server imports](#important-client-vs-server-imports)

---

## Architecture

```
Browser                                  BFF (Hono)                Control plane
───────                                  ──────────                ─────────────
usePermission / PermissionGate / …
   │  one check per (resource, verb, …)
   ▼
checkPermissionAPI ──────────► POST /api/permissions/check ─┐
checkPermissionsBulkAPI ─────► POST /api/permissions/bulk-check
                                          │                 │
                                          ▼                 ▼
                              RbacService.checkPermission(s)
                                          │  SelfSubjectAccessReview
                                          ▼
                              scope-aware base routing:
                                org     → org control-plane + org namespace
                                user    → user/root control-plane (root resources)
                                project → project control-plane
                                          │
                                          ▼
                                 { allowed, denied, reason }
```

Key points:

- **Per-check `SelfSubjectAccessReview`** — every permission check is its own
  server-side review against the live control plane. Nothing is evaluated in the
  browser.
- **Scope-aware base routing** (`RbacService.resolveBaseURL`): the check's `scope`
  picks the control-plane base the review is posted to.
  - `scope: 'org'` (**default**) → the organization control-plane, using the
    org namespace.
  - `scope: 'user'` → the user/root control-plane. Use this for **root resources**
    such as `organizations`.
  - `scope: 'project'` → the project control-plane (requires `projectId`).
- **Async** — checks are network calls. Hooks expose `isLoading`; gates and buttons
  render a brief verifying state until the answer arrives.
- **Fails closed** — any error (network, parse, control-plane) resolves to
  `allowed: false`. We never offer an action we cannot substantiate.
- **Bulk batching** — `usePermissionCheck` / `<PermissionCheck>` send all of their
  checks in one `POST /bulk-check` to avoid client-side N+1 requests.

---

## Public API

### Hooks

All hooks are **async** (backed by TanStack Query). They read `organizationId` and
`projectId` from `RbacProvider` context; options can override scope/projectId.

| Hook | Description |
| --- | --- |
| `usePermission(resource, verb, opts)` | Single per-check review via the BFF. Returns `{ hasPermission, isLoading, isError, error, refetch }`. Fails closed. |
| `useHasPermission` | Back-compat alias of `usePermission` (identical signature). |
| `usePermissions()` | Provider context: `{ organizationId?, projectId? }`. |
| `usePermissionCheck(checks)` | Bulk check in one request. Returns `{ permissions, isLoading, isError }` where `permissions` is keyed by `` `${resource}:${verb}` `` → `{ allowed, isLoading }`. |
| `useAccessReview(resource, verb, opts)` | Single precise review for high-stakes, named-resource checks. Returns `{ allowed, isLoading, isError, error, refetch }`. Fails closed. |

`opts` for `usePermission` / `useAccessReview`:
`{ group?, namespace?, name?, scope?, projectId?, enabled? }` (scope defaults to
`'org'`). Per-check inputs to `usePermissionCheck` / `<PermissionCheck>` accept
`{ resource, verb, group?, namespace?, name?, scope? }`.

```tsx
import { usePermission } from '@/modules/rbac';
import { buildOrganizationNamespace } from '@/utils/common';

function DeleteButton({ orgId, name }: { orgId: string; name: string }) {
  // Namespaced resource: pass the resource's namespace.
  const { hasPermission, isLoading } = usePermission('secrets', 'delete', {
    namespace: buildOrganizationNamespace(orgId),
    name,
  });
  if (isLoading || !hasPermission) return null;
  return <button onClick={onDelete}>Delete</button>;
}

function CreateOrgButton() {
  // Root resource: use scope 'user'.
  const { hasPermission } = usePermission('organizations', 'create', { scope: 'user' });
  return hasPermission ? <button>New organization</button> : null;
}
```

### Components

| Component | Description |
| --- | --- |
| `<PermissionGate mode="hide \| disable \| fallback">` | Gates `children` on a single check. Default `mode="hide"`. `disable` renders the child disabled inside a tooltip (`deniedReason` overrides the text); `fallback`/`hide` render `fallback` (default `null`) when denied. Accepts `resource`/`verb`/`group`/`name`/`namespace`/`scope`/`projectId`. |
| `<PermissionButton>` | A datum-ui `Button` that disables itself (with a tooltip) when denied. Accepts all `Button` props plus `resource`/`verb`/`group`/`name`/`namespace`/`scope`/`projectId`/`deniedReason`. |
| `<PermissionCheck checks operator="AND \| OR">` | Renders `children` when the combined bulk checks pass, else `fallback`. |
| `withPermission(Component, gateConfig)` | HOC wrapping a component in a `PermissionGate`. |
| `RestrictedOverlay` | Overlay UI for restricted surfaces, in `app/components/restricted-overlay`. |

```tsx
import { PermissionGate, PermissionButton } from '@/modules/rbac';

<PermissionGate
  resource="secrets"
  verb="delete"
  namespace={buildOrganizationNamespace(orgId)}
  mode="disable"
  deniedReason="Ask an admin">
  <DeleteButton />
</PermissionGate>;

<PermissionButton resource="organizations" verb="create" scope="user" variant="primary">
  New organization
</PermissionButton>;
```

### Server

Server-only entrypoints — **import directly from the deep server path**, never the
client barrel:

| Symbol | Import from | Description |
| --- | --- | --- |
| `RbacService` | `@/modules/rbac/server/rbac.service` | `checkPermission(orgId, check)` and `checkPermissions(orgId, checks)`. |
| `canInLoader(orgId, check)` | `@/modules/rbac/server/check-permission` | Fail-closed boolean permission check for SSR loaders. Wraps `RbacService.checkPermission`; returns `false` on any error. |

SSR loaders gate access with `canInLoader` and render `<RestrictedState>` inline
when the check fails — there is **no redirect or thrown 403**. The loader returns a
`restricted` flag (discriminated union) and the route component renders either the
restricted state or the gated content. The same flag pattern also drives editor
affordances (e.g. a `canManageRoles` flag from a second `canInLoader` check).

```tsx
import { canInLoader } from '@/modules/rbac/server/check-permission';
import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { buildOrganizationNamespace } from '@/utils/common';
import { withLoaderErrors } from '@/utils/errors';
import { data, useLoaderData } from 'react-router';

export const loader = withLoaderErrors(async ({ params }) => {
  const { orgId } = params;

  // Permission check first — skip fetching data the user can't see.
  const canView = await canInLoader(orgId!, {
    resource: 'allowancebuckets',
    verb: 'list',
    group: 'quota.miloapis.com',
    namespace: buildOrganizationNamespace(orgId!),
  });
  if (!canView) return data({ restricted: true as const });

  const items = await loadData(orgId!);
  return data({ restricted: false as const, items });
});

export default function Page() {
  const loaderData = useLoaderData<typeof loader>();
  if (loaderData.restricted) {
    return <RestrictedState message="You don't have permission to view this." />;
  }
  return <Content items={loaderData.items} />;
}
```

`canInLoader` accepts the same `check` shape as `RbacService.checkPermission`
(`{ resource, verb, group?, namespace?, name?, scope?, projectId? }`, scope defaults
to `'org'`).

---

## Failure Policy

Every check **fails closed**: any error in the BFF or control plane resolves to
`allowed: false` (and `denied: true`). Hooks surface the error via `isError`/`error`,
and bulk checks fail closed per item without aborting the rest of the batch.

---

## Observability

Prometheus metrics are exposed on `/metrics`:

- `rbac_permission_denied_total{resource,verb}` — denials at enforcement points.

The metrics module is side-effect-imported in `app/server/entry.ts` so the counter is
registered at startup.

---

## Testing

```bash
bun test app/modules/rbac
bun test app/resources/access-review
```

Covered: `RbacService.checkPermission`/`checkPermissions` (including scope-aware
base routing and fail-closed behavior) and the access-review adapter/service.

---

## Important: client vs. server imports

The client barrel `@/modules/rbac` is **browser-safe** and intentionally does **not**
re-export server-only modules. Importing `RbacService` or `canInLoader` from the barrel
would drag server-only dependencies (`prom-client`, the control-plane SDK, axios) into
the browser bundle.

Always import those from `@/modules/rbac/server/*`. Hooks, components, types, and the
client helpers `checkPermissionAPI`/`checkPermissionsBulkAPI` are safe from the barrel.
