# SSR/CSR Hybrid + K8s Watch: Edge Resources Design

## Overview

Implement SSR + Watch hydration pattern for Edge resources (DNS Zones, DNS Records, HTTP Proxies, Domains, Secrets) with full BFF route cleanup.

**Goals:**

- Instant page loads via SSR
- Real-time updates via K8s Watch
- Clean architecture: Component → Hook → Service (no BFF)
- Delete all Edge resource BFF routes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Page Request                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Loader (SSR)                                                    │
│  - Calls service layer directly (e.g., dnsZoneService.list())   │
│  - Returns data for initial render                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Component Hydration                                             │
│  - useHydrateQuery() seeds React Query cache with loader data   │
│  - useResourceWatch() connects to K8s Watch API                  │
│  - Watch events update React Query cache automatically           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Mutations                                                       │
│  - React Query mutations call service layer                      │
│  - Success → toast notification                                  │
│  - Watch detects change → updates cache → UI refreshes           │
└─────────────────────────────────────────────────────────────────┘
```

## Design Decisions

| Decision           | Choice                        | Rationale                                          |
| ------------------ | ----------------------------- | -------------------------------------------------- |
| Data fetching      | SSR + Watch hydration         | Instant content + live updates                     |
| BFF cleanup        | Delete all, use service layer | Simplest architecture                              |
| Bulk operations    | React Query hooks             | Plan improvements later                            |
| UI updates         | Silent background             | Simplest, add toasts later if needed               |
| Mutation → UI sync | Watch handles updates         | Single source of truth, 100-500ms delay acceptable |

## Per-Resource Module Structure

```
app/resources/dns-zones/
├── dns-zone.schema.ts      # Zod schema + types
├── dns-zone.adapter.ts     # API → domain transform
├── dns-zone.service.ts     # Service layer (SSR)
├── dns-zone.queries.ts     # React Query hooks + hydration
├── dns-zone.watch.ts       # K8s Watch hook
└── index.ts                # Public exports
```

## Migration Pattern

### Before (BFF pattern):

```tsx
// Page route loader
export const loader = async ({ request }) => {
  const response = await fetch('/api/dns-zones');
  return { zones: await response.json() };
};

// Component
function DnsZonesList() {
  const { zones } = useLoaderData();
  const fetcher = useFetcher();

  const handleDelete = (id) => {
    fetcher.submit({ id }, { action: '/api/dns-zones', method: 'DELETE' });
  };
}
```

### After (Resource hooks pattern):

```tsx
// Page route loader
export const loader = async ({ params, context }) => {
  const service = createDnsZoneService(context);
  const zones = await service.list(params.projectId);
  return { zones };
};

// Component
function DnsZonesList() {
  const { zones } = useLoaderData();
  const { projectId } = useParams();

  // Hydrate React Query cache with SSR data
  useHydrateDnsZones(projectId, zones);

  // Watch for real-time updates
  useDnsZonesWatch(projectId);

  // Use mutation hook (watch will update list automatically)
  const deleteMutation = useDeleteDnsZone({
    onSuccess: () => toast.success('DNS Zone deleted'),
  });

  const handleDelete = (id) => deleteMutation.mutate({ projectId, id });
}
```

## Hydration Hook Pattern

```tsx
// app/resources/dns-zones/dns-zone.queries.ts

export const dnsZoneKeys = {
  all: ['dns-zones'] as const,
  list: (projectId: string) => [...dnsZoneKeys.all, 'list', projectId] as const,
  detail: (projectId: string, name: string) =>
    [...dnsZoneKeys.all, 'detail', projectId, name] as const,
};

/**
 * Hydrates React Query cache with SSR data.
 * Only runs once on mount to seed the cache, then watch takes over.
 */
export function useHydrateDnsZones(projectId: string, initialData: DnsZone[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(dnsZoneKeys.list(projectId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}
```

## Watch + React Query Cache Integration

```tsx
// In useResourceWatch - updates React Query cache on events
eventSource.onmessage = (event) => {
  const watchEvent = JSON.parse(event.data);
  const item = transform(watchEvent.object);

  if (name) {
    // Detail view - update single item
    queryClient.setQueryData(queryKey, item);
  } else {
    // List view - update list
    queryClient.setQueryData(queryKey, (old: T[] = []) => {
      switch (watchEvent.type) {
        case 'ADDED':
          return [...old.filter((i) => i.name !== item.name), item];
        case 'MODIFIED':
          return old.map((i) => (i.name === item.name ? item : i));
        case 'DELETED':
          return old.filter((i) => i.name !== item.name);
        default:
          return old;
      }
    });
  }
};
```

## Error Handling

| Scenario                  | Handling                                        |
| ------------------------- | ----------------------------------------------- |
| Watch connection fails    | Fallback to React Query `refetchInterval` (30s) |
| Watch reconnection        | Resume from last `resourceVersion`              |
| SSR loader error          | Return empty array, component shows error state |
| Mutation fails            | Toast error, no cache update                    |
| Stale cache on navigation | Hydration overwrites with fresh SSR data        |

## Implementation Scope

### Resources (5):

| Resource     | Hydration Hook          | Watch Hook     | Status       |
| ------------ | ----------------------- | -------------- | ------------ |
| DNS Zones    | `useHydrateDnsZones`    | exists         | To implement |
| DNS Records  | `useHydrateDnsRecords`  | exists         | To implement |
| HTTP Proxies | `useHydrateHttpProxies` | exists         | To implement |
| Domains      | `useHydrateDomains`     | needs creation | To implement |
| Secrets      | `useHydrateSecrets`     | exists         | To implement |

### BFF Routes to Delete (13 files + route registrations):

**Route files to delete:**

- `app/routes/api/dns-zones/index.ts`
- `app/routes/api/dns-records/index.ts`
- `app/routes/api/dns-records/$id.ts`
- `app/routes/api/dns-records/status.ts`
- `app/routes/api/dns-records/bulk-import.ts`
- `app/routes/api/proxy/index.ts`
- `app/routes/api/proxy/$id.ts`
- `app/routes/api/domains/index.ts`
- `app/routes/api/domains/refresh.ts`
- `app/routes/api/domains/status.ts`
- `app/routes/api/domains/bulk-import.ts`
- `app/routes/api/secrets/index.ts`

**Route registrations to remove from `app/routes.ts`:**

```ts
route('dns-zones', 'routes/api/dns-zones/index.ts'),
route('dns-records', 'routes/api/dns-records/index.ts'),
route('dns-records/bulk-import', 'routes/api/dns-records/bulk-import.ts'),
route('dns-records/:id', 'routes/api/dns-records/$id.ts'),
route('dns-records/:id/status', 'routes/api/dns-records/status.ts'),
route('proxy', 'routes/api/proxy/index.ts'),
route('proxy/:id', 'routes/api/proxy/$id.ts'),
route('domains', 'routes/api/domains/index.ts'),
route('domains/refresh', 'routes/api/domains/refresh.ts'),
route('domains/bulk-import', 'routes/api/domains/bulk-import.ts'),
route('domains/:id/status', 'routes/api/domains/status.ts'),
route('secrets', 'routes/api/secrets/index.ts'),
```

### Tasks per Resource:

1. Add hydration hooks to `*.queries.ts`
2. Update page loaders to use service layer directly
3. Update components: add hydration + watch hooks
4. Migrate BFF usages to mutation hooks
5. Delete BFF route files
6. Remove route registrations from `app/routes.ts`
