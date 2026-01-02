# SSR/CSR Hybrid + K8s Watch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement K8s Watch infrastructure, SSR hydration utilities, and migrate components from polling (useRevalidation) and useFetcher to React Query mutations with live updates.

**Architecture:** Watch module provides real-time K8s API updates via connection pooling. Hydration module seeds React Query cache from SSR loader data. Domain-specific watch hooks follow `[domain].watch.ts` naming convention.

**Tech Stack:** React Query, K8s Watch API, TypeScript, Zod

---

## Phase 1: Watch Infrastructure

### Task 1.1: Create Watch Types

**Files:**

- Create: `app/modules/watch/watch.types.ts`

**Step 1: Create the watch types file**

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
  name?: string;
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

export type WatchSubscriber<T = unknown> = (event: WatchEvent<T>) => void;

export interface UseResourceWatchOptions<T> extends Omit<WatchOptions, 'resourceType'> {
  resourceType: string;
  queryKey: readonly unknown[];
  enabled?: boolean;
  transform?: (item: unknown) => T;
  onEvent?: (event: WatchEvent<T>) => void;
}
```

**Step 2: Verify file exists**

Run: `ls -la app/modules/watch/watch.types.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add app/modules/watch/watch.types.ts
git commit -m "feat(watch): add watch types module"
```

---

### Task 1.2: Create Watch Event Parser

**Files:**

- Create: `app/modules/watch/watch.parser.ts`

**Step 1: Create the parser file**

```typescript
// app/modules/watch/watch.parser.ts
import type { WatchEvent } from './watch.types';

/**
 * Parse a single line from K8s Watch API stream.
 * Each line is a JSON object with { type, object }.
 */
export function parseWatchEvent<T = unknown>(line: string): WatchEvent<T> | null {
  if (!line.trim()) {
    return null;
  }

  try {
    const data = JSON.parse(line);

    if (!data.type || !data.object) {
      return null;
    }

    return {
      type: data.type,
      object: data.object as T,
    };
  } catch {
    return null;
  }
}

/**
 * Extract resourceVersion from a K8s object.
 */
export function extractResourceVersion(obj: unknown): string | undefined {
  if (
    typeof obj === 'object' &&
    obj !== null &&
    'metadata' in obj &&
    typeof (obj as { metadata?: { resourceVersion?: string } }).metadata === 'object'
  ) {
    return (obj as { metadata: { resourceVersion?: string } }).metadata?.resourceVersion;
  }
  return undefined;
}
```

**Step 2: Verify file exists**

Run: `ls -la app/modules/watch/watch.parser.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add app/modules/watch/watch.parser.ts
git commit -m "feat(watch): add watch event parser"
```

---

### Task 1.3: Create Watch Manager (Connection Pooling)

**Files:**

- Create: `app/modules/watch/watch.manager.ts`

**Step 1: Create the watch manager file**

```typescript
// app/modules/watch/watch.manager.ts
import { parseWatchEvent, extractResourceVersion } from './watch.parser';
import type { WatchConnection, WatchOptions, WatchSubscriber, WatchEvent } from './watch.types';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

/**
 * WatchManager handles K8s Watch API connections with:
 * - Connection pooling (shared connections for same resource)
 * - Automatic reconnection with exponential backoff
 * - resourceVersion tracking for gap-free updates
 * - Subscriber pattern for broadcasting events
 */
class WatchManager {
  private connections = new Map<string, WatchConnection>();

  /**
   * Build a unique key for a watch connection.
   */
  private buildKey(options: WatchOptions): string {
    const { resourceType, namespace, name, labelSelector, fieldSelector } = options;
    return [resourceType, namespace, name, labelSelector, fieldSelector].filter(Boolean).join(':');
  }

  /**
   * Subscribe to watch events for a resource.
   * Returns an unsubscribe function.
   */
  subscribe<T = unknown>(options: WatchOptions, callback: WatchSubscriber<T>): () => void {
    const key = this.buildKey(options);
    const existing = this.connections.get(key);

    if (existing) {
      existing.subscribers.add(callback as WatchSubscriber);
      return () => this.unsubscribe(key, callback as WatchSubscriber);
    }

    const connection: WatchConnection = {
      key,
      controller: new AbortController(),
      subscribers: new Set([callback as WatchSubscriber]),
      resourceVersion: options.resourceVersion || '0',
      reconnectAttempts: 0,
    };

    this.connections.set(key, connection);
    this.startWatch(options, connection);

    return () => this.unsubscribe(key, callback as WatchSubscriber);
  }

  /**
   * Unsubscribe from watch events.
   * Closes connection if no subscribers remain.
   */
  private unsubscribe(key: string, callback: WatchSubscriber): void {
    const connection = this.connections.get(key);
    if (!connection) return;

    connection.subscribers.delete(callback);

    if (connection.subscribers.size === 0) {
      connection.controller.abort();
      this.connections.delete(key);
    }
  }

  /**
   * Build the URL for K8s Watch API.
   */
  private buildUrl(options: WatchOptions, connection: WatchConnection): string {
    const { resourceType, namespace, name } = options;

    // Build base path
    let url = `/api/proxy/${resourceType}`;
    if (namespace) {
      url = `/api/proxy/namespaces/${namespace}/${resourceType}`;
    }
    if (name) {
      url += `/${name}`;
    }

    // Build query params
    const params = new URLSearchParams({
      watch: 'true',
      resourceVersion: connection.resourceVersion,
      timeoutSeconds: String(options.timeoutSeconds || 300),
    });

    if (options.labelSelector) {
      params.set('labelSelector', options.labelSelector);
    }
    if (options.fieldSelector) {
      params.set('fieldSelector', options.fieldSelector);
    }

    return `${url}?${params}`;
  }

  /**
   * Start watching a resource.
   */
  private async startWatch(options: WatchOptions, connection: WatchConnection): Promise<void> {
    const url = this.buildUrl(options, connection);

    try {
      const response = await fetch(url, {
        signal: connection.controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Watch failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const event = parseWatchEvent(line);
          if (!event) continue;

          // Update resourceVersion for reconnection
          const resourceVersion = extractResourceVersion(event.object);
          if (resourceVersion) {
            connection.resourceVersion = resourceVersion;
          }

          // Broadcast to all subscribers
          connection.subscribers.forEach((subscriber) => subscriber(event));
        }
      }

      // Connection closed normally, reconnect immediately
      connection.reconnectAttempts = 0;
      this.scheduleReconnect(options, connection, 0);
    } catch (error) {
      // Aborted intentionally, don't reconnect
      if (connection.controller.signal.aborted) {
        return;
      }

      // Exponential backoff reconnection
      if (connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, connection.reconnectAttempts);
        connection.reconnectAttempts++;
        this.scheduleReconnect(options, connection, delay);
      } else {
        // Max retries exceeded, notify subscribers
        const errorEvent: WatchEvent = {
          type: 'ERROR',
          object: {
            message: 'Watch connection failed after max retries',
            error: error instanceof Error ? error.message : String(error),
          },
        };
        connection.subscribers.forEach((subscriber) => subscriber(errorEvent));
      }
    }
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(
    options: WatchOptions,
    connection: WatchConnection,
    delay: number
  ): void {
    setTimeout(() => {
      if (this.connections.has(connection.key)) {
        // Create new abort controller for new connection
        connection.controller = new AbortController();
        this.startWatch(options, connection);
      }
    }, delay);
  }

  /**
   * Disconnect all watch connections.
   * Call this on app unmount.
   */
  disconnectAll(): void {
    this.connections.forEach((connection) => {
      connection.controller.abort();
    });
    this.connections.clear();
  }

  /**
   * Get current connection count (for debugging).
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const watchManager = new WatchManager();
```

**Step 2: Verify file exists**

Run: `ls -la app/modules/watch/watch.manager.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add app/modules/watch/watch.manager.ts
git commit -m "feat(watch): add watch manager with connection pooling"
```

---

### Task 1.4: Create Watch Context Provider

**Files:**

- Create: `app/modules/watch/watch.context.tsx`

**Step 1: Create the watch context file**

```typescript
// app/modules/watch/watch.context.tsx

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { watchManager } from './watch.manager';

interface WatchContextValue {
  manager: typeof watchManager;
}

const WatchContext = createContext<WatchContextValue | null>(null);

interface WatchProviderProps {
  children: ReactNode;
}

/**
 * WatchProvider manages the lifecycle of watch connections.
 * Disconnects all connections on unmount.
 */
export function WatchProvider({ children }: WatchProviderProps) {
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

/**
 * Hook to access the watch context.
 */
export function useWatchContext(): WatchContextValue {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatchContext must be used within WatchProvider');
  }
  return context;
}
```

**Step 2: Verify file exists**

Run: `ls -la app/modules/watch/watch.context.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add app/modules/watch/watch.context.tsx
git commit -m "feat(watch): add watch context provider"
```

---

### Task 1.5: Create useResourceWatch Hook

**Files:**

- Create: `app/modules/watch/use-resource-watch.ts`

**Step 1: Create the hook file**

````typescript
// app/modules/watch/use-resource-watch.ts
import { watchManager } from './watch.manager';
import type { WatchEvent, UseResourceWatchOptions } from './watch.types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hook to subscribe to K8s Watch API and update React Query cache.
 *
 * @example
 * ```tsx
 * // Watch a list of resources
 * useResourceWatch({
 *   resourceType: 'edge.miloapis.com/v1alpha1/dnszones',
 *   namespace: projectId,
 *   queryKey: dnsZoneKeys.list(projectId),
 *   transform: toDnsZone,
 * });
 *
 * // Watch a single resource
 * useResourceWatch({
 *   resourceType: 'edge.miloapis.com/v1alpha1/dnszones',
 *   namespace: projectId,
 *   name: zoneName,
 *   queryKey: dnsZoneKeys.detail(projectId, zoneName),
 *   transform: toDnsZone,
 * });
 * ```
 */
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

  // Keep refs updated without triggering effect
  transformRef.current = transform;
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = watchManager.subscribe(
      { resourceType, namespace, name, ...watchOptions },
      (event: WatchEvent) => {
        // Transform the event object if transform function provided
        const transformedObject = transformRef.current
          ? transformRef.current(event.object)
          : (event.object as T);

        const transformedEvent: WatchEvent<T> = {
          type: event.type,
          object: transformedObject,
        };

        // Call custom event handler if provided
        onEventRef.current?.(transformedEvent);

        // Update React Query cache based on event type
        switch (event.type) {
          case 'ADDED':
          case 'MODIFIED':
            if (name) {
              // Single resource: update cache directly
              queryClient.setQueryData(queryKey, transformedEvent.object);
            } else {
              // List: invalidate to trigger refetch
              queryClient.invalidateQueries({ queryKey });
            }
            break;

          case 'DELETED':
            if (name) {
              // Single resource: remove from cache
              queryClient.removeQueries({ queryKey });
            } else {
              // List: invalidate to trigger refetch
              queryClient.invalidateQueries({ queryKey });
            }
            break;

          case 'ERROR':
            console.error('[useResourceWatch] Watch error:', event.object);
            break;

          case 'BOOKMARK':
            // Bookmark events are for resourceVersion tracking only
            break;
        }
      }
    );

    return unsubscribe;
  }, [enabled, resourceType, namespace, name, JSON.stringify(queryKey), queryClient]);
}
````

**Step 2: Verify file exists**

Run: `ls -la app/modules/watch/use-resource-watch.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add app/modules/watch/use-resource-watch.ts
git commit -m "feat(watch): add useResourceWatch hook"
```

---

### Task 1.6: Create Watch Module Index

**Files:**

- Create: `app/modules/watch/index.ts`

**Step 1: Create the index file**

```typescript
// app/modules/watch/index.ts

export * from './watch.types';
export * from './watch.parser';
export * from './watch.manager';
export * from './watch.context';
export * from './use-resource-watch';
```

**Step 2: Verify file exists**

Run: `ls -la app/modules/watch/index.ts`
Expected: File exists

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: No errors in watch module

**Step 4: Commit**

```bash
git add app/modules/watch/index.ts
git commit -m "feat(watch): add watch module exports"
```

---

### Task 1.7: Add WatchProvider to Private Layout

**Files:**

- Modify: `app/layouts/private.layout.tsx`

**Step 1: Add WatchProvider import and wrap layout**

Add import at top:

```typescript
import { WatchProvider } from '@/modules/watch';
```

Update the return JSX to wrap with WatchProvider:

```typescript
return (
  <ServiceProvider>
    <WatchProvider>
      <AppProvider initialUser={data?.user}>
        <TooltipProvider>
          <ConfirmationDialogProvider>
            <Outlet />
          </ConfirmationDialogProvider>
        </TooltipProvider>

        {helpscoutEnv.HELPSCOUT_BEACON_ID && helpscoutEnv.isProd && (
          <HelpScoutBeacon
            beaconId={helpscoutEnv.HELPSCOUT_BEACON_ID}
            user={{
              name: `${data?.user?.givenName} ${data?.user?.familyName}`,
              email: data?.user?.email,
              signature: helpscoutEnv.userSignature ?? '',
            }}
          />
        )}
      </AppProvider>
    </WatchProvider>
  </ServiceProvider>
);
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/layouts/private.layout.tsx
git commit -m "feat(watch): add WatchProvider to private layout"
```

---

## Phase 2: Hydration Infrastructure

### Task 2.1: Create Hydration Hook

**Files:**

- Create: `app/modules/hydration/use-hydrate-query.ts`

**Step 1: Create the hydration hook file**

````typescript
// app/modules/hydration/use-hydrate-query.ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

interface UseHydrateQueryOptions {
  /**
   * Time in ms before the hydrated data is considered stale.
   * Set to 0 to mark as stale immediately.
   * @default 30000 (30 seconds)
   */
  staleTime?: number;
}

/**
 * Hydrates React Query cache with SSR loader data.
 *
 * Only hydrates once per query key to avoid overwriting client updates.
 * Use this in components that receive data from loaders and want to
 * integrate with React Query for client-side updates.
 *
 * @example
 * ```tsx
 * function DnsZonesPage() {
 *   const { zones } = useLoaderData<typeof loader>();
 *
 *   // Hydrate cache from SSR data
 *   useHydrateQuery(dnsZoneKeys.list(projectId), zones);
 *
 *   // Now React Query hooks will use this data initially
 *   const { data } = useDnsZones(projectId);
 * }
 * ```
 */
export function useHydrateQuery<T>(
  queryKey: readonly unknown[],
  data: T | undefined,
  options: UseHydrateQueryOptions = {}
) {
  const { staleTime = 30_000 } = options;

  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);
  const keyString = JSON.stringify(queryKey);

  useEffect(() => {
    // Only hydrate once and only if we have data
    if (hydratedRef.current || data === undefined) {
      return;
    }

    // Set the data in the cache
    queryClient.setQueryData(queryKey, data, {
      updatedAt: Date.now(),
    });

    // If staleTime is 0, mark as stale immediately
    if (staleTime === 0) {
      queryClient.invalidateQueries({
        queryKey,
        refetchType: 'none', // Don't refetch, just mark stale
      });
    }

    hydratedRef.current = true;
  }, [keyString, data, queryClient, staleTime]);
}
````

**Step 2: Verify file exists**

Run: `ls -la app/modules/hydration/use-hydrate-query.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add app/modules/hydration/use-hydrate-query.ts
git commit -m "feat(hydration): add useHydrateQuery hook"
```

---

### Task 2.2: Create Hydration Module Index

**Files:**

- Create: `app/modules/hydration/index.ts`

**Step 1: Create the index file**

```typescript
// app/modules/hydration/index.ts

export * from './use-hydrate-query';
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors in hydration module

**Step 3: Commit**

```bash
git add app/modules/hydration/index.ts
git commit -m "feat(hydration): add hydration module exports"
```

---

## Phase 3: Domain Watch Hooks

### Task 3.1: Create DNS Zones Watch Hook

**Files:**

- Create: `app/resources/dns-zones/dns-zone.watch.ts`
- Modify: `app/resources/dns-zones/index.ts`

**Step 1: Create the watch hook file**

````typescript
// app/resources/dns-zones/dns-zone.watch.ts
import { toDnsZone } from './dns-zone.adapter';
import type { DnsZone } from './dns-zone.schema';
import { dnsZoneKeys } from './dns-zone.service';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch DNS zones list for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsZonesPage() {
 *   const { data } = useDnsZones(projectId);
 *
 *   // Subscribe to live updates
 *   useDnsZonesWatch(projectId);
 *
 *   return <DnsZoneTable zones={data?.items ?? []} />;
 * }
 * ```
 */
export function useDnsZonesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    namespace: projectId,
    queryKey: dnsZoneKeys.list(projectId),
    transform: toDnsZone,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single DNS zone for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsZoneDetailPage() {
 *   const { data } = useDnsZone(projectId, zoneName);
 *
 *   // Subscribe to live updates
 *   useDnsZoneWatch(projectId, zoneName);
 *
 *   return <DnsZoneDetail zone={data} />;
 * }
 * ```
 */
export function useDnsZoneWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    namespace: projectId,
    name,
    queryKey: dnsZoneKeys.detail(projectId, name),
    transform: toDnsZone,
    enabled: options?.enabled ?? true,
  });
}
````

**Step 2: Update index.ts to export watch hooks**

Add to `app/resources/dns-zones/index.ts`:

```typescript
export * from './dns-zone.watch';
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add app/resources/dns-zones/dns-zone.watch.ts app/resources/dns-zones/index.ts
git commit -m "feat(dns-zones): add watch hooks for real-time updates"
```

---

### Task 3.2: Create Projects Watch Hook

**Files:**

- Create: `app/resources/projects/project.watch.ts`
- Modify: `app/resources/projects/index.ts`

**Step 1: Check existing project service for keys**

Run: `grep -n "projectKeys\|export const.*Keys" app/resources/projects/project.service.ts | head -20`

**Step 2: Create the watch hook file**

```typescript
// app/resources/projects/project.watch.ts
import { toProject } from './project.adapter';
import type { Project } from './project.schema';
import { projectKeys } from './project.service';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch projects list for real-time updates.
 */
export function useProjectsWatch(orgId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Project>({
    resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
    namespace: orgId,
    queryKey: projectKeys.list(orgId),
    transform: toProject,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single project for real-time updates.
 */
export function useProjectWatch(orgId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Project>({
    resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
    namespace: orgId,
    name,
    queryKey: projectKeys.detail(orgId, name),
    transform: toProject,
    enabled: options?.enabled ?? true,
  });
}
```

**Step 3: Update index.ts to export watch hooks**

Add to `app/resources/projects/index.ts`:

```typescript
export * from './project.watch';
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/resources/projects/project.watch.ts app/resources/projects/index.ts
git commit -m "feat(projects): add watch hooks for real-time updates"
```

---

### Task 3.3: Create DNS Records Watch Hook

**Files:**

- Create: `app/resources/dns-records/dns-record.watch.ts`
- Modify: `app/resources/dns-records/index.ts`

**Step 1: Check existing dns-record service for keys**

Run: `grep -n "dnsRecordKeys\|export const.*Keys" app/resources/dns-records/dns-record.service.ts | head -20`

**Step 2: Create the watch hook file**

```typescript
// app/resources/dns-records/dns-record.watch.ts
import { toDnsRecord } from './dns-record.adapter';
import type { DnsRecord } from './dns-record.schema';
import { dnsRecordKeys } from './dns-record.service';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch DNS records list for real-time updates.
 */
export function useDnsRecordsWatch(
  projectId: string,
  dnsZoneName: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<DnsRecord>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnsrecords',
    namespace: projectId,
    labelSelector: `dns.networking.miloapis.com/zone-name=${dnsZoneName}`,
    queryKey: dnsRecordKeys.list(projectId, dnsZoneName),
    transform: toDnsRecord,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single DNS record for real-time updates.
 */
export function useDnsRecordWatch(
  projectId: string,
  name: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<DnsRecord>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnsrecords',
    namespace: projectId,
    name,
    queryKey: dnsRecordKeys.detail(projectId, name),
    transform: toDnsRecord,
    enabled: options?.enabled ?? true,
  });
}
```

**Step 3: Update index.ts to export watch hooks**

Add to `app/resources/dns-records/index.ts`:

```typescript
export * from './dns-record.watch';
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/resources/dns-records/dns-record.watch.ts app/resources/dns-records/index.ts
git commit -m "feat(dns-records): add watch hooks for real-time updates"
```

---

### Task 3.4: Create HTTP Proxies Watch Hook

**Files:**

- Create: `app/resources/http-proxies/http-proxy.watch.ts`
- Modify: `app/resources/http-proxies/index.ts`

**Step 1: Check existing http-proxy service for keys**

Run: `grep -n "httpProxyKeys\|export const.*Keys" app/resources/http-proxies/http-proxy.service.ts | head -20`

**Step 2: Create the watch hook file**

```typescript
// app/resources/http-proxies/http-proxy.watch.ts
import { toHttpProxy } from './http-proxy.adapter';
import type { HttpProxy } from './http-proxy.schema';
import { httpProxyKeys } from './http-proxy.service';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch HTTP proxies list for real-time updates.
 */
export function useHttpProxiesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<HttpProxy>({
    resourceType: 'apis/networking.edge.miloapis.com/v1alpha1/httpproxies',
    namespace: projectId,
    queryKey: httpProxyKeys.list(projectId),
    transform: toHttpProxy,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single HTTP proxy for real-time updates.
 */
export function useHttpProxyWatch(
  projectId: string,
  name: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<HttpProxy>({
    resourceType: 'apis/networking.edge.miloapis.com/v1alpha1/httpproxies',
    namespace: projectId,
    name,
    queryKey: httpProxyKeys.detail(projectId, name),
    transform: toHttpProxy,
    enabled: options?.enabled ?? true,
  });
}
```

**Step 3: Update index.ts to export watch hooks**

Add to `app/resources/http-proxies/index.ts`:

```typescript
export * from './http-proxy.watch';
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/resources/http-proxies/http-proxy.watch.ts app/resources/http-proxies/index.ts
git commit -m "feat(http-proxies): add watch hooks for real-time updates"
```

---

### Task 3.5: Create Secrets Watch Hook

**Files:**

- Create: `app/resources/secrets/secret.watch.ts`
- Modify: `app/resources/secrets/index.ts`

**Step 1: Check existing secret service for keys**

Run: `grep -n "secretKeys\|export const.*Keys" app/resources/secrets/secret.service.ts | head -20`

**Step 2: Create the watch hook file**

```typescript
// app/resources/secrets/secret.watch.ts
import { toSecret } from './secret.adapter';
import type { Secret } from './secret.schema';
import { secretKeys } from './secret.service';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch secrets list for real-time updates.
 */
export function useSecretsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Secret>({
    resourceType: 'apis/core.miloapis.com/v1alpha1/secrets',
    namespace: projectId,
    queryKey: secretKeys.list(projectId),
    transform: toSecret,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single secret for real-time updates.
 */
export function useSecretWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Secret>({
    resourceType: 'apis/core.miloapis.com/v1alpha1/secrets',
    namespace: projectId,
    name,
    queryKey: secretKeys.detail(projectId, name),
    transform: toSecret,
    enabled: options?.enabled ?? true,
  });
}
```

**Step 3: Update index.ts to export watch hooks**

Add to `app/resources/secrets/index.ts`:

```typescript
export * from './secret.watch';
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/resources/secrets/secret.watch.ts app/resources/secrets/index.ts
git commit -m "feat(secrets): add watch hooks for real-time updates"
```

---

### Task 3.6: Create Export Policies Watch Hook

**Files:**

- Create: `app/resources/export-policies/export-policy.watch.ts`
- Modify: `app/resources/export-policies/index.ts`

**Step 1: Check existing export-policy service for keys**

Run: `grep -n "exportPolicyKeys\|export const.*Keys" app/resources/export-policies/export-policy.service.ts | head -20`

**Step 2: Create the watch hook file**

```typescript
// app/resources/export-policies/export-policy.watch.ts
import { toExportPolicy } from './export-policy.adapter';
import type { ExportPolicy } from './export-policy.schema';
import { exportPolicyKeys } from './export-policy.service';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch export policies list for real-time updates.
 */
export function useExportPoliciesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<ExportPolicy>({
    resourceType: 'apis/telemetry.miloapis.com/v1alpha1/metricexportpolicies',
    namespace: projectId,
    queryKey: exportPolicyKeys.list(projectId),
    transform: toExportPolicy,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single export policy for real-time updates.
 */
export function useExportPolicyWatch(
  projectId: string,
  name: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<ExportPolicy>({
    resourceType: 'apis/telemetry.miloapis.com/v1alpha1/metricexportpolicies',
    namespace: projectId,
    name,
    queryKey: exportPolicyKeys.detail(projectId, name),
    transform: toExportPolicy,
    enabled: options?.enabled ?? true,
  });
}
```

**Step 3: Update index.ts to export watch hooks**

Add to `app/resources/export-policies/index.ts`:

```typescript
export * from './export-policy.watch';
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/resources/export-policies/export-policy.watch.ts app/resources/export-policies/index.ts
git commit -m "feat(export-policies): add watch hooks for real-time updates"
```

---

## Phase 4: Migrate from useRevalidation to Watch

### Task 4.1: Migrate DNS Zones Index Page

**Files:**

- Modify: `app/routes/project/detail/edge/dns-zones/index.tsx`

**Step 1: Replace useRevalidation with watch hook**

Remove import:

```typescript
import { useRevalidation } from '@/hooks/useRevalidation';
```

Add import:

```typescript
import { useDnsZonesWatch } from '@/resources/dns-zones';
```

Replace the useRevalidation usage:

```typescript
// BEFORE:
const { revalidate } = useRevalidation({
  interval: hasLoadingZones ? 3000 : false,
});

// AFTER:
// Subscribe to live updates when zones are loading
useDnsZonesWatch(projectId ?? '', {
  enabled: hasLoadingZones,
});
```

Update the deleteMutation to remove revalidate call (React Query will auto-invalidate):

```typescript
const deleteMutation = useDeleteDnsZone(projectId ?? '', {
  onSuccess: () => {
    toast.success('DNS', {
      description: 'The DNS has been deleted successfully',
    });
    // Remove: revalidate();
  },
  onError: (error) => {
    toast.error('DNS', {
      description: error.message || 'Failed to delete DNS',
    });
  },
});
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/routes/project/detail/edge/dns-zones/index.tsx
git commit -m "refactor(dns-zones): replace useRevalidation with watch hook"
```

---

## Phase 5: Migrate useFetcher to React Query Mutations

### Task 5.1: Create User Mutations Hook

**Files:**

- Modify: `app/resources/users/user.queries.ts`

**Step 1: Check if useUpdateUser mutation exists**

Run: `grep -n "useUpdateUser" app/resources/users/user.queries.ts`

If not exists, add:

```typescript
export function useUpdateUser(options?: UseMutationOptions<User, Error, UpdateUserInput>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createUserService(ctx);

  return useMutation({
    mutationFn: (input: UpdateUserInput) => service.update(input),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.current(), updatedUser);
    },
    ...options,
  });
}
```

**Step 2: Commit if changes made**

```bash
git add app/resources/users/user.queries.ts
git commit -m "feat(users): add useUpdateUser mutation hook"
```

---

### Task 5.2: Migrate Profile Card from useFetcher

**Files:**

- Modify: `app/features/account/settings/profile-card.tsx`

**Step 1: Replace useFetcher with React Query mutation**

Remove imports:

```typescript
import { useIsPending } from '@/hooks/useIsPending';
import { ROUTE_PATH as USER_UPDATE_ACTION } from '@/routes/api/user';
import { useFetcher } from 'react-router';
```

Add import:

```typescript
import { useUpdateUser } from '@/resources/users';
```

Replace fetcher usage:

```typescript
// BEFORE:
const fetcher = useFetcher({ key: formId });
const isPending = useIsPending({ formId, fetcherKey: formId });

// AFTER:
const updateMutation = useUpdateUser({
  onSuccess: () => {
    toast.success('Profile updated successfully', {
      description: 'You have successfully updated your profile.',
    });
  },
  onError: (error) => {
    toast.error('Error', {
      description: error.message ?? 'An error occurred while updating your profile',
    });
  },
});
const isPending = updateMutation.isPending;
```

Update form onSubmit:

```typescript
onSubmit(event, { submission }) {
  event.preventDefault();
  event.stopPropagation();

  if (submission?.status === 'success') {
    const value = submission.value;
    updateMutation.mutate({
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
    });
  }
},
```

Remove the useEffect that handles fetcher.data.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/features/account/settings/profile-card.tsx
git commit -m "refactor(profile): replace useFetcher with useUpdateUser mutation"
```

---

### Task 5.3-5.35: Migrate Remaining useFetcher Files

For each of the remaining files using useFetcher, follow the same pattern:

1. Identify the action being performed (create, update, delete)
2. Find or create the corresponding React Query mutation hook
3. Replace useFetcher with the mutation hook
4. Remove the useEffect that handles fetcher.data
5. Update form submission to use mutation.mutate()

**Files to migrate (grouped by domain):**

**Account Settings:**

- `app/features/account/settings/portal-card.tsx`
- `app/features/account/settings/danger-card.tsx`
- `app/features/account/settings/newsletter-card.tsx`

**Edge Features:**

- `app/features/edge/proxy/form.tsx`
- `app/features/edge/proxy/preview.tsx`
- `app/features/edge/dns-zone/form.tsx`
- `app/features/edge/dns-zone/discovery-preview.tsx`
- `app/features/edge/dns-zone/overview/description-form-card.tsx`
- `app/features/edge/dns-records/dns-record-status.tsx`

**Organization Features:**

- `app/features/organization/team/manage-role.tsx`

**Secret Features:**

- `app/features/secret/form/keys/keys-form-dialog.tsx`
- `app/features/secret/form/edit/edit-metadata.tsx`
- `app/features/secret/form/edit/edit-keys.tsx`
- `app/features/secret/form/edit/edit-key-value-dialog.tsx`

**Metric Features:**

- `app/features/metric/export-policies/status.tsx`

**Project Features:**

- `app/features/project/status.tsx`

**Activity Log:**

- `app/features/activity-log/list.tsx`

**Components:**

- `app/components/notification/items/invitation-notification-item.tsx`
- `app/components/select-secret/select-secret.tsx`
- `app/components/select-member/select-member.tsx`
- `app/components/select-project/select-project.tsx`
- `app/components/select-organization/select-organization.tsx`
- `app/components/header/project-switcher.tsx`

**Routes:**

- `app/routes/project/detail/edge/proxy/detail/tabs/layout.tsx`
- `app/routes/project/detail/edge/proxy/index.tsx`
- `app/routes/project/detail/metrics/export-policies/index.tsx`
- `app/routes/project/detail/config/secrets/index.tsx`
- `app/routes/invitation/index.tsx`

---

## Phase 6: Cleanup Legacy Hooks

### Task 6.1: Delete useRevalidation Hook

**Files:**

- Delete: `app/hooks/useRevalidation.ts`

**Step 1: Verify no remaining usages**

Run: `grep -r "useRevalidation" app/ --include="*.ts" --include="*.tsx" | grep -v "docs/" | grep -v ".watch.ts"`

Expected: No matches (only design docs should reference it)

**Step 2: Delete the file**

Run: `rm app/hooks/useRevalidation.ts`

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete legacy useRevalidation hook (replaced by Watch)"
```

---

### Task 6.2: Delete useDatumFetcher Hook

**Files:**

- Delete: `app/hooks/useDatumFetcher.ts`

**Step 1: Verify no remaining usages**

Run: `grep -r "useDatumFetcher" app/ --include="*.ts" --include="*.tsx"`

Expected: No matches

**Step 2: Delete the file**

Run: `rm app/hooks/useDatumFetcher.ts`

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete legacy useDatumFetcher hook (replaced by mutations)"
```

---

### Task 6.3: Delete useNotificationPolling Hook

**Files:**

- Delete: `app/hooks/useNotificationPolling.ts`

**Step 1: Verify no remaining usages**

Run: `grep -r "useNotificationPolling" app/ --include="*.ts" --include="*.tsx"`

Expected: No matches

**Step 2: Delete the file**

Run: `rm app/hooks/useNotificationPolling.ts`

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete legacy useNotificationPolling hook (replaced by Watch)"
```

---

### Task 6.4: Final Verification

**Step 1: Run full typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 2: Run linter**

Run: `bun run lint`
Expected: No errors

**Step 3: Run build**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete SSR/CSR hybrid + Watch migration"
```

---

## Summary

**Phase 1:** Watch Infrastructure (7 tasks)

- Types, parser, manager, context, hook, index, layout integration

**Phase 2:** Hydration Infrastructure (2 tasks)

- useHydrateQuery hook, module index

**Phase 3:** Domain Watch Hooks (6 tasks)

- DNS zones, projects, DNS records, HTTP proxies, secrets, export policies

**Phase 4:** Migrate useRevalidation (1 task)

- DNS zones index page

**Phase 5:** Migrate useFetcher (35 tasks)

- Profile card + 34 other components

**Phase 6:** Cleanup (4 tasks)

- Delete legacy hooks, final verification

**Total: 55 tasks**
