# Quota Module

Client-safe quota awareness for create surfaces: derive a verdict from
AllowanceBuckets, gate triggers, explain quota 403s, and keep bucket data
fresh. See `app/modules/rbac/CONVENTIONS.md` for the RBAC counterpart —
this module deliberately mirrors its shape.

**Client-safe end to end** — never import `prom-client`, `app/server/*`, or
`@/modules/rbac/server/*` from this module.

## Fail-open principle

> `hasQuota` is `false` ONLY when a bucket exists AND `status.available <= 0`.
> Missing bucket, LIST error/403, or `Feature`-type registration →
> `isUnknown: true` → render children unmodified.

Loading/unknown states must never flash a denied verdict — `QuotaGuard`
renders children untouched until a definitive exhausted verdict.

## Exports

### `useResourceQuota({ resource, group, scope }): QuotaVerdict`

The one hook. Resolves the scope id from RBAC context, fetches buckets +
registrations, and derives the verdict for `` `${group}/${resource}` ``.

```tsx
const verdict = useResourceQuota({
  resource: 'dnszones',
  group: 'dns.networking.miloapis.com',
  scope: 'project',
});
// verdict.denied and verdict.deniedReason are the canonical gate predicate and
// tooltip copy — never re-derive them at call sites.
if (verdict.denied) showTooltip(verdict.deniedReason);
```

### `QuotaVerdict` / `QuotaScope` (types)

`QuotaScope = 'org' | 'project'` — module-facing vocabulary matching RBAC
props. The service/query layer keeps `'organization' | 'project'`; the
mapping happens ONLY inside `useResourceQuota` and `QuotaWatchBridge`.

```ts
interface QuotaVerdict {
  hasQuota: boolean;
  isLoading: boolean;
  isUnknown: boolean;
  denied: boolean; // definitive exhausted verdict — the single gate predicate
  deniedReason?: string; // auto-derived tooltip copy, set only when denied
  limit?: number;
  allocated?: number;
  available?: number;
  bucket?: AllowanceBucket;
  registration?: ResourceRegistration;
}
```

Other exported types and constants: `QuotaGuardMode` / `QuotaGuardProps`
(component props), `QuotaToastContext` (toast helpers' scope context),
`QuotaErrorKind` (`'denied' | 'retryable' | 'misconfigured'`), and
`QUOTA_DENIED_ANCHORS` (the stable Milo message anchors — also consumed by
the BFF proxy's `quota_denied_total` counter via
`app/server/observability/quota-metrics.ts`).

### `<QuotaGuard>`

Wrap a create trigger. Fail-open: loading/unknown render children
unmodified (no wrapper node). On a definitive exhausted verdict, mode
`'disable'` (default) clones the child with `disabled` plus a tooltip;
`'hide'`/`'fallback'` render `fallback`.

```tsx
<QuotaGuard resource="dnszones" group="dns.networking.miloapis.com" scope="project">
  <PermissionButton resource="dnszones" verb="create" …>Add zone</PermissionButton>
</QuotaGuard>
```

### `<QuotaExhaustedAlert>`

Banner for create/"new" pages. Renders `null` unless the verdict is a
definitive exhaustion; shows usage, a "view your quotas" link, and a
"Request increase" support action.

```tsx
<QuotaExhaustedAlert resource="httpproxies" group="networking.datumapis.com" scope="project" />
```

### `<QuotaWatchBridge scope>`

Mounts the AllowanceBucket watch once per scope layout (already mounted in
`app/routes/org/detail/layout.tsx` and `app/routes/project/detail/layout.tsx`).
Guards are pure cache readers; watch failure degrades to query staleness.

```tsx
<QuotaWatchBridge scope="project" />
```

### `showMutationErrorToast(error, { fallbackTitle, scope, orgId?, projectId? })`

Drop-in replacement for `toast.error(title, { description: error.message })`
in mutation `onError`. Quota 403s get the quota toast (View quotas /
Request increase); everything else falls back to the plain error toast.

```tsx
onError: (error) =>
  showMutationErrorToast(error, { fallbackTitle: 'DNS', scope: 'project', projectId }),
```

### `showQuotaExceededToast(error, { scope, orgId?, projectId? })`

The quota-specific toast, for callers that keep their own non-quota error
formatting (e.g. the DNS record form's `formatDnsError` path):

```tsx
if (classifyQuotaError(error) === 'denied') {
  showQuotaExceededToast(error, { scope: 'project', projectId });
  return;
}
```

### `classifyQuotaError(error)` / `isQuotaError(error)` / `parseQuotaError(error)`

Detection and parsing of Milo quota 403s. `classifyQuotaError` returns
`'denied' | 'retryable' | 'misconfigured' | null`; `parseQuotaError`
extracts `{ group, resource, resourceType }` for prefilled increase
requests. Message anchors are hardcoded Go literals, not a contract —
unknown messages classify as `null` (fail open).

### `deriveQuotaVerdict({ resourceType, buckets, registrations, isError })`

Pure verdict derivation (the fail-open rule lives here). Prefer
`useResourceQuota` in components; use this directly only in tests or
non-React code.

### `recordQuotaGateDenied` (`observability/metrics`)

Client-side breadcrumb when a gate denies. The server-side counter for REAL
quota rejections lives in the BFF proxy (`quota_denied_total`).

## The per-surface recipe

For every registered create surface, apply the trio:

1. **Guard the trigger** — wrap the create button in `<QuotaGuard>`.
2. **Swap the onError** — the dialog/mutation `onError` becomes
   `showMutationErrorToast`.
3. **Invalidate on success** — append
   `void invalidateAllowanceBuckets(queryClient);` (from
   `@/resources/allowance-buckets` — buckets only; registrations are stable
   metadata and deliberately excluded) to that resource's create/delete
   `onSuccess`.

Empty-state actions on the same pages: call `useResourceQuota` once at page
level and pass `disabled={verdict.denied}` with `tooltip={verdict.deniedReason}`.

Only gate resourceTypes with live registrations — do NOT gate unregistered
surfaces; the guard would no-op but adds noise.

| Surface (create trigger)                                                                                                        | resource / group                                | scope     |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------- |
| `app/routes/org/detail/projects/index.tsx`                                                                                      | `projects` / `resourcemanager.miloapis.com`     | `org`     |
| `app/routes/project/detail/dns-zones/index.tsx`                                                                                 | `dnszones` / `dns.networking.miloapis.com`      | `project` |
| `app/routes/project/detail/dns-zones/detail/dns-records.tsx`                                                                    | `dnsrecordsets` / `dns.networking.miloapis.com` | `project` |
| `app/routes/project/detail/secrets/index.tsx` (RBAC group is `''` for core secrets; the quota group differs)                    | `secrets` / `core.miloapis.com`                 | `project` |
| `app/routes/project/detail/domains/index.tsx`                                                                                   | `domains` / `networking.datumapis.com`          | `project` |
| `app/routes/project/detail/edge/index.tsx`                                                                                      | `httpproxies` / `networking.datumapis.com`      | `project` |
| `app/features/edge/dns-records/dns-record-alb-cell.tsx` ("Protect with ALB" — cross-resource: gate by the CREATED type) | `httpproxies` / `networking.datumapis.com`      | `project` |

### Create-page recipe

Dedicated create/"new" pages render `<QuotaExhaustedAlert>` above the form
and wrap the submit trigger in `<QuotaGuard>`:

```tsx
<QuotaExhaustedAlert resource="secrets" group="core.miloapis.com" scope="project" className="mb-4" />
…
<QuotaGuard resource="secrets" group="core.miloapis.com" scope="project">
  <Button htmlType="submit">Create</Button>
</QuotaGuard>
```

## Dual-denial rule

When a trigger is denied by BOTH quota and permission, the quota tooltip
wins: `QuotaGuard`'s wrapper span sets `pointer-events: none` on its child,
which suppresses the inner `PermissionButton` tooltip. Both statements are
true ("you can't" and "there's no capacity"); the quota message is the
actionable one.

## Banned patterns

Enforced at PR review, like `app/modules/rbac/CONVENTIONS.md`.

### Inline conditional rendering on quota flags

```tsx
// BANNED
{
  hasQuota && <Button />;
}

// REQUIRED
<QuotaGuard resource="…" group="…" scope="…">
  <Button />
</QuotaGuard>;
```

### Handler-level quota toast guards

```tsx
// BANNED — pre-emptive quota check in the click handler
const handleCreate = () => {
  if (!verdict.hasQuota) { toast.error('Quota reached'); return; }
  …
};

// REQUIRED — gate the trigger, explain the server's 403
<QuotaGuard …><Button onClick={handleCreate} /></QuotaGuard>
mutation.onError: (e) => showMutationErrorToast(e, { fallbackTitle: '…', scope, projectId })
```

### Bespoke disabled-button-with-tooltip helpers

```tsx
// BANNED
function renderQuotaButton(hasQuota, reason, onClick) {
  const btn = (
    <button disabled={!hasQuota} onClick={onClick}>
      …
    </button>
  );
  return hasQuota ? btn : <Tooltip message={reason}>{btn}</Tooltip>;
}

// REQUIRED
<QuotaGuard resource="…" group="…" scope="…">
  <button onClick={onClick}>…</button>
</QuotaGuard>;
```
