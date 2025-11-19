# Cache Helper - Future Enhancements

This document outlines recommended extensions to the `ResourceCache` class for handling additional operations beyond deletions.

## Current Implementation Status

### ✅ Implemented (v1.0)

- **Delete operations** with delayed API cleanup
- **Optimistic deletion** (immediate UI feedback)
- **Cache merge strategy** (handles eventual consistency)
- **Rollback on failure**
- **TTL-based cleanup**
- **Create operations** (basic support via `addAsCreating` and `replaceCreated`)

### 🎯 Ready for Implementation

The architecture is already flexible enough to support these enhancements. Add them incrementally as needed.

---

## ⚠️ Important: Delete Flow Pattern

**Critical:** When implementing delete operations, do NOT call `remove()` in the action. Let the merge strategy handle cleanup naturally.

### ❌ Wrong Pattern (causes items to reappear)

```typescript
await cache.markAsDeleting(id);
await api.delete(id);
await cache.remove(id);  // ❌ DON'T DO THIS
return redirect('/list');
```

**Problem:** API may still return the item for a few seconds after deletion. When you redirect to the list page, the loader fetches fresh data, item reappears, user sees flickering.

### ✅ Correct Pattern (smooth UX with TTL)

```typescript
await cache.markAsDeleting(id);  // Default: 60s TTL
// Or specify custom TTL:
// await cache.markAsDeleting(id, 120000);  // 2 minutes

await api.delete(id);
// Don't remove - let merge() handle it ✅
return redirect('/list');
```

**How it works:**

1. Mark as deleting → cache has `_meta = { status: 'deleting', deletedAt: '...', minTtl: 60000 }`
2. API deletion succeeds
3. Redirect to list page
4. Loader runs `merge()`:
   - API still returns item → merge preserves "deleting" status (because TTL not expired)
   - UI filters it out via `data.filter(item => item._meta?.status !== 'deleting')`
5. **User refreshes page multiple times** → item stays hidden for 60 seconds
6. After 60 seconds:
   - If API still returns it → TTL expired → item shows up again (deletion failed?)
   - If API stopped returning it → auto-cleaned from cache
7. User never sees flickering

**TTL Benefits:**

- ✅ Prevents items from reappearing on refresh
- ✅ Works even if API takes 30-60 seconds to delete
- ✅ Automatically shows item again if deletion actually failed
- ✅ Configurable per operation

**Implementation:**

```typescript
// In DELETE action
try {
  // Keep "deleting" for 1 minute minimum
  await cache.markAsDeleting(id, 60000);

  await api.delete(id);

  // Don't remove - let merge() + TTL handle it
  return redirectWithToast('/list', { ... });
} catch (error) {
  await cache.revert(id);  // Rollback on failure
  throw error;
}

// In loader
const fresh = await api.list();
const merged = await cache.merge(fresh);  // Respects TTL automatically
return merged;

// In component
const visible = data.filter(item => item._meta?.status !== 'deleting');
```

**TTL Behavior:**

```typescript
Time 0s:    markAsDeleting(id, 60000) → hidden ✅
Time 10s:   User refreshes → still hidden ✅ (TTL: 50s left)
Time 30s:   User refreshes → still hidden ✅ (TTL: 30s left)
Time 50s:   API finally deleted → auto-cleanup ✅
Time 65s:   If API hadn't deleted → TTL expired → shows up (failure case)
```

---

## Priority 1: Essential Methods

### 1.1 `updateInPlace` - Update Resource Data

**Use Case:** After successful API update, replace cached data with fresh response

```typescript
/**
 * Update a resource in-place with fresh data
 * Preserves existing _meta if present
 */
async updateInPlace(id: string, updatedData: Partial<T>): Promise<void> {
  const cachedResources = await this.getCachedResources();
  if (!cachedResources) return;

  const updatedResources = cachedResources.map((resource) => {
    if (resource[this.config.identifierField as string] === id) {
      // Preserve _meta if it exists
      const meta = resource._meta;
      return { ...resource, ...updatedData, _meta: meta };
    }
    return resource;
  });

  await this.setCachedResources(updatedResources);
}
```

**Usage Example:**

```typescript
// In UPDATE action
const dnsZoneCache = new ResourceCache(cache, RESOURCE_CACHE_CONFIG.dnsZones, cacheKey);

await dnsZoneCache.markAsProcessing(zoneId, 'updating');

try {
  const updatedZone = await api.update(zoneId, changes);
  await dnsZoneCache.updateInPlace(zoneId, updatedZone);
  await dnsZoneCache.revert(zoneId); // Remove _meta
} catch (error) {
  await dnsZoneCache.revert(zoneId);
}
```

---

### 1.2 `updateMetadata` - Update Only Metadata

**Use Case:** Update progress, stage, or status without changing resource data

```typescript
/**
 * Update only the _meta field without changing resource data
 * Useful for progress tracking and status updates
 */
async updateMetadata(id: string, metadata: Partial<CacheMetadata>): Promise<void> {
  const cachedResources = await this.getCachedResources();
  if (!cachedResources) return;

  const updatedResources = cachedResources.map((resource) => {
    if (resource[this.config.identifierField as string] === id) {
      return {
        ...resource,
        _meta: {
          ...resource._meta,
          ...metadata,
        } as CacheMetadata,
      };
    }
    return resource;
  });

  await this.setCachedResources(updatedResources);
}
```

**Usage Example:**

```typescript
// Domain verification flow
await domainCache.updateMetadata(domainId, {
  status: 'processing',
  stage: 'verifying',
  progress: 33,
  message: 'Verifying DNS records...',
});

// Later, when verification completes
await domainCache.updateMetadata(domainId, {
  stage: 'active',
  progress: 100,
  message: 'Verification complete',
});
```

---

### 1.3 Enhanced Metadata Structure

**Extend `CacheMetadata` in `types.ts`:**

```typescript
export interface CacheMetadata {
  // Current operation
  status: 'deleting' | 'creating' | 'updating' | 'processing' | 'retrying';

  // Lifecycle tracking
  startedAt?: string;
  completedAt?: string;

  // Timestamps (existing)
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;

  // Progress tracking (0-100)
  progress?: number;

  // Sub-states for complex flows
  stage?: string; // e.g., 'verifying', 'provisioning', 'activating'

  // Error handling
  error?: string;
  retryCount?: number;
  maxRetries?: number;

  // User feedback
  message?: string; // e.g., "Verifying domain ownership..."

  // Auto-cleanup
  ttl?: number; // Time-to-live in milliseconds
}
```

---

## Priority 2: Batch Operations

### 2.1 `batchMarkAsProcessing` - Batch Optimistic Updates

**Use Case:** Multi-select delete, bulk operations

```typescript
/**
 * Mark multiple resources as undergoing an operation
 */
async batchMarkAsProcessing(
  resourceIds: string[],
  operation: 'deleting' | 'creating' | 'updating'
): Promise<void> {
  const cachedResources = await this.getCachedResources();
  if (!cachedResources) return;

  const timestampField = `${operation.replace('ing', '')}edAt` as keyof CacheMetadata;
  const metadata: CacheMetadata = {
    status: operation,
    [timestampField]: new Date().toISOString(),
  };

  const idsSet = new Set(resourceIds);

  const updatedResources = cachedResources.map((resource) =>
    idsSet.has(resource[this.config.identifierField as string])
      ? { ...resource, _meta: metadata }
      : resource
  );

  await this.setCachedResources(updatedResources);
}
```

### 2.2 `batchRemove` - Batch Removal

```typescript
/**
 * Remove multiple resources from cache
 */
async batchRemove(resourceIds: string[]): Promise<void> {
  const cachedResources = await this.getCachedResources();
  if (!cachedResources) return;

  const idsSet = new Set(resourceIds);

  const filteredResources = cachedResources.filter(
    (resource) => !idsSet.has(resource[this.config.identifierField as string])
  );

  await this.setCachedResources(filteredResources);
}
```

**Usage Example:**

```typescript
// Bulk delete DNS records
const recordIds = ['rec-1', 'rec-2', 'rec-3', 'rec-4', 'rec-5'];

await dnsRecordCache.batchMarkAsProcessing(recordIds, 'deleting');

try {
  await Promise.all(recordIds.map((id) => api.delete(id)));
  await dnsRecordCache.batchRemove(recordIds);
} catch (error) {
  // Revert all
  await Promise.all(recordIds.map((id) => dnsRecordCache.revert(id)));
}
```

---

## Priority 3: Utility Methods

### 3.1 `getOne` - Get Single Resource

```typescript
/**
 * Get a single resource from cache by ID
 */
async getOne(id: string): Promise<CachedResource<T> | null> {
  const cachedResources = await this.getCachedResources();
  if (!cachedResources) return null;

  return cachedResources.find(
    (resource) => resource[this.config.identifierField as string] === id
  ) || null;
}
```

### 3.2 `isProcessing` - Check Processing State

```typescript
/**
 * Check if a resource is currently processing
 */
async isProcessing(id: string): Promise<boolean> {
  const resource = await this.getOne(id);
  return resource?._meta?.status ? true : false;
}
```

### 3.3 `getByStatus` - Filter by Status

```typescript
/**
 * Get all resources currently in a specific state
 */
async getByStatus(status: CacheMetadata['status']): Promise<CachedResource<T>[]> {
  const cachedResources = await this.getCachedResources();
  if (!cachedResources) return [];

  return cachedResources.filter((resource) => resource._meta?.status === status);
}
```

### 3.4 `cancelOperation` - Cancel/Abort Operation

```typescript
/**
 * Cancel/abort an ongoing operation
 * Removes _meta to restore normal state
 */
async cancelOperation(id: string): Promise<void> {
  await this.revert(id);
}
```

---

## Real-World Implementation Scenarios

### Scenario 1: Domain Registration Flow (Long-Running Operation)

```typescript
// Step 1: User clicks "Register domain"
const domainCache = new ResourceCache(cache, RESOURCE_CACHE_CONFIG.domains, cacheKey);

await domainCache.markAsProcessing(domainId, 'creating');
await domainCache.updateMetadata(domainId, {
  stage: 'initializing',
  progress: 0,
  message: 'Starting registration...',
});

// Step 2: API call (takes 30+ seconds)
const job = await api.registerDomain(domainData);

// Step 3: Poll for completion
await domainCache.updateMetadata(domainId, {
  stage: 'registering',
  progress: 33,
  message: 'Registering with registrar...',
});

// Step 4: In loader (polling every 5s)
const fresh = await api.listDomains();
const merged = await domainCache.merge(fresh);

// Step 5: Detect completion
merged.forEach((domain) => {
  if (domain._meta?.stage === 'registering' && domain.status === 'registered') {
    domainCache.updateMetadata(domain.id, {
      stage: 'complete',
      progress: 100,
      message: 'Registration complete!',
    });

    // Remove _meta after 2 seconds
    setTimeout(() => domainCache.revert(domain.id), 2000);
  }
});
```

**UI Component:**

```tsx
function DomainStatusBadge({ domain }: { domain: CachedResource<Domain> }) {
  const meta = domain._meta;
  if (!meta) return null;

  return (
    <Badge>
      <Loader2Icon className="mr-1 h-3 w-3 animate-spin" />
      {meta.message}
      {meta.progress && <span className="ml-2 text-xs">({meta.progress}%)</span>}
    </Badge>
  );
}
```

---

### Scenario 2: DNS Zone Bulk Delete

```typescript
// User selects 5 zones and clicks "Delete"
const selectedZones = ['zone-1', 'zone-2', 'zone-3', 'zone-4', 'zone-5'];

// Mark all as deleting
await dnsZoneCache.batchMarkAsProcessing(selectedZones, 'deleting');

// Delete in parallel
const results = await Promise.allSettled(selectedZones.map((id) => api.deleteZone(id)));

// Handle results
const successful = [];
const failed = [];

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    successful.push(selectedZones[index]);
  } else {
    failed.push(selectedZones[index]);
  }
});

// Clean up successful deletions
await dnsZoneCache.batchRemove(successful);

// Revert failed deletions
await Promise.all(failed.map((id) => dnsZoneCache.revert(id)));

// Show toast
toast.success(`Deleted ${successful.length} zones`, {
  description: failed.length > 0 ? `Failed to delete ${failed.length} zones` : undefined,
});
```

---

### Scenario 3: Optimistic Update with Retry

```typescript
// Edit DNS record
const dnsRecordCache = new ResourceCache(cache, RESOURCE_CACHE_CONFIG.dnsRecords, cacheKey);

await dnsRecordCache.markAsProcessing(recordId, 'updating');

const maxRetries = 3;
let retryCount = 0;

while (retryCount < maxRetries) {
  try {
    const updated = await api.updateRecord(recordId, changes);
    await dnsRecordCache.updateInPlace(recordId, updated);
    await dnsRecordCache.revert(recordId);
    break;
  } catch (error) {
    retryCount++;

    if (retryCount < maxRetries) {
      await dnsRecordCache.updateMetadata(recordId, {
        status: 'retrying',
        retryCount,
        maxRetries,
        message: `Retry ${retryCount}/${maxRetries}...`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    } else {
      await dnsRecordCache.updateMetadata(recordId, {
        error: error.message,
        message: 'Update failed',
      });

      // Keep _meta to show error, but mark as failed
      setTimeout(() => dnsRecordCache.revert(recordId), 5000);
    }
  }
}
```

---

## UI Component Library

### Status Badge Component

```tsx
import type { CachedResource } from '@/utils/cache';
import { Badge } from '@datum-ui/components';
import { Loader2Icon, CheckIcon, XIcon } from 'lucide-react';

interface ResourceStatusBadgeProps {
  resource: CachedResource<any>;
  showProgress?: boolean;
}

export function ResourceStatusBadge({ resource, showProgress = true }: ResourceStatusBadgeProps) {
  const meta = resource._meta;
  if (!meta) return null;

  const statusConfig = {
    deleting: {
      label: 'Deleting...',
      variant: 'destructive' as const,
      icon: Loader2Icon,
      animate: true,
    },
    creating: {
      label: 'Creating...',
      variant: 'default' as const,
      icon: Loader2Icon,
      animate: true,
    },
    updating: {
      label: 'Saving...',
      variant: 'secondary' as const,
      icon: Loader2Icon,
      animate: true,
    },
    processing: {
      label: meta.message || 'Processing...',
      variant: 'default' as const,
      icon: Loader2Icon,
      animate: true,
    },
    retrying: {
      label: meta.message || 'Retrying...',
      variant: 'secondary' as const,
      icon: Loader2Icon,
      animate: true,
    },
  };

  const config = statusConfig[meta.status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className={`mr-1 h-3 w-3 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
      {showProgress && meta.progress !== undefined && (
        <span className="ml-1 text-xs">({meta.progress}%)</span>
      )}
      {meta.retryCount && meta.maxRetries && (
        <span className="ml-1 text-xs">
          ({meta.retryCount}/{meta.maxRetries})
        </span>
      )}
    </Badge>
  );
}
```

### Progress Bar Component

```tsx
import type { CachedResource } from '@/utils/cache';
import { Progress } from '@datum-ui/components';

interface ResourceProgressProps {
  resource: CachedResource<any>;
}

export function ResourceProgress({ resource }: ResourceProgressProps) {
  const meta = resource._meta;
  if (!meta?.progress) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{meta.message || meta.status}</span>
        <span className="text-muted-foreground">{meta.progress}%</span>
      </div>
      <Progress value={meta.progress} />
    </div>
  );
}
```

---

## Migration Strategy

### Phase 1: Current Implementation ✅

- [x] Delete operations with delayed cleanup
- [x] Basic create operations (`addAsCreating`, `replaceCreated`)
- [x] Cache merge strategy
- [x] Rollback on failure

### Phase 2: Essential Updates (Priority 1)

- [ ] Add `updateInPlace()` method
- [ ] Add `updateMetadata()` method
- [ ] Extend `CacheMetadata` interface with new fields
- [ ] Use for domain registration flow

### Phase 3: Batch Operations (Priority 2)

- [ ] Add `batchMarkAsProcessing()` method
- [ ] Add `batchRemove()` method
- [ ] Implement multi-select delete UI
- [ ] Add bulk operations for DNS records

### Phase 4: Utility Methods (Priority 3)

- [ ] Add `getOne()` method
- [ ] Add `isProcessing()` method
- [ ] Add `getByStatus()` method
- [ ] Add `cancelOperation()` method

### Phase 5: Advanced Features (Future)

- [ ] Automatic retry mechanism
- [ ] Progress tracking system
- [ ] WebSocket integration for real-time updates
- [ ] Undo/redo functionality

---

## Testing Recommendations

### Unit Tests

```typescript
describe('ResourceCache', () => {
  describe('updateInPlace', () => {
    it('should update resource data while preserving _meta', async () => {
      // Test implementation
    });
  });

  describe('batchMarkAsProcessing', () => {
    it('should mark multiple resources as deleting', async () => {
      // Test implementation
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata without changing resource data', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

```typescript
describe('Delete Flow with Cache', () => {
  it('should handle delayed API deletion', async () => {
    // 1. Mark as deleting
    // 2. API returns 200 but data still in list
    // 3. Merge preserves "deleting" status
    // 4. UI hides the resource
    // 5. After 5s, data disappears from API
    // 6. Next merge cleans up cache
  });
});
```

---

## Notes

- **Keep it simple:** Implement features as needed, don't over-engineer
- **Backward compatible:** New methods don't break existing code
- **Type-safe:** All methods maintain full TypeScript support
- **Testable:** Pure functions, easy to unit test
- **Performance:** Methods are optimized for list operations
- **Extensible:** Easy to add new metadata fields or operations

---

## Questions or Suggestions?

This is a living document. Update it as the cache system evolves and new use cases emerge.

**Last Updated:** 2025-01-19
**Version:** 1.0 (Current Implementation)
**Next Version:** 1.1 (Add Priority 1 methods)
