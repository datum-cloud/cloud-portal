# RBAC Architecture

The cloud-portal RBAC system has four canonical layers. Every resource route
operates at each layer. Each layer has one responsibility and one primitive.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Loader gate (server)                                           │
│   defineResourceRoute(...) calls gateRouteAccess(verb:get|list)         │
│   Returns { restricted: true } or { restricted: false, data, companions}│
├──────────────────────────────────────────────────────────────────────────┤
│ Layer 2: Data fetch/watch (client)                                      │
│   Every useX / useXWatch hook passes enabled: canX                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Layer 3: UI primitive (client)                                          │
│   PermissionButton | PermissionGate | RestrictedState | RestrictedOverlay│
├──────────────────────────────────────────────────────────────────────────┤
│ Layer 4: Cross-resource action (client)                                 │
│   Buttons gate against the resource they mutate, not the page resource  │
└──────────────────────────────────────────────────────────────────────────┘
```

## Defense-in-depth posture

- **Server gate first.** Every loader calls `gateRouteAccess` for the primary
  verb (`get` for detail, `list` for listing). Denied users see
  `RestrictedState` on the first paint with no SSR data leak and no skeleton
  flash.
- **Client UX gate always.** Every fetch/watch hook passes an `enabled: canX`
  flag. Buttons are gated by `PermissionButton`. Pencils by
  `PermissionGate mode="disable"`. Cards by `PermissionGate mode="hide"`.
- **API rejection is the final backstop.** A mutation that slipped past the
  gate (mid-session revoke, race) surfaces via `mutation.onError →
toast.error`. Toast is never used as a gate.

## Listing vs. detail server gating

Both listing and detail loaders call `gateRouteAccess`:

- Listing: verb `list`
- Detail: verb `get`

This is automatic via `defineResourceRoute` and not a per-route concern.

## Free-floating route rule

A route file is considered "covered" only if at least one of these holds:

1. The route's own `loader` calls `gateRouteAccess` (directly or via the DSL).
2. Every ancestor layout in `app/routes.ts` that matches this path calls
   `gateRouteAccess`.
3. The route has no `loader` export AND is annotated `// rbac-audit: public`
   (genuinely public routes only — auth callbacks, OIDC redirects, marketing
   pages).

Enforcement: PR review. E2E regressions per sub-project pin the runtime behavior.

## Error classes

| Class                         | Trigger                                     | Loader behavior                              | UI result                  |
| ----------------------------- | ------------------------------------------- | -------------------------------------------- | -------------------------- |
| Permission denied (primary)   | `gateRouteAccess` returns false             | `data({restricted: true})`                   | `<RestrictedState>`        |
| Permission denied (companion) | gate denies a companion                     | `tolerate` → null; `propagate` → throw       | Degrades or boundary       |
| Not found                     | primary `fetch` returns null                | `throw NotFoundError(label, id)`             | `withLoaderErrors` → 404   |
| Companion fetch failure       | companion `fetch` throws                    | `tolerate` → log + null; `propagate` → throw | Page renders w/o companion |
| Resource being deleted        | `redirectIfDeleting({data})` returns truthy | `redirectWithToast(...)`                     | Browser navigates, toast   |

All other errors propagate through `withLoaderErrors`.

## Loading-state rules

| Place                                     | Loading behavior                                                      | Reasoning                                    |
| ----------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| Page (loader)                             | n/a — synchronous from user's view                                    | `gateRouteAccess` runs server-side, blocking |
| `PermissionButton`                        | bare button rendered, toggling only `disabled`                        | Preserves in-flight clicks (#1273)           |
| `PermissionGate mode="disable"`           | child `disabled` + tooltip "Verifying permissions…"                   |                                              |
| `PermissionGate mode="hide"`              | renders fallback until check resolves                                 |                                              |
| Inline perm-driven data (e.g. WAF column) | `<SpinnerIcon size="sm" />` — never show verdict                      | AI Edge `wafPending` pattern                 |
| `<RestrictedOverlay>` for danger zones    | `<LoaderOverlay />` while loading, then `<RestrictedOverlay>` on deny | AI Edge overview pattern                     |

The "never show a verdict before resolution" rule is documented in
`CONVENTIONS.md` and checked at PR review. Sub-resources with
`staleTime: 0` (per AI Edge WAF) are supported via `useResourcePermissions`'s
per-verb `options`.

## Cross-resource gating rationale

The DSL never auto-gates non-primary resources at the loader. Cross-resource
action permissions are evaluated at the action layer (`<PermissionButton>`
or `useResourcePermissions({ subResources: [...] })`).

Why: bundling cross-resource gates into the loader couples action permissions
to page permissions, making the page expensive to render for permission-rich
users (one SSAR per gated button) and brittle when buttons move. The action
layer batches them via `usePermissionCheck`'s bulk endpoint.

## Telemetry

`observability/metrics.ts` records every `gateRouteAccess` denial. The DSL
adds no new logs; companion fetch failures use `logger.warn` at the DSL
boundary, eliminating per-route try/catch logging.
