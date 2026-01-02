# SSR/CSR Hybrid + K8s Watch Architecture Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace polling patterns (useRevalidation, useFetcher) with real-time K8s Watch API + SSR hydration for enterprise-grade data fetching.

**Architecture:** SSR loaders prefetch critical data, React Query manages client-side cache, K8s Watch API provides real-time updates without polling. Watch connections are pooled and shared across components.

**Tech Stack:** React Query, K8s Watch API (`?watch=true`), Hono `/api/proxy`, Zod schemas

---

## 1. Problem Statement

Current issues:

- **useRevalidation polling** (363 lines) - Inefficient polling every 5s
- **useFetcher pattern** (36 files) - Not integrated with React Query
- **useDatumFetcher** - Legacy pattern, should use mutations
- **Status components** - Poll for resource status updates

Target state:

- SSR for initial critical data (fast first paint)
- React Query for client-side cache management
- K8s Watch for real-time updates (no polling)
- Unified mutation pattern with React Query

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Loader    │───▶│  React Query    │◀───│  WatchManager   │ │
│  │  (SSR Data) │    │     Cache       │    │  (K8s Watch)    │ │
│  └─────────────┘    └─────────────────┘    └─────────────────┘ │
│         │                   ▲                       │           │
│         │                   │                       │           │
│         ▼                   │                       ▼           │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ useHydrate  │    │   Component     │    │  /api/proxy     │ │
│  │   Query     │───▶│    (UI)         │    │  ?watch=true    │ │
│  └─────────────┘    └─────────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Flow:**

1. Loader fetches data server-side (SSR)
2. `useHydrateQuery` seeds React Query cache from loader data
3. Component renders immediately with SSR data
4. WatchManager connects to K8s Watch API via `/api/proxy`
5. Watch events invalidate/update React Query cache
6. Component re-renders with live updates

---

## 3. Directory Structure

```
app/
├── modules/
│   ├── watch/                              # Core Watch infrastructure
│   │   ├── watch.context.tsx               # WatchProvider context
│   │   ├── watch.manager.ts                # Connection pooling & lifecycle
│   │   ├── watch.types.ts                  # Event types, options
│   │   ├── watch.parser.ts                 # Parse K8s watch events
│   │   └── index.ts                        # Public exports
│   │
│   └── hydration/                          # SSR → Client hydration
│       ├── hydration.provider.tsx          # HydrationProvider
│       ├── use-hydrate-query.ts            # Hydrate React Query from loader
│       ├── use-loader-data-query.ts        # Combined loader + query hook
│       └── index.ts                        # Public exports
│
├── resources/
│   └── [domain]/                           # e.g., dns-zones, projects
│       ├── [domain].schema.ts              # Zod schema (existing)
│       ├── [domain].adapter.ts             # API → Domain mapping (existing)
│       ├── [domain].service.ts             # Business logic (existing)
│       ├── [domain].queries.ts             # React Query hooks (existing)
│       ├── [domain].watch.ts               # Domain-specific watch hooks (NEW)
│       └── index.ts                        # Public exports (update)
```

**Naming Convention:** All files in a domain follow `[domain-name].[type].ts` pattern:

- `dns-zone.schema.ts`
- `dns-zone.adapter.ts`
- `dns-zone.service.ts`
- `dns-zone.queries.ts`
- `dns-zone.watch.ts` ← NEW

---

## 4. Watch Infrastructure

### 4.1 Watch Types

```typescript
// app/modules/watch/watch.types.ts

export type WatchEventType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR';

export interface WatchEvent<T = unknown> {
  type: WatchEventType;
  object: T;
}

export interface WatchOptions {
  resourceType: string;
  namespace?: string;
  name?: string; // For single resource watch
  resourceVersion?: string;
  timeoutSeconds?: number;
  labelSelector?: string;
  fieldSelector?: string;
}

export interface WatchConnection {
  key: string;
  controller: AbortController;
  subscribers: Set<WatchSubscriber>;
  resourceVersion: string;
  reconnectAttempts: number;
}

export type WatchSubscriber = (event: WatchEvent) => void;
```

### 4.2 Watch Manager (Connection Pooling)

```typescript
// app/modules/watch/watch.manager.ts
import { parseWatchEvent } from './watch.parser';
import type { WatchConnection, WatchEvent, WatchOptions, WatchSubscriber } from './watch.types';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

class WatchManager {
  private connections = new Map<string, WatchConnection>();

  private buildKey(options: WatchOptions): string {
    const { resourceType, namespace, name, labelSelector, fieldSelector } = options;
    return [resourceType, namespace, name, labelSelector, fieldSelector].filter(Boolean).join(':');
  }

  subscribe(options: WatchOptions, callback: WatchSubscriber): () => void {
    const key = this.buildKey(options);
    const existing = this.connections.get(key);

    if (existing) {
      existing.subscribers.add(callback);
      return () => this.unsubscribe(key, callback);
    }

    const connection: WatchConnection = {
      key,
      controller: new AbortController(),
      subscribers: new Set([callback]),
      resourceVersion: options.resourceVersion || '0',
      reconnectAttempts: 0,
    };

    this.connections.set(key, connection);
    this.startWatch(options, connection);

    return () => this.unsubscribe(key, callback);
  }

  private unsubscribe(key: string, callback: WatchSubscriber): void {
    const connection = this.connections.get(key);
    if (!connection) return;

    connection.subscribers.delete(callback);

    if (connection.subscribers.size === 0) {
      connection.controller.abort();
      this.connections.delete(key);
    }
  }

  private async startWatch(options: WatchOptions, connection: WatchConnection): Promise<void> {
    const { resourceType, namespace, name } = options;

    // Build URL for K8s Watch API
    let url = `/api/proxy/${resourceType}`;
    if (namespace) url = `/api/proxy/namespaces/${namespace}/${resourceType}`;
    if (name) url += `/${name}`;

    const params = new URLSearchParams({
      watch: 'true',
      resourceVersion: connection.resourceVersion,
      timeoutSeconds: String(options.timeoutSeconds || 300),
    });
    if (options.labelSelector) params.set('labelSelector', options.labelSelector);
    if (options.fieldSelector) params.set('fieldSelector', options.fieldSelector);

    try {
      const response = await fetch(`${url}?${params}`, {
        signal: connection.controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Watch failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = parseWatchEvent(line);
          if (!event) continue;

          // Update resourceVersion for reconnection
          if (event.object?.metadata?.resourceVersion) {
            connection.resourceVersion = event.object.metadata.resourceVersion;
          }

          // Broadcast to all subscribers
          connection.subscribers.forEach((subscriber) => subscriber(event));
        }
      }

      // Connection closed normally, reconnect
      connection.reconnectAttempts = 0;
      this.scheduleReconnect(options, connection, 0);
    } catch (error) {
      if (connection.controller.signal.aborted) return;

      // Exponential backoff reconnection
      if (connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, connection.reconnectAttempts);
        connection.reconnectAttempts++;
        this.scheduleReconnect(options, connection, delay);
      } else {
        // Max retries exceeded, notify subscribers
        const errorEvent: WatchEvent = {
          type: 'ERROR',
          object: { message: 'Watch connection failed after max retries' },
        };
        connection.subscribers.forEach((subscriber) => subscriber(errorEvent));
      }
    }
  }

  private scheduleReconnect(
    options: WatchOptions,
    connection: WatchConnection,
    delay: number
  ): void {
    setTimeout(() => {
      if (this.connections.has(connection.key)) {
        connection.controller = new AbortController();
        this.startWatch(options, connection);
      }
    }, delay);
  }

  disconnectAll(): void {
    this.connections.forEach((connection) => {
      connection.controller.abort();
    });
    this.connections.clear();
  }
}

export const watchManager = new WatchManager();
```

### 4.3 Watch Event Parser

```typescript
// app/modules/watch/watch.parser.ts
import type { WatchEvent } from './watch.types';

export function parseWatchEvent(line: string): WatchEvent | null {
  try {
    const data = JSON.parse(line);

    if (!data.type || !data.object) {
      return null;
    }

    return {
      type: data.type,
      object: data.object,
    };
  } catch {
    return null;
  }
}
```

### 4.4 Watch Context

```typescript
// app/modules/watch/watch.context.tsx

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { watchManager } from './watch.manager';

interface WatchContextValue {
  manager: typeof watchManager;
}

const WatchContext = createContext<WatchContextValue | null>(null);

export function WatchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    return () => {
      watchManager.disconnectAll();
    };
  }, []);

  return (
    <WatchContext.Provider value={{ manager: watchManager }}>
      {children}
    </WatchContext.Provider>
  );
}

export function useWatchContext(): WatchContextValue {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatchContext must be used within WatchProvider');
  }
  return context;
}
```

### 4.5 Generic Watch Hook

```typescript
// app/modules/watch/use-resource-watch.ts
import { watchManager } from './watch.manager';
import type { WatchEvent, WatchOptions } from './watch.types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

interface UseResourceWatchOptions<T> extends Omit<WatchOptions, 'resourceType'> {
  resourceType: string;
  queryKey: readonly unknown[];
  enabled?: boolean;
  transform?: (item: unknown) => T;
  onEvent?: (event: WatchEvent<T>) => void;
}

export function useResourceWatch<T>({
  resourceType,
  namespace,
  name,
  queryKey,
  enabled = true,
  transform,
  onEvent,
  ...watchOptions
}: UseResourceWatchOptions<T>) {
  const queryClient = useQueryClient();
  const transformRef = useRef(transform);
  const onEventRef = useRef(onEvent);

  // Keep refs updated
  transformRef.current = transform;
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = watchManager.subscribe(
      { resourceType, namespace, name, ...watchOptions },
      (event) => {
        const transformedEvent: WatchEvent<T> = {
          type: event.type,
          object: transformRef.current ? transformRef.current(event.object) : (event.object as T),
        };

        // Call custom event handler if provided
        onEventRef.current?.(transformedEvent);

        // Update React Query cache based on event type
        switch (event.type) {
          case 'ADDED':
          case 'MODIFIED':
            if (name) {
              // Single resource: update directly
              queryClient.setQueryData(queryKey, transformedEvent.object);
            } else {
              // List: invalidate to refetch
              queryClient.invalidateQueries({ queryKey });
            }
            break;

          case 'DELETED':
            if (name) {
              // Single resource: remove from cache
              queryClient.removeQueries({ queryKey });
            } else {
              // List: invalidate to refetch
              queryClient.invalidateQueries({ queryKey });
            }
            break;

          case 'ERROR':
            console.error('Watch error:', event.object);
            break;
        }
      }
    );

    return unsubscribe;
  }, [enabled, resourceType, namespace, name, queryKey, queryClient]);
}
```

---

## 5. Hydration Infrastructure

### 5.1 Hydrate Query Hook

```typescript
// app/modules/hydration/use-hydrate-query.ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hydrates React Query cache with SSR loader data.
 * Only hydrates once per query key to avoid overwriting client updates.
 */
export function useHydrateQuery<T>(
  queryKey: readonly unknown[],
  data: T | undefined,
  options?: {
    staleTime?: number;
  }
) {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);
  const keyString = JSON.stringify(queryKey);

  useEffect(() => {
    // Only hydrate once and only if we have data
    if (hydratedRef.current || data === undefined) return;

    queryClient.setQueryData(queryKey, data, {
      updatedAt: Date.now(),
    });

    // Mark as stale after staleTime (default 30s)
    if (options?.staleTime) {
      queryClient.invalidateQueries({
        queryKey,
        refetchType: 'none', // Don't refetch, just mark stale
      });
    }

    hydratedRef.current = true;
  }, [keyString, data, queryClient, options?.staleTime]);
}
```

### 5.2 Combined Loader + Query Hook

```typescript
// app/modules/hydration/use-loader-data-query.ts
import { useHydrateQuery } from './use-hydrate-query';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useLoaderData } from 'react-router';

/**
 * Combines loader data hydration with React Query.
 * - Hydrates cache from SSR loader data
 * - Returns React Query hook for client-side management
 * - Enables live updates via Watch hooks
 */
export function useLoaderDataQuery<TData, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  const loaderData = useLoaderData() as TData | undefined;

  // Hydrate React Query cache from loader data
  useHydrateQuery(queryKey, loaderData, {
    staleTime: options?.staleTime as number,
  });

  // Return React Query hook
  return useQuery({
    queryKey,
    queryFn,
    // Use loader data as initial data
    initialData: loaderData,
    // Don't refetch on mount if we have loader data
    staleTime: loaderData ? (options?.staleTime ?? 30_000) : 0,
    ...options,
  });
}
```

---

## 6. Domain Watch Hooks

Each resource domain gets a `[domain].watch.ts` file following the existing naming convention.

### 6.1 DNS Zones Watch

```typescript
// app/resources/dns-zones/dns-zone.watch.ts
import { toDnsZone } from './dns-zone.adapter';
import { queryKeys } from './dns-zone.queries';
import type { DnsZone } from './dns-zone.schema';
import { useResourceWatch } from '@/modules/watch';

export function useDnsZonesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'edge.miloapis.com/v1alpha1/dnszones',
    namespace: projectId,
    queryKey: queryKeys.list(projectId),
    transform: toDnsZone,
    ...options,
  });
}

export function useDnsZoneWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'edge.miloapis.com/v1alpha1/dnszones',
    namespace: projectId,
    name,
    queryKey: queryKeys.detail(projectId, name),
    transform: toDnsZone,
    ...options,
  });
}
```

### 6.2 Projects Watch

```typescript
// app/resources/projects/project.watch.ts
import { toProject } from './project.adapter';
import { queryKeys } from './project.queries';
import type { Project } from './project.schema';
import { useResourceWatch } from '@/modules/watch';

export function useProjectsWatch(orgId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Project>({
    resourceType: 'resourcemanager.miloapis.com/v1alpha1/projects',
    namespace: orgId,
    queryKey: queryKeys.list(orgId),
    transform: toProject,
    ...options,
  });
}

export function useProjectWatch(orgId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Project>({
    resourceType: 'resourcemanager.miloapis.com/v1alpha1/projects',
    namespace: orgId,
    name,
    queryKey: queryKeys.detail(orgId, name),
    transform: toProject,
    ...options,
  });
}
```

---

## 7. Combined SSR + Watch Hooks

For components that need both SSR hydration and live updates:

````typescript
// app/resources/dns-zones/dns-zone.hooks.ts
import { useDnsZones, queryKeys } from './dns-zone.queries';
import type { DnsZone } from './dns-zone.schema';
import { useDnsZonesWatch } from './dns-zone.watch';
import { useHydrateQuery } from '@/modules/hydration';
import { useLoaderData } from 'react-router';

/**
 * Combined hook for DNS Zones with SSR hydration + live updates.
 *
 * Usage:
 * ```tsx
 * // In component
 * const loaderData = useLoaderData<typeof loader>();
 * const { data: zones } = useDnsZonesLive(projectId, loaderData);
 * ```
 */
export function useDnsZonesLive(projectId: string, loaderData?: DnsZone[]) {
  // 1. Hydrate React Query cache from SSR loader data
  useHydrateQuery(queryKeys.list(projectId), loaderData);

  // 2. Get current data from React Query
  const query = useDnsZones(projectId, {
    staleTime: loaderData ? 30_000 : 0,
  });

  // 3. Subscribe to live updates (only after initial data loaded)
  useDnsZonesWatch(projectId, {
    enabled: query.isSuccess,
  });

  return query;
}
````

---

## 8. Migration Patterns

### 8.1 From useRevalidation to Watch

```typescript
// BEFORE: Polling pattern
export default function DnsZonesPage() {
  const { zones } = useLoaderData<typeof loader>();
  useRevalidation({ enabled: true, interval: 5000 });

  return <DnsZoneTable zones={zones} />;
}

// AFTER: Watch pattern
export default function DnsZonesPage() {
  const loaderData = useLoaderData<typeof loader>();
  const { data: zones } = useDnsZonesLive(projectId, loaderData.zones);

  return <DnsZoneTable zones={zones ?? []} />;
}
```

### 8.2 From useFetcher to React Query Mutation

```typescript
// BEFORE: useFetcher pattern
const fetcher = useFetcher();
const handleDelete = () => {
  fetcher.submit({ name }, { method: 'DELETE', action: '/api/dns-zones' });
};

// AFTER: React Query mutation
const deleteMutation = useDeleteDnsZone(projectId, {
  onSuccess: () => toast.success('Deleted'),
});
const handleDelete = () => {
  deleteMutation.mutate(name);
};
```

### 8.3 From Status Polling to Watch

```typescript
// BEFORE: Status component with polling
function ResourceStatus({ resource }) {
  const [status, setStatus] = useState(resource.status);

  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await fetchResource(resource.name);
      setStatus(updated.status);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return <StatusBadge status={status} />;
}

// AFTER: Status from Watch-updated cache
function ResourceStatus({ resourceName }) {
  const { data } = useDnsZone(projectId, resourceName);
  // Status auto-updates via Watch subscription
  return <StatusBadge status={data?.status} />;
}
```

---

## 9. Files to Clean Up

### Delete (after migration complete):

| File                                  | Lines | Replacement           |
| ------------------------------------- | ----- | --------------------- |
| `app/hooks/useRevalidation.ts`        | 363   | Watch hooks           |
| `app/hooks/useDatumFetcher.ts`        | ~100  | React Query mutations |
| `app/hooks/useNotificationPolling.ts` | ~50   | Watch + React Query   |

### Migrate (36 useFetcher files):

Each file using `useFetcher` needs migration to corresponding React Query mutation from `resources/[domain]/[domain].queries.ts`.

---

## 10. Provider Integration

Update the private layout to include WatchProvider:

```typescript
// app/layouts/private.layout.tsx

import { WatchProvider } from '@/modules/watch';

export default function PrivateLayout() {
  return (
    <ServiceProvider>
      <WatchProvider>
        <AppProvider initialUser={data?.user}>
          <TooltipProvider>
            <ConfirmationDialogProvider>
              <Outlet />
            </ConfirmationDialogProvider>
          </TooltipProvider>
        </AppProvider>
      </WatchProvider>
    </ServiceProvider>
  );
}
```

---

## 11. Scalability Considerations

### Connection Pooling

- WatchManager shares connections across components
- Single connection per resource type/namespace combination
- Subscriber pattern broadcasts to all interested components

### Reconnection Strategy

- Exponential backoff (1s, 2s, 4s, 8s, 16s)
- Max 5 retry attempts before error notification
- resourceVersion tracking for gap-free updates

### Memory Management

- Connections automatically cleaned when last subscriber unsubscribes
- `disconnectAll()` called on WatchProvider unmount
- AbortController used for clean connection termination

### Error Handling

- ERROR events broadcasted to subscribers
- Components can handle errors via `onEvent` callback
- Graceful degradation: falls back to stale cache data

---

## 12. Testing Strategy

### Unit Tests

- WatchManager: connection lifecycle, subscriber management
- parseWatchEvent: event parsing edge cases
- useHydrateQuery: hydration behavior, deduplication

### Integration Tests

- Watch hooks with mock server responses
- SSR hydration → client query flow
- Reconnection behavior

### E2E Tests

- Full flow: SSR → hydrate → watch → update
- Network interruption recovery
- Multiple tabs/components sharing connection

---

## 13. Implementation Order

1. **Phase 1: Watch Infrastructure**
   - Create `app/modules/watch/` with all files
   - Add WatchProvider to private layout

2. **Phase 2: Hydration Infrastructure**
   - Create `app/modules/hydration/` with all files

3. **Phase 3: Domain Watch Hooks**
   - Add `[domain].watch.ts` to each resource that needs live updates
   - Priority: dns-zones, projects, dns-records (most used listings)

4. **Phase 4: Migrate Components**
   - Replace useRevalidation with Watch hooks
   - Replace useFetcher with mutations
   - Replace status polling with Watch

5. **Phase 5: Cleanup**
   - Delete useRevalidation.ts
   - Delete useDatumFetcher.ts
   - Delete useNotificationPolling.ts
   - Remove unused imports
