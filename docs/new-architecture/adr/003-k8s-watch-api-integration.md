# ADR-003: K8s Watch API Integration

**Status:** Accepted
**Date:** 2026-01-03

---

## Context

The application used polling to keep data fresh:

1. **useRevalidation hook** - 363 lines of polling logic
2. **5-10 second intervals** - High latency for updates
3. **Constant HTTP requests** - Server load, wasted bandwidth
4. **useFetcher patterns** - Manual refetching on actions

Users would create/update/delete resources and wait several seconds before seeing changes reflected in the UI. This created a sluggish experience and generated unnecessary server load.

The control plane (Kubernetes) natively supports the Watch API, which pushes changes to clients in real-time via Server-Sent Events.

## Decision

Implement K8s Watch API integration for real-time updates, replacing polling patterns.

### Technical Details

**Watch infrastructure:**

```
app/modules/watch/
├── watch.types.ts     # WatchEvent, WatchCallback types
├── watch.manager.ts   # Connection pooling, reconnection logic
├── watch.context.tsx  # React context for WatchManager
├── use-resource-watch.ts  # Generic watch hook
└── index.ts
```

**Domain watch hooks:**

Each resource module can add a `.watch.ts` file:

```
app/resources/dns-zones/
├── dns-zone.schema.ts
├── dns-zone.adapter.ts
├── dns-zone.service.ts
├── dns-zone.queries.ts
├── dns-zone.watch.ts    # useDnsZonesWatch, useDnsZoneWatch
└── index.ts
```

**Watch hooks implemented:**

- `useDnsZonesWatch` / `useDnsZoneWatch`
- `useDnsRecordsWatch`
- `useDomainsWatch` / `useDomainWatch`
- `useSecretsWatch` / `useSecretWatch`
- `useHttpProxiesWatch` / `useHttpProxyWatch`
- `useExportPoliciesWatch`

### Before vs After

| Aspect              | Before                      | After                   |
| ------------------- | --------------------------- | ----------------------- |
| Update latency      | 5-10 seconds                | Instant                 |
| Requests per minute | 6-12 (polling)              | 0 (push)                |
| Connection type     | HTTP polling                | EventSource (SSE)       |
| Code complexity     | 363 lines (useRevalidation) | ~100 lines (watch hook) |
| Server load         | High (repeated requests)    | Low (single connection) |

## Rationale

K8s Watch API was chosen because:

1. **Native support** - Control plane already supports it
2. **Real-time** - Instant updates (no polling delay)
3. **Efficient** - Single connection vs repeated requests
4. **Standard** - EventSource/SSE is well-supported
5. **Resilient** - Built-in reconnection with resourceVersion tracking

## Alternatives Considered

### Option A: WebSocket

- **Pros:** Bidirectional, widely supported
- **Cons:** Requires custom server implementation
- **Why rejected:** K8s Watch uses SSE, no need for custom protocol

### Option B: Shorter Polling Interval

- **Pros:** Simple, no new infrastructure
- **Cons:** Still has latency, increases server load
- **Why rejected:** Doesn't solve fundamental polling issues

### Option C: GraphQL Subscriptions

- **Pros:** Flexible queries, real-time
- **Cons:** Requires GraphQL layer, doesn't match K8s native API
- **Why rejected:** Over-engineering for this use case

## Consequences

### Positive

- Instant UI updates when resources change
- Reduced server load (no polling)
- Better user experience
- Simpler code (React Query + Watch)
- Connection pooling prevents duplicate connections

### Negative

- More complex connection management
- Need to handle reconnection scenarios
- EventSource browser support (good, but not universal)

### Risks & Mitigations

| Risk                     | Mitigation                                        |
| ------------------------ | ------------------------------------------------- |
| Connection drops         | Automatic reconnection with exponential backoff   |
| Stale data on reconnect  | resourceVersion tracking ensures no missed events |
| Browser SSE limits       | Connection pooling (one per resource type)        |
| React Strict Mode issues | 100ms cleanup delay for re-mounts                 |

## References

- [Kubernetes Watch API](https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes)
- [ADR-002: Domain Modules](./002-domain-driven-resource-modules.md) - Watch hooks live in domain modules
