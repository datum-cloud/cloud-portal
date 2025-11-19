# Optimistic Cache Management System

A centralized cache management system for handling optimistic UI updates during async operations (create, update, delete). This system solves the problem of deleted items reappearing when backend APIs take time to fully remove data (30-60+ seconds).

## Problem Statement

When deleting resources through API calls, there's often a delay between when the API returns success and when the data is actually removed from the database. This causes:

- Deleted items reappearing on page refresh
- Confusing user experience (I just deleted that!)
- Need for manual cache invalidation logic scattered throughout the codebase

## Solution

This cache system provides:

- **TTL-based Protection**: Items marked as "deleting" stay hidden for a minimum duration (default: 60 seconds)
- **Smart Merge Strategy**: Combines fresh API data with cached metadata for eventual consistency
- **Automatic Cleanup**: When TTL expires, items naturally reappear if deletion failed
- **Centralized Management**: Single `ResourceCache` class handles all resource types
- **Type Safety**: Full TypeScript support with generics

## Quick Start

### 1. Basic Delete Operation

```typescript
import { ResourceCache, RESOURCE_CACHE_CONFIG } from '@/utils/cache';
import type { AppLoadContext } from 'react-router';

// In your action function
export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { cache } = context as AppLoadContext;
  const formData = await request.formData();
  const projectId = formData.get('projectId') as string;
  const zoneId = formData.get('id') as string;

  // Initialize cache for DNS zones
  const dnsZoneCache = new ResourceCache(
    cache,
    RESOURCE_CACHE_CONFIG.dnsZones,
    RESOURCE_CACHE_CONFIG.dnsZones.getCacheKey(projectId)
  );

  try {
    // 1. Mark as deleting (hides from UI immediately)
    await dnsZoneCache.markAsDeleting(zoneId);

    // 2. Call the API
    await api.deleteDnsZone(projectId, zoneId);

    // 3. DON'T call cache.remove() - let merge() handle cleanup!

    return redirectWithToast('/dns-zones', {
      title: 'DNS Zone deleted',
      type: 'success',
    });
  } catch (error) {
    // If deletion fails, revert the cache
    await dnsZoneCache.revert(zoneId);
    throw error;
  }
};
```

### 2. Loader with Cache Merge

```typescript
// In your loader function
export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { cache } = context as AppLoadContext;
  const { projectId } = params;

  const dnsZoneCache = new ResourceCache(
    cache,
    RESOURCE_CACHE_CONFIG.dnsZones,
    RESOURCE_CACHE_CONFIG.dnsZones.getCacheKey(projectId!)
  );

  // Fetch fresh data from API
  const freshDnsZones = await api.listDnsZones(projectId);

  // Merge with cached metadata (preserves "deleting" status during TTL)
  const mergedDnsZones = await dnsZoneCache.merge(freshDnsZones);

  // Check if we should poll for updates
  const shouldPoll = mergedDnsZones.some((zone) => zone._meta?.status === 'deleting');

  return data({ zones: mergedDnsZones, shouldPoll });
};
```

### 3. Component Usage

```typescript
import { useLoaderData, useFetcher, useRevalidator } from 'react-router';
import { useEffect } from 'react';

export default function DnsZonesPage() {
  const { zones, shouldPoll } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  // Filter out items marked as deleting
  const visibleZones = zones.filter((zone) => zone._meta?.status !== 'deleting');

  // Auto-poll when items are processing
  useEffect(() => {
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 3000);

    return () => clearInterval(interval);
  }, [shouldPoll, revalidator]);

  const handleDelete = (zoneId: string) => {
    fetcher.submit(
      { id: zoneId, projectId: params.projectId },
      { method: 'DELETE', action: '/api/dns-zones' }
    );
  };

  return (
    <div>
      {visibleZones.map((zone) => (
        <div key={zone.id}>
          <span>{zone.name}</span>
          <button onClick={() => handleDelete(zone.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Architecture

### Core Components

```
app/utils/cache/
├── types.ts                      # TypeScript type definitions
├── resource-cache.config.ts      # Resource configurations
├── optimistic-cache.helper.ts    # ResourceCache class
├── index.ts                      # Barrel exports
├── FUTURE_ENHANCEMENTS.md        # Advanced usage & roadmap
└── README.md                     # This file
```

### ResourceCache Class

The `ResourceCache<T>` class provides these key methods:

#### Delete Operations
- `markAsDeleting(resourceId, minTtl?)`: Mark item as deleting with TTL protection
- `remove(resourceId)`: Completely remove from cache (rarely used)
- `revert(resourceId)`: Restore item if operation fails

#### Create Operations
- `addAsCreating(resource)`: Add optimistic creation
- `replaceCreated(tempId, createdResource)`: Replace with API response

#### Update Operations
- `markAsProcessing(resourceId, operation)`: Mark as creating/updating/deleting

#### Merge & Sync
- `merge(freshData)`: Combine fresh API data with cached metadata
- `cleanupStaleOperations(ttlMinutes?)`: Remove stale operations

### Cache Metadata

Each cached resource can have a `_meta` field:

```typescript
interface CacheMetadata {
  status: 'deleting' | 'creating' | 'updating';
  deletedAt?: string;    // ISO timestamp
  createdAt?: string;    // ISO timestamp
  updatedAt?: string;    // ISO timestamp
  minTtl?: number;       // Minimum time (ms) to keep status
}

type CachedResource<T> = T & {
  _meta?: CacheMetadata;
};
```

### TTL Protection Timeline

```
Time:     0s          30s         60s         90s
          |           |           |           |
API:      DELETE ───> [processing...] ───> success
Cache:    deleting ──────────────────────> check API
UI:       hidden ────────────────────────> show if still exists
          └─────────── minTtl (60s) ──────┘
```

During TTL period (60s), even if API still returns the item, it stays hidden. After TTL expires, if API still returns it, the item reappears (signals deletion failure).

## Configuration

### Adding a New Resource Type

1. Add configuration to [resource-cache.config.ts](resource-cache.config.ts):

```typescript
export const RESOURCE_CACHE_CONFIG = {
  // ... existing configs

  myNewResource: {
    keyPrefix: 'my-resource',
    identifierField: 'id',  // or 'name', 'uuid', etc.
    getCacheKey: (parentId: string) => `my-resource:${parentId}`,
  },
} as const;
```

2. Use it in your routes:

```typescript
const myResourceCache = new ResourceCache(
  cache,
  RESOURCE_CACHE_CONFIG.myNewResource,
  RESOURCE_CACHE_CONFIG.myNewResource.getCacheKey(parentId)
);
```

### Existing Configurations

- **projects**: `projects:{orgId}` (identifier: `name`)
- **dnsZones**: `dns-zones:{projectId}` (identifier: `id`)
- **domains**: `domains:{projectId}` (identifier: `id`)
- **dnsRecords**: `dns-records:{zoneId}` (identifier: `id`)

## Best Practices

### ✅ DO

- Always use `markAsDeleting()` before API delete calls
- Always use `merge()` in loaders to combine fresh data with cache
- Filter out deleting items in UI: `items.filter(i => i._meta?.status !== 'deleting')`
- Implement smart polling when `shouldPoll` is true
- Use `revert()` in catch blocks when operations fail

### ❌ DON'T

- Don't call `cache.remove()` immediately after API delete (let merge handle it)
- Don't show items with `_meta.status === 'deleting'` in the UI
- Don't manually manipulate cache keys - use `getCacheKey()` methods
- Don't skip the merge step in loaders
- Don't forget to handle errors with `revert()`

## Common Patterns

### Pattern 1: Delete with Redirect

```typescript
try {
  await cache.markAsDeleting(id);
  await api.delete(id);
  return redirectWithToast('/list', { title: 'Deleted' });
} catch (error) {
  await cache.revert(id);
  throw error;
}
```

### Pattern 2: Delete without Redirect

```typescript
try {
  await cache.markAsDeleting(id);
  await api.delete(id);
  return data({ success: true });
} catch (error) {
  await cache.revert(id);
  return data({ success: false, error: error.message });
}
```

### Pattern 3: Loader with Polling

```typescript
const freshData = await api.list();
const mergedData = await cache.merge(freshData);
const shouldPoll = mergedData.some(item => item._meta?.status === 'deleting');
return data({ items: mergedData, shouldPoll });
```

## Advanced Usage

For advanced patterns including create/update operations, manual TTL management, and migration strategies, see [FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md).

## Implementation Examples

- **Projects**: [app/routes/org/detail/projects/index.tsx](../../routes/org/detail/projects/index.tsx)
- **DNS Zones**: [app/routes/project/detail/edge/dns-zones/index.tsx](../../routes/project/detail/edge/dns-zones/index.tsx)
- **Delete Actions**: [app/routes/api/dns-zones/index.ts](../../routes/api/dns-zones/index.ts)

## Troubleshooting

### Items reappear after refresh

**Cause**: Not using `merge()` in loader or calling `cache.remove()` too early

**Fix**: Always use `merge()` and don't call `remove()`:
```typescript
const mergedData = await cache.merge(freshData);
```

### Items show immediately after deletion

**Cause**: Not filtering `_meta.status === 'deleting'` in UI

**Fix**: Filter in component:
```typescript
const visible = items.filter(item => item._meta?.status !== 'deleting');
```

### Items never disappear

**Cause**: API deletion is failing silently or TTL is too long

**Fix**: Check API logs. Reduce TTL if needed:
```typescript
await cache.markAsDeleting(id, 30000); // 30 seconds instead of 60
```

### Stale operations building up

**Cause**: Operations failing without proper cleanup

**Fix**: Add periodic cleanup:
```typescript
// In your loader
await cache.cleanupStaleOperations(5); // Remove operations older than 5 minutes
```

## Performance Considerations

- Cache operations are async but typically fast (<10ms)
- TTL checks happen during `merge()` (no background timers)
- Smart polling prevents unnecessary revalidations
- Cache is stored server-side via `unstorage`

## Type Safety

Full TypeScript support with generics:

```typescript
interface DnsZone {
  id: string;
  name: string;
  status: string;
}

const cache = new ResourceCache<DnsZone>(
  storage,
  RESOURCE_CACHE_CONFIG.dnsZones,
  'dns-zones:project-123'
);

// Type-safe operations
const zones: CachedResource<DnsZone>[] = await cache.merge(freshZones);
```

## Contributing

When adding new features:

1. Update [types.ts](types.ts) for new interfaces
2. Add configurations to [resource-cache.config.ts](resource-cache.config.ts)
3. Extend [optimistic-cache.helper.ts](optimistic-cache.helper.ts) for new methods
4. Document in [FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md)
5. Update this README with examples

## License

Internal use only - Datum Cloud Portal
