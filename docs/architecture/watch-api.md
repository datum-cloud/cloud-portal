# K8s Watch API Integration

This document explains the real-time update system powered by Kubernetes Watch API.

---

## Overview

The Watch API provides instant updates when resources change, replacing the previous polling approach. This was implemented in [ADR-003](./adrs/003-k8s-watch-api-integration.md).

### Before vs After

| Aspect | Polling (Before) | Watch API (After) |
|--------|------------------|-------------------|
| Update latency | 5-10 seconds | Instant |
| Requests/min | 6-12 per resource | 1 (persistent connection) |
| Server load | High (repeated requests) | Low (event stream) |
| Connection type | HTTP request/response | Server-Sent Events (SSE) |

---

## How It Works

### Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     Browser     │         │   Hono Server   │         │  Control Plane  │
│                 │         │                 │         │   (Kubernetes)  │
│  ┌───────────┐  │         │                 │         │                 │
│  │EventSource│◄─┼─────────┼─────SSE─────────┼─────────┤  Watch Stream   │
│  └─────┬─────┘  │         │                 │         │                 │
│        │        │         │                 │         │                 │
│        ▼        │         │                 │         │                 │
│  ┌───────────┐  │         │                 │         │                 │
│  │React Query│  │         │                 │         │                 │
│  │   Cache   │  │         │                 │         │                 │
│  └───────────┘  │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Event Flow

1. Component mounts and calls `useWatch()` hook
2. Hook creates `EventSource` connection to watch endpoint
3. Server proxies to K8s Watch API with `?watch=true`
4. K8s streams events as resources change
5. Events arrive via SSE to browser
6. `onEvent` handler updates React Query cache
7. Components re-render with new data

---

## Event Types

Kubernetes Watch sends three event types:

| Type | Meaning | Typical Action |
|------|---------|----------------|
| `ADDED` | Resource created | Add to list/cache |
| `MODIFIED` | Resource updated | Update in list/cache |
| `DELETED` | Resource removed | Remove from list/cache |

### Event Structure

```typescript
interface WatchEvent<T> {
  type: 'ADDED' | 'MODIFIED' | 'DELETED';
  object: T; // The full resource object
}
```

---

## Usage

### Basic Watch Hook

```typescript
// In a page component
import { useDNSZonesWatch } from '@/resources/dns-zones';

function DNSZonesPage() {
  const { data: zones } = useDNSZones();

  // Enable real-time updates
  useDNSZonesWatch();

  return <ZoneList zones={zones} />;
}
```

### Watch with Event Handler

```typescript
useDNSZonesWatch({
  onEvent: (event) => {
    console.log('Zone event:', event.type, event.object.name);

    // Show toast notification
    if (event.type === 'ADDED') {
      toast.success(`Zone "${event.object.name}" created`);
    }
  },
});
```

### Conditional Watch

```typescript
// Only watch when viewing the list
const isListView = location.pathname === '/dns-zones';

useDNSZonesWatch({
  enabled: isListView,
});
```

---

## Implementation Pattern

### Watch Hook (`*.watch.ts`)

```typescript
// resources/dns-zones/dns-zone.watch.ts
import { useWatch } from '@/modules/watch';
import { useQueryClient } from '@tanstack/react-query';
import { toDNSZone } from './dns-zone.adapter';
import { dnsZoneKeys } from './dns-zone.queries';
import type { DNSZone } from './dns-zone.schema';

interface UseWatchOptions {
  enabled?: boolean;
  onEvent?: (event: WatchEvent<DNSZone>) => void;
}

export function useDNSZonesWatch(options?: UseWatchOptions) {
  const queryClient = useQueryClient();
  const { enabled = true, onEvent } = options ?? {};

  return useWatch({
    endpoint: '/apis/dns.networking.miloapis.com/v1alpha1/dns-zones',
    enabled,
    onEvent: (rawEvent) => {
      const zone = toDNSZone(rawEvent.object);
      const event = { ...rawEvent, object: zone };

      // Update React Query cache
      queryClient.setQueryData<DNSZone[]>(
        dnsZoneKeys.list(),
        (old = []) => {
          switch (event.type) {
            case 'ADDED':
              // Avoid duplicates
              if (old.some((z) => z.id === zone.id)) return old;
              return [...old, zone];

            case 'MODIFIED':
              return old.map((z) => (z.id === zone.id ? zone : z));

            case 'DELETED':
              return old.filter((z) => z.id !== zone.id);

            default:
              return old;
          }
        }
      );

      // Also update detail cache if exists
      queryClient.setQueryData(dnsZoneKeys.detail(zone.id), zone);

      // Call user's event handler
      onEvent?.(event);
    },
  });
}
```

### Watch Module (`modules/watch/`)

The core watch module handles:

- EventSource connection management
- Automatic reconnection on disconnect
- Authentication token injection
- Error handling and recovery

```typescript
// Simplified usage of the watch module
import { useWatch } from '@/modules/watch';

useWatch({
  endpoint: '/api/watch/dns-zones',
  queryKey: ['dns-zones'],
  onEvent: (event) => {
    // Handle event
  },
});
```

---

## Debugging Watch Connections

### Check Network Tab

1. Open DevTools → Network tab
2. Filter by "EventStream" or "XHR"
3. Look for requests with `?watch=true`
4. Click to see streaming events

### Verify Connection

```typescript
useDNSZonesWatch({
  onEvent: (event) => {
    console.log('[Watch] Event received:', event);
  },
  onConnect: () => {
    console.log('[Watch] Connected');
  },
  onDisconnect: () => {
    console.log('[Watch] Disconnected');
  },
  onError: (error) => {
    console.error('[Watch] Error:', error);
  },
});
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No events received | Wrong endpoint | Check API URL and path |
| 401 errors | Token expired | Re-login, check auth |
| Connection drops | Network issues | Auto-reconnect handles this |
| Duplicate items | Missing dedup logic | Check `ADDED` handler |

---

## Resources with Watch Support

These resources have real-time updates:

| Resource | Watch Hook | Endpoint |
|----------|------------|----------|
| DNS Zones | `useDNSZonesWatch()` | `/apis/dns.networking.../dns-zones` |
| DNS Records | `useDNSRecordsWatch()` | `/apis/dns.networking.../dns-records` |
| Domains | `useDomainsWatch()` | `/apis/dns.networking.../domains` |
| Secrets | `useSecretsWatch()` | `/apis/.../secrets` |
| HTTP Proxies | `useHTTPProxiesWatch()` | `/apis/networking.../http-proxies` |

---

## Adding Watch to a Resource

See [Adding a New Resource](../guides/adding-new-resource.md#step-7-optional-add-watch) for implementation steps.

---

## Related Documentation

- [ADR-003: K8s Watch API Integration](./adrs/003-k8s-watch-api-integration.md)
- [Domain Modules](./domain-modules.md)
- [Data Flow](./data-flow.md)
