# RBAC Conventions

Prescriptive rules for using the RBAC toolkit in cloud-portal route and
feature code. See `ARCHITECTURE.md` for the underlying model.

## Primitive map (strict 1:1)

| UI pattern | Canonical primitive | Notes |
|---|---|---|
| Button trigger (header action, toolbar, danger zone, row action button) | `<PermissionButton>` | Existing component |
| Non-button interactive (pencil icon, Switch, custom trigger) | `<PermissionGate mode="disable">` | Wraps child with `disabled=true` + tooltip |
| Whole-card / whole-section hide | `<PermissionGate mode="hide">` | Renders fallback (default null) when denied |
| Row action visibility | `createActionsColumn` item's `hidden: () => !canX` | Today's table convention; unchanged |
| Conditional render with fallback | `<PermissionGate mode="fallback" fallback={...}>` | Renders fallback in denied state |
| Restricted full page | `<RestrictedState>` (auto-emitted by `<GuardedPage>` / DSL) | Existing component |
| Restricted section inside an allowed page | `<RestrictedOverlay>` | Existing component |
| Restricted column cell (e.g. WAF column) | `Tooltip + em-dash badge` per AI Edge listing convention | Pattern, not a primitive |

## Banned patterns

### Inline conditional rendering on permission flags

```tsx
// BANNED
{canCreate && <Button />}
{canDelete ? <DeleteButton /> : null}
{!canEdit ? <Locked /> : <Editor />}

// REQUIRED
<PermissionGate verb="create" resource="..." mode="hide">
  <Button />
</PermissionGate>
```

Enforcement: PR review.

### Custom `renderEditButton` / conditional-tooltip helpers

```tsx
// BANNED (this exact shape lives in config-card.tsx today)
function renderEditButton(allowed, deniedReason, onClick) {
  const btn = <button disabled={!allowed} onClick={onClick}>...</button>;
  return allowed ? btn : <Tooltip message={deniedReason}>{btn}</Tooltip>;
}

// REQUIRED
<PermissionGate verb="patch" resource="httpproxies" mode="disable" deniedReason="...">
  <button onClick={onClick}>...</button>
</PermissionGate>
```

### Post-hoc handler-level toast guards

```tsx
// BANNED
const handleEdit = (r) => {
  if (!canPatch) { toast.error("..."); return; }
  // ...
};

// REQUIRED — gate the button, never the handler
<PermissionButton verb="patch" ...>Edit</PermissionButton>
mutation.onError: (e) => toast.error(e.message || 'Failed to update')
```

Enforcement: PR review.

## `defineResourceRoute` reference

Two variants, one entrypoint. See implementation in
`app/modules/rbac/define-resource-route.tsx` and tests in
`define-resource-route.test.ts`.

### List variant

```ts
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

### Detail variant

```ts
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
    domain: {
      resource: 'domains',
      group: 'networking.datumapis.com',
      verb: 'get',
      scope: 'project',
      onError: 'tolerate', // viewer may have dnszones but not domains
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

> **Import path:** `defineResourceRoute` is not in the `@/modules/rbac`
> client barrel — it transitively imports server-only modules. Route files
> must deep-import: `import { defineResourceRoute } from '@/modules/rbac/define-resource-route';`

### Emitted artifacts

- `loader` — full server gate + fetch + companions + redirect pipeline.
- `handle` (detail only) — breadcrumb function reading loader data shape.
- `meta` — wraps `mergeMeta` + `metaObject`.
- `Page(render)` — wraps a render prop in `<GuardedPage>`.
- `useGuardedRouteData(routeId)` — child routes read typed loader data.

### `RedirectDescriptor` required fields

`redirectIfDeleting` must return `{ to, toast: { title, description, type? } } | null`. Both `toast` and `toast.description` are required (toast type defaults to `'message'`). This is intentional — empty/missing descriptions render as visually-broken toasts.

### Escape hatches

- Replace any one of `{loader, handle, meta}` with bespoke code while keeping
  the others.
- Drop down to direct `gateRouteAccess` + `withLoaderErrors` if the DSL
  genuinely can't fit. Add `// rbac-audit: bespoke — <reason>` comment.

## `useResourcePermissions` reference

```ts
const { canList, canCreate, canPatch, canDelete, isLoading } = useResourcePermissions({
  resource: 'httpproxies',
  group: 'networking.datumapis.com',
  scope: 'project',
  verbs: ['list', 'create', 'patch', 'delete'],
});
```

### Sub-resources

```ts
const { canList, canViewWaf, canEditWaf } = useResourcePermissions({
  resource: 'httpproxies',
  group: 'networking.datumapis.com',
  scope: 'project',
  verbs: ['list'],
  subResources: [
    {
      resource: 'trafficprotectionpolicies',
      alias: 'waf',
      verbs: ['list', 'patch'],
      options: { staleTime: 0, refetchOnMount: 'always' },
    },
  ],
});
```

Flag-name rules:
- Primary verb `verb` → `can<Capitalize(verb)>` (e.g. `canList`, `canCreate`).
- Sub-resource verb-to-prefix map: `list/get → View`, `create → Create`,
  `patch/update → Edit`, `delete → Delete`. Other verbs use the capitalized
  verb name.
- Sub-resource alias capitalized first letter only. So `alias: 'waf', verbs:
  ['list']` → `canViewWaf`.

> **Sub-resource `options` limitation:** per-sub-resource React Query options
> (`staleTime`, `refetchOnMount`, `enabled`) on `ResourcePermissionSubResource.options`
> are NOT honored by the implementation today — all verbs and sub-resources
> share a single batched query. If you need per-check freshness (e.g.
> `staleTime: 0` to force re-validation on every mount), use a separate
> `usePermission(...)` call for that one check.

## Adding a new resource (checklist)

1. Create `app/resources/<plural-resource-name>/` with the standard files
   (`*.schema.ts`, `*.adapter.ts`, `*.service.ts`, `*.queries.ts`,
   `*.watch.ts`, `index.ts`).
2. In `app/routes/<scope>/<resource>/index.tsx`, build the list route using
   `defineResourceRoute({ type: 'list', ... })`.
3. If there's a detail route, build it using `defineResourceRoute({ type:
   'detail', ... })` in `<resource>/detail/layout.tsx`.
4. For tab-style child routes, use `useGuardedRouteData('<route-id>')` to read
   loader data with typed restricted-handling.
5. Inside each page, call `useResourcePermissions(...)` once at the top to
   batch all needed verbs.
6. Pass `enabled: canList` (or appropriate verb) to every `useX` /
   `useXWatch` hook.
7. Use `<PermissionButton>` for every button trigger, `<PermissionGate>` for
   every inline edit affordance and conditional render.
8. Add a Cypress E2E test in `cypress/e2e/rbac/<resource>.cy.ts` pinning the
   canonical RBAC scenarios (see existing AI Edge / DNS Zones tests in
   sub-projects #2 and #3 for templates).

## Migrating an existing route

Worked example: `dns-zones/:dnsZoneId/discovery` — currently has no gate
and sits outside the `dns-zone-detail` layout.

### Before

```tsx
// routes/project/detail/dns-zones/discovery.tsx
export default function DnsZoneDiscoveryPage() {
  const { projectId, dnsZoneId } = useParams();
  return <div><DnsZoneDiscoveryPreview projectId={projectId ?? ''} dnsZoneId={dnsZoneId ?? ''} /></div>;
}
```

### After

```tsx
// routes/project/detail/dns-zones/discovery.tsx
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';

const route = defineResourceRoute({
  type: 'detail',
  resource: 'dnszones',
  group: 'dns.networking.miloapis.com',
  scope: 'project',
  paramName: 'dnsZoneId',
  notFoundLabel: 'DNS',
  fetch: ({ projectId, id }) => createDnsZoneService().get(projectId, id),
  restrictedMessage: "You don't have permission to view this DNS zone.",
  metaTitle: 'DNS Zone Discovery',
});

export const { loader, meta } = route;
export default route.Page(({ data }) => (
  <div className="mx-auto w-full max-w-4xl py-8">
    <DnsZoneDiscoveryPreview projectId={data.status?.projectId ?? ''} dnsZoneId={data.name} />
  </div>
));
```

The migration adds: server gate, restricted state UI, type-safe data access,
no skeleton flash, and consistent meta/breadcrumb handling — for a net
reduction in per-route boilerplate.
