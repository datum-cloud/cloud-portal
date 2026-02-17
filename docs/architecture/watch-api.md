# K8s Watch API Integration

This document explains the real-time update system powered by Kubernetes Watch API.

---

## Overview

The Watch API provides instant updates when resources change, replacing the previous polling approach. This was implemented in [ADR-003](./adrs/003-k8s-watch-api-integration.md).

### Before vs After

| Aspect          | Polling (Before)         | Watch API (After)         |
| --------------- | ------------------------ | ------------------------- |
| Update latency  | 5-10 seconds             | Instant                   |
| Requests/min    | 6-12 per resource        | 1 (persistent connection) |
| Server load     | High (repeated requests) | Low (event stream)        |
| Connection type | HTTP request/response    | Server-Sent Events (SSE)  |

---

## Architecture

The watch system uses a **server-side multiplexer** to avoid HTTP/1.1 connection starvation. Instead of each resource opening its own SSE connection (which would exhaust the browser's 6-connection-per-origin limit), all watch subscriptions are multiplexed through a single SSE stream per browser tab.

```
 ┌─────────────────────────────────────────────────────────────────┐
 │ Browser Tab                                                     │
 │                                                                 │
 │  useDomainsWatch()─┐                                            │
 │  useDnsZonesWatch()─┼─▶ WatchManager ──1 SSE──┐                │
 │  useSecretsWatch()──┘   (client-side)          │                │
 │                                                │                │
 └────────────────────────────────────────────────┼────────────────┘
                                                  │
                                    POST /subscribe
                                    POST /unsubscribe
                                                  │
 ┌────────────────────────────────────────────────┼────────────────┐
 │ Hono Server                                    │                │
 │                                                ▼                │
 │                                          WatchHub               │
 │                                       (server-side)             │
 │                                           │    │                │
 │                       ┌───────────────────┘    └──────┐         │
 │                       ▼                               ▼         │
 │              fetch (upstream)                 fetch (upstream)   │
 │              K8s Watch: domains              K8s Watch: dnszones │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
                         │                               │
                         ▼                               ▼
                 ┌───────────────────────────────────────────────┐
                 │           Control Plane (Kubernetes)          │
                 │              Watch API streams                │
                 └───────────────────────────────────────────────┘
```

### Connection Model

| Component        | Connections         | Scope              |
| ---------------- | ------------------- | ------------------ |
| Browser → Server | 1 SSE               | Per tab            |
| Server → K8s     | 1 per resource type | Shared across tabs |

### Protocol

1. **Browser** opens `GET /api/watch/stream?cid=<uuid>` (single SSE connection)
2. **Browser** sends `POST /api/watch/subscribe` with `{ clientId, resourceType, projectId, namespace, ... }`
3. **Server** starts an upstream K8s Watch fetch if one doesn't exist for this channel
4. **K8s** streams NDJSON events → **Server** parses and fans out via SSE to all subscribed clients
5. **Browser** dispatches events to `useResourceWatch` callbacks → React Query cache updates
6. **Browser** sends `POST /api/watch/unsubscribe` when a component unmounts
7. **Server** starts a 10-second grace period; if no one re-subscribes, upstream is closed

---

## Event Types

Kubernetes Watch sends these event types:

| Type       | Meaning          | Typical Action         |
| ---------- | ---------------- | ---------------------- |
| `ADDED`    | Resource created | Add to list/cache      |
| `MODIFIED` | Resource updated | Update in list/cache   |
| `DELETED`  | Resource removed | Remove from list/cache |
| `BOOKMARK` | Version marker   | Track resourceVersion  |
| `ERROR`    | Watch error      | Log / reconnect        |

### Event Structure

```typescript
interface WatchEvent<T> {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR';
  object: T; // The full resource object
}
```

---

## Usage

### Basic Watch Hook

```typescript
import { useDnsZonesWatch } from '@/resources/dns-zones';

function DnsZonesPage() {
  const { data: zones } = useDnsZones(projectId);

  // Enable real-time updates
  useDnsZonesWatch(projectId);

  return <ZoneList zones={zones} />;
}
```

### Watch with Custom Options

```typescript
// Disable watch conditionally
useDnsZonesWatch(projectId, { enabled: isListView });

// Watch a single resource
useDnsZoneWatch(projectId, zoneName);
```

### Wait for Async K8s Operations

For task queue processors that need to wait for a resource to become ready:

```typescript
import { waitForDnsZoneReady } from '@/resources/dns-zones';

const processor = async () => {
  const response = await createDnsZone({ projectId, body: zoneSpec });
  // Subscribes to watch, resolves when status is Ready
  const zone = await waitForDnsZoneReady(projectId, response.data.metadata.name);
  return zone;
};
```

---

## Implementation Pattern

### Resource Watch Hook (`*.watch.ts`)

Each resource defines watch hooks in its `*.watch.ts` file:

```typescript
// resources/dns-zones/dns-zone.watch.ts
import { useResourceWatch } from '@/modules/watch';

export function useDnsZonesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    projectId,
    namespace: 'default',
    queryKey: dnsZoneKeys.list(projectId),
    transform: (item) => toDnsZone(item),
    enabled: options?.enabled ?? true,
    // In-place update for MODIFIED events (avoids full list refetch)
    getItemKey: (zone) => zone.name,
    // Throttle for ADDED/DELETED events that use invalidation
    throttleMs: 1000,
    debounceMs: 300,
    skipInitialSync: true,
  });
}
```

### Key Options

| Option            | Description                                                     | Default |
| ----------------- | --------------------------------------------------------------- | ------- |
| `throttleMs`      | Min interval between list refetches                             | `1000`  |
| `debounceMs`      | Batch window for rapid events                                   | `300`   |
| `skipInitialSync` | Ignore ADDED events in first 2s (cache already hydrated by SSR) | `true`  |
| `getItemKey`      | Extract unique ID for in-place MODIFIED updates                 | -       |
| `updateListCache` | Custom cache updater for non-array data structures              | -       |

### Module Structure

```text
app/modules/watch/                  # Client-side watch infrastructure
├── watch.manager.ts                # Multiplexed SSE client (singleton)
├── use-resource-watch.ts           # React hook for watch subscriptions
├── watch-wait.helper.ts            # Promise wrapper for async K8s ops
├── watch.context.tsx               # React context provider
├── watch.parser.ts                 # NDJSON event parser
├── watch.types.ts                  # Shared type definitions
└── index.ts                        # Barrel exports

app/server/watch/                   # Server-side watch multiplexer
├── watch-hub.ts                    # WatchHub engine (singleton)
├── watch-hub.types.ts              # Server-side type definitions
└── index.ts                        # Barrel exports

app/server/routes/watch.ts          # HTTP endpoints for the watch protocol
```

---

## Debugging Watch Connections

### Browser Console

```javascript
// Show current connection state, active channels, and subscriber counts
window.__watchStatus();
```

### Server Stats (dev only)

```bash
curl http://localhost:3000/api/watch/stats | jq
```

Returns:

```json
{
  "clients": 1,
  "upstreams": 2,
  "subscriptions": {
    "apis/networking.datumapis.com/v1alpha/domains::proj-abc:default:::": 1,
    "apis/dns.networking.miloapis.com/v1alpha1/dnszones::proj-abc:default:::": 1
  }
}
```

### Network Tab

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR" and look for `/api/watch/stream`
3. Click the stream request → EventStream tab shows live events
4. Look for `subscribe` / `unsubscribe` POST requests

### Common Issues

| Issue                    | Cause                        | Solution                                              |
| ------------------------ | ---------------------------- | ----------------------------------------------------- |
| No events received       | Upstream URL wrong           | Check `buildUpstreamUrl` in `watch-hub.ts`            |
| 401 on upstream          | Token expired                | Token refreshed on each subscribe; re-login if needed |
| Events stop after 30s    | K8s watch timeout (expected) | Server auto-reconnects with latest resourceVersion    |
| Subscription leaks       | React Strict Mode callback   | `WatchManager.subscribe` cleans stale callbacks       |
| Channel not unsubscribed | Multiple subscribers remain  | Check `__watchStatus()` for subscriber counts         |
| 410 Gone in server logs  | resourceVersion expired      | Server silently reconnects (no client notification)   |

---

## Resources with Watch Support

These resources have real-time updates:

| Resource        | List Watch Hook            | Detail Watch Hook        |
| --------------- | -------------------------- | ------------------------ |
| DNS Zones       | `useDnsZonesWatch()`       | `useDnsZoneWatch()`      |
| DNS Records     | `useDnsRecordSetsWatch()`  | `useDnsRecordSetWatch()` |
| Domains         | `useDomainsWatch()`        | `useDomainWatch()`       |
| Secrets         | `useSecretsWatch()`        | `useSecretWatch()`       |
| HTTP Proxies    | `useHttpProxiesWatch()`    | `useHttpProxyWatch()`    |
| Export Policies | `useExportPoliciesWatch()` | -                        |

---

## Adding Watch to a New Resource

1. Create `resources/{resource}/{resource}.watch.ts`
2. Define `use{Resource}Watch()` using `useResourceWatch` from `@/modules/watch`
3. Optionally define `waitFor{Resource}Ready()` using `waitForWatch` for task queue integration
4. Export from the resource's `index.ts` barrel
5. Call the hook in the list/detail page components

See [Adding a New Resource](../guides/adding-new-resource.md#step-7-optional-add-watch) for full implementation steps.

---

## Related Documentation

- [ADR-003: K8s Watch API Integration](./adrs/003-k8s-watch-api-integration.md)
- [ADR-009: Task Queue K8s Integration](./adrs/009-task-queue-k8s-integration.md)
- [Domain Modules](./domain-modules.md)
- [Data Flow](./data-flow.md)
