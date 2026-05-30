# `@/modules/rbac`

Role-Based Access Control toolkit for cloud-portal. Every resource route in
the app builds on this module.

## What this module gives you

- A **route DSL** (`defineResourceRoute`) that wraps server-side permission
  gating, primary fetch, optional companion fetches, redirect-on-deletion,
  and React Query cache seeding into a single declarative config.
- A **batched permission hook** (`useResourcePermissions`) that returns
  named flag properties (`canList`, `canCreate`, `canViewWaf`, …) from a
  single SSAR.
- **UI primitives** (`<PermissionButton>`, `<PermissionGate>`,
  `<RestrictedState>`, `<RestrictedOverlay>`) that replace inline
  `{canX && …}` conditional rendering and post-hoc `if (!canX) toast.error(…)`
  guards.
- A **typed loader-data reader** (`useGuardedRouteData`) for child routes
  whose ancestor used the DSL.
- A **page wrapper** (`<GuardedPage>`) for routes that need restricted-state
  rendering + cache seeding without the full DSL.

## Architecture in one diagram

Every resource route operates at four canonical layers. Each layer has one
responsibility and one primitive.

| Layer | Responsibility | Primitive |
|---|---|---|
| 1. Loader gate (server) | Block denied requests before any data is fetched. | `gateRouteAccess` (wrapped by `defineResourceRoute`) |
| 2. Data fetch/watch (client) | Skip fetches when the user lacks the verb. | `enabled: canX` on every `useX` / `useXWatch` |
| 3. UI primitive (client) | Render in a permission-aware way. | `<PermissionButton>` / `<PermissionGate>` / `<RestrictedState>` / `<RestrictedOverlay>` |
| 4. Cross-resource action (client) | Gate buttons against the resource they *mutate*, not the page's primary. | `<PermissionButton resource="..." />` with the mutation target's verb |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full model, defense-in-depth
rationale, error classes, loading-state rules, and the free-floating route
rule.

## How to use

### Build a list route

```tsx
// app/routes/project/detail/dns-zones/index.tsx
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { createDnsZoneService } from '@/resources/dns-zones';

const route = defineResourceRoute({
  type: 'list',
  resource: 'dnszones',
  group: 'dns.networking.miloapis.com',
  scope: 'project',
  fetch: ({ projectId }) => createDnsZoneService().list(projectId),
  restrictedMessage: "You don't have permission to view DNS.",
  metaTitle: 'DNS',
});

export const { loader, meta } = route;
export default route.Page(({ data }) => <DnsZonesInner zones={data} />);
```

The DSL emits `loader`, `meta`, and `Page` for the list variant. The loader
gates by `verb: 'list'` and returns either `{ restricted: true }` (rendered
as `<RestrictedState>`) or `{ restricted: false, data, companions: {} }`.

### Build a detail route with companions and redirect-on-deletion

```tsx
// app/routes/project/detail/dns-zones/detail/layout.tsx
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { createDnsZoneService, dnsZoneKeys } from '@/resources/dns-zones';
import { createDomainService, domainKeys } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';

const route = defineResourceRoute({
  type: 'detail',
  resource: 'dnszones',
  group: 'dns.networking.miloapis.com',
  scope: 'project',
  paramName: 'dnsZoneId',
  notFoundLabel: 'DNS',
  fetch: ({ projectId, id }) => createDnsZoneService().get(projectId, id),
  redirectIfDeleting: ({ data, projectId }) =>
    data.deletionTimestamp
      ? {
          to: `/project/${projectId}/dns-zones`,
          toast: {
            title: 'DNS is being deleted',
            description: 'This DNS is currently being deleted and is no longer accessible',
            type: 'message',
          },
        }
      : null,
  companions: {
    // A viewer with dnszones access may not have domains access — tolerate
    // the companion gate denial so the page still renders.
    domain: {
      resource: 'domains',
      group: 'networking.datumapis.com',
      verb: 'get',
      scope: 'project',
      onError: 'tolerate',
      fetch: ({ data, projectId }) =>
        data.status?.domainRef?.name
          ? createDomainService().get(projectId, data.status.domainRef.name)
          : null,
    },
  },
  breadcrumb: ({ data }) => data?.domainName ?? 'DNS',
  metaTitle: ({ data }) => data?.domainName ?? 'DNS',
  restrictedMessage: "You don't have permission to view this DNS zone.",
  seedCache: ({ data, companions, projectId, id }) => [
    [dnsZoneKeys.detail(projectId, id), data],
    [domainKeys.detail(projectId, companions.domain?.name ?? ''), companions.domain],
  ],
});

export const { loader, handle, meta } = route;
export default route.Page(({ data, companions }) => (
  <DnsZoneDetailInner dnsZone={data} domain={companions.domain} />
));
```

### Gate action buttons inside a page

```tsx
import { useResourcePermissions } from '@/modules/rbac';
import { PermissionButton, PermissionGate } from '@/modules/rbac';

function DnsZoneRecords() {
  const { canList, canCreate, canPatch, canDelete } = useResourcePermissions({
    resource: 'dnsrecordsets',
    group: 'dns.networking.miloapis.com',
    scope: 'project',
    verbs: ['list', 'create', 'patch', 'delete'],
  });

  // Pass enabled: canList to every fetch/watch hook.
  const { data } = useDnsRecords(projectId, dnsZoneId, undefined, { enabled: canList });

  return (
    <>
      <PermissionButton
        resource="dnsrecordsets"
        verb="create"
        group="dns.networking.miloapis.com"
        scope="project"
        deniedReason="You don't have permission to add a DNS record"
        onClick={openCreateForm}
      >
        Add record
      </PermissionButton>

      {/* Pencil icons and other non-button affordances use PermissionGate */}
      <PermissionGate
        resource="dnsrecordsets"
        verb="patch"
        group="dns.networking.miloapis.com"
        scope="project"
        mode="disable"
        deniedReason="You don't have permission to edit DNS records"
      >
        <IconButton icon={PencilIcon} onClick={openEditForm} />
      </PermissionGate>
    </>
  );
}
```

### Cross-resource actions

When a button on resource A triggers a mutation on resource B, gate it
against B — not against A.

```tsx
// Inside a DNS records page, "Protect with AI Edge" creates an HTTP proxy.
// Gate by httpproxies:create, not dnsrecordsets:patch.
<PermissionButton
  resource="httpproxies"
  verb="create"
  group="networking.datumapis.com"
  scope="project"
  onClick={protectWithEdge}
>
  Protect with AI Edge
</PermissionButton>
```

### Read typed loader data in child routes

```tsx
// app/routes/project/detail/dns-zones/detail/dns-records.tsx
import { useGuardedRouteData } from '@/modules/rbac';
import type { DnsZone } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';

export default function DnsRecordsPage() {
  const { data: dnsZone, companions } = useGuardedRouteData<
    DnsZone,
    { domain: Domain | null }
  >('dns-zone-detail');

  // dnsZone is typed; companions.domain may be null (tolerate semantics).
  return <DnsRecordsInner dnsZone={dnsZone} domain={companions.domain} />;
}
```

The hook throws if called on a restricted route, signaling a routing bug
(the parent should have short-circuited).

## Public API at a glance

| Export | Purpose | Import path |
|---|---|---|
| `defineResourceRoute(...)` | Route DSL — emits `{loader, handle, meta, Page}` | `@/modules/rbac/define-resource-route` (deep — server-importing) |
| `useResourcePermissions({ verbs, subResources })` | Batched perm check with named flags | `@/modules/rbac` |
| `useGuardedRouteData(routeId)` | Typed child-route loader-data reader | `@/modules/rbac` |
| `<GuardedPage>` | Page wrapper: RestrictedState + cache seeding | `@/modules/rbac` |
| `<PermissionButton>` | Gated button trigger | `@/modules/rbac` |
| `<PermissionGate>` | Gated wrapper (`hide` / `disable` / `fallback`) | `@/modules/rbac` |
| `<PermissionCheck>` | Bulk-check render prop | `@/modules/rbac` |
| `<RestrictedState>` | Full-page deny | `@/components/restricted-state` |
| `<RestrictedOverlay>` | Partial deny | `@/components/restricted-overlay` |
| `gateRouteAccess()` | Server-only loader gate (wrapped by the DSL) | `@/modules/rbac/server/check-permission` |

## Module layout

```
app/modules/rbac/
├── README.md                 ← this file
├── ARCHITECTURE.md           ← stable model: layers, error classes, loading rules
├── CONVENTIONS.md            ← prescriptive rules + adding/migrating recipes
├── define-resource-route.tsx ← the DSL (server-importing — deep import only)
├── use-resource-permissions.ts
├── use-guarded-route-data.ts
├── types.ts                  ← DSL + hook types (DslLoaderData, etc.)
├── index.ts                  ← client-safe barrel
├── client/                   ← BFF API client
├── components/               ← PermissionButton, PermissionGate, PermissionCheck, GuardedPage, withPermission
├── context/                  ← RbacContext + RbacProvider
├── hooks/                    ← usePermission, usePermissions, usePermissionCheck, useAccessReview, useHasPermission, useCheckQuery
├── observability/            ← metrics
└── server/                   ← gateRouteAccess, RbacService (DO NOT import from client)
```

> ⚠️ The `index.ts` barrel is the **client-safe entry point**. Server-only
> code (`./server/*`) and `defineResourceRoute` (which transitively imports
> server modules via `gateRouteAccess` → `metrics` → `prom-client`) must be
> imported directly to avoid pulling server-only deps into the browser
> bundle. Route files that need `defineResourceRoute` must use the deep
> import path shown above.

## Tests

- Pure-logic unit tests: `bun run test:rbac` (Bun's test runner against
  `app/modules/rbac/**/*.test.ts`).
- React component tests: `bun run test:unit:prod` or `bun run test:unit:debug`
  (Cypress component testing — see `cypress/component/guarded-page.cy.tsx`,
  `cypress/component/use-resource-permissions.cy.tsx`,
  `cypress/component/use-guarded-route-data.cy.tsx`,
  `cypress/component/define-resource-route-page.cy.tsx`).

## Convention enforcement

The conventions in [CONVENTIONS.md](./CONVENTIONS.md) are enforced through
PR review and the existing E2E test suite per resource. Reviewers should
flag inline `{canX ? ... : null}` rendering and post-hoc
`if (!canX) toast.error(...)` guards — both have canonical replacements
(`<PermissionGate>` and `<PermissionButton>` respectively).
