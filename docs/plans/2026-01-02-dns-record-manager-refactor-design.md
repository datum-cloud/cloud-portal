# DNS Record Manager Refactor Design

**Date:** 2026-01-02
**Status:** Approved
**Goal:** Eliminate code complexity in DNS records logic by introducing a unified DnsRecordManager that encapsulates RecordSet abstraction and consolidates single/bulk operation flows.

---

## Problem Statement

The current DNS records implementation has significant code complexity issues:

1. **Duplicate logic between single and bulk flows** - Create/update/delete logic is duplicated across `useCreateDnsRecord`, `useUpdateDnsRecord`, `useDeleteDnsRecord`, and `useBulkImportDnsRecords`
2. **RecordSet abstraction leakage** - The UI thinks in "records" but hooks must understand "RecordSets", causing awkward find/check/append patterns
3. **Scattered business logic** - RecordSet resolution, duplicate detection, and merge logic spread across multiple hooks
4. **Inconsistent error handling** - Different error scenarios handled differently across single vs bulk operations
5. **Hard to extend** - Adding new operations requires duplicating patterns across multiple hooks

---

## Solution: Unified Record Manager Pattern

### Architecture Overview

Introduce a **DnsRecordManager** class that becomes the single source of truth for all DNS record operations. The manager completely encapsulates the RecordSet concept - callers only think about individual records.

**Before:**

```typescript
// Hooks had to know about RecordSets
const existingRecordSet = await service.findByTypeAndZone(projectId, zoneId, type);
if (existingRecordSet) {
  const updated = [...existingRecordSet.records, newRecord];
  await service.update(projectId, existingRecordSet.name, { records: updated });
} else {
  await service.create(projectId, {
    dnsZoneRef: { name: zoneId },
    recordType: type,
    records: [newRecord],
  });
}
```

**After:**

```typescript
// Manager handles RecordSet internally
await recordManager.addRecord(projectId, zoneId, record);
```

### Manager API Surface

```typescript
class DnsRecordManager {
  addRecord(projectId, zoneId, record, options?); // Single record add
  updateRecord(projectId, recordSetId, criteria, newRecord, options?); // Single record update
  removeRecord(projectId, criteria); // Single record delete
  bulkImport(projectId, zoneId, records, options?); // Bulk operations
}
```

**Key principle:** The manager uses the same internal flow for single and bulk operations.

---

## Core Components & Internal Design

### DnsRecordManager Internal Structure

```typescript
class DnsRecordManager {
  constructor(
    private service: DnsRecordService, // Existing service for API calls
    private queryClient: QueryClient, // React Query cache
    private logger: Logger
  ) {}

  // INTERNAL HELPERS (private methods)

  private async resolveRecordSet(
    projectId: string,
    zoneId: string,
    recordType: string
  ): Promise<{ exists: boolean; recordSet?: DnsRecordSet }> {
    // Finds existing RecordSet or returns { exists: false }
    const existing = await this.service.findByTypeAndZone(projectId, zoneId, recordType);
    return existing ? { exists: true, recordSet: existing } : { exists: false };
  }

  private checkDuplicates(
    newRecord: any,
    existingRecords: any[],
    recordType: string
  ): { isDuplicate: boolean; reason?: string } {
    // Reuses existing isDuplicateRecord() logic but returns structured result
    const isDuplicate = isDuplicateRecord(newRecord, existingRecords, recordType);
    return { isDuplicate, reason: isDuplicate ? 'Record already exists' : undefined };
  }

  private mergeRecords(
    existing: any[],
    incoming: any[],
    strategy: 'append' | 'replace',
    skipDuplicates: boolean,
    recordType: string
  ): {
    merged: any[];
    details: RecordDetail[];
    counts: { created: number; updated: number; skipped: number };
  } {
    // Centralized merge logic (extracted from current useBulkImportDnsRecords)
    // Returns merged array + details about what happened to each record
  }

  private groupByType(records: IDnsZoneDiscoveryRecordSet[]): Map<string, any[]> {
    // Groups discovery recordSets by record type
  }
}
```

### What Gets Deleted/Consolidated

- ❌ `useCreateDnsRecord` internal logic → Manager handles this
- ❌ `useUpdateDnsRecord` find/replace logic → Manager handles this
- ❌ `useDeleteDnsRecord` find/remove logic → Manager handles this
- ❌ `useBulkImportDnsRecords` grouping/merge logic → Manager handles this
- ❌ `useBulkCreateDnsRecords` hook → Redundant with bulkImport
- ✅ **Keep existing helpers:** `isDuplicateRecord`, `findRecordIndex`, `transformFormToRecord` - Manager calls them

---

## Public API & Data Flow

### addRecord (Single Record Add)

```typescript
async addRecord(
  projectId: string,
  zoneId: string,
  record: CreateDnsRecordSchema,
  options?: { dryRun?: boolean }
): Promise<{ recordSet: DnsRecordSet; action: 'created' | 'appended' }>
```

**Flow:**

1. Transform form data to K8s record format
2. Resolve RecordSet for this type+zone
3. If RecordSet exists:
   - Check for duplicates
   - Append to existing records
   - PATCH RecordSet
4. If RecordSet doesn't exist:
   - Create new RecordSet with single record
   - POST RecordSet

### updateRecord (Single Record Update)

```typescript
async updateRecord(
  projectId: string,
  recordSetId: string,
  criteria: { recordType: string; name: string; oldValue?: string; oldTTL?: number | null },
  newRecord: CreateDnsRecordSchema,
  options?: { dryRun?: boolean }
): Promise<DnsRecordSet>
```

**Flow:**

1. Get existing RecordSet
2. Find record by criteria (name, value, TTL)
3. Transform new form data to K8s format
4. Replace record at index
5. PATCH RecordSet

### removeRecord (Single Record Delete)

```typescript
async removeRecord(
  projectId: string,
  criteria: DeleteDnsRecordInput
): Promise<{ action: 'recordRemoved' | 'recordSetDeleted' }>
```

**Flow:**

1. Get existing RecordSet
2. Find record to delete
3. Remove from array
4. If last record:
   - DELETE entire RecordSet
5. Otherwise:
   - PATCH RecordSet with remaining records

### bulkImport (Bulk Import with Merge Strategies)

```typescript
async bulkImport(
  projectId: string,
  zoneId: string,
  records: IDnsZoneDiscoveryRecordSet[],
  options?: BulkImportOptions
): Promise<ImportResult>
```

**Flow:**

1. Group records by type
2. For each type (sequentially to prevent race conditions):
   - Resolve RecordSet
   - Merge records with duplicate detection
   - Apply merge strategy (append/replace)
   - Create or Update RecordSet
   - Collect per-record results
3. Return aggregated summary + details

**Partial Failure Support:** If one record type fails, processing continues for other types. Failed records are marked in the details array.

---

## Error Handling Strategy

### Structured Error Types

```typescript
class DnsRecordError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DnsRecordError';
  }
}

class DuplicateRecordError extends DnsRecordError {
  constructor(reason: string) {
    super('Duplicate record detected', 'DUPLICATE_RECORD', { reason });
  }
}

class RecordNotFoundError extends DnsRecordError {
  constructor(message: string) {
    super(message, 'RECORD_NOT_FOUND');
  }
}

class RecordSetNotFoundError extends DnsRecordError {
  constructor(recordSetId: string) {
    super(`RecordSet ${recordSetId} not found`, 'RECORDSET_NOT_FOUND', { recordSetId });
  }
}
```

### Error Handling Approach

- **Single operations:** Throw typed errors immediately (hooks can catch and display)
- **Bulk operations:** Collect errors per-record, continue processing other records (partial failure support)
- **Logging:** All errors logged with context (projectId, zoneId, recordType)

---

## React Query Hooks - Before & After

### Hook Simplification

Hooks become thin wrappers around manager methods - all complexity moves to the manager.

**Before:**

```typescript
export function useCreateDnsRecord(projectId: string, dnsZoneId: string, options?: UseMutationOptions<...>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDnsRecordService(ctx);

  return useMutation({
    mutationFn: async (formData: CreateDnsRecordSchema) => {
      const record = transformFormToRecord(formData);
      const existingRecordSet = await service.findByTypeAndZone(projectId, dnsZoneId, formData.recordType);

      if (existingRecordSet) {
        const updatedRecords = [...(existingRecordSet.records || []), record];
        return service.update(projectId, existingRecordSet.name, { records: updatedRecords });
      } else {
        const fullInput: CreateDnsRecordSetInput = {
          dnsZoneRef: { name: dnsZoneId },
          recordType: formData.recordType,
          records: [record],
        };
        return service.create(projectId, fullInput);
      }
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.lists() });
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, newRecord.name), newRecord);
    },
    ...options,
  });
}
```

**After:**

```typescript
export function useCreateDnsRecord(projectId: string, dnsZoneId: string, options?: UseMutationOptions<...>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const manager = createDnsRecordManager(ctx);

  return useMutation({
    mutationFn: (formData: CreateDnsRecordSchema) =>
      manager.addRecord(projectId, dnsZoneId, formData),
    onSuccess: ({ recordSet }) => {
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.lists() });
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSet.name), recordSet);
    },
    ...options,
  });
}
```

### All Hooks Simplified

```typescript
// CREATE
useCreateDnsRecord → manager.addRecord()

// UPDATE
useUpdateDnsRecord → manager.updateRecord()

// DELETE
useDeleteDnsRecord → manager.removeRecord()

// BULK IMPORT
useBulkImportDnsRecords → manager.bulkImport()

// BULK CREATE
useBulkCreateDnsRecords → DELETED (redundant with bulkImport)
```

### Manager Factory

```typescript
// New file: app/resources/dns-records/dns-record.manager.ts
export function createDnsRecordManager(ctx: ServiceContext): DnsRecordManager {
  const service = createDnsRecordService(ctx);
  return new DnsRecordManager(service, queryClient, logger);
}
```

### Cache Strategy

- **Single record ops:** Invalidate lists, update detail cache
- **Bulk ops:** Invalidate all lists (too many records to update individually)
- **Watch hooks:** Continue to work unchanged - they invalidate on K8s events

---

## Migration Strategy & File Changes

### NEW FILES

```
app/resources/dns-records/dns-record.manager.ts
├── DnsRecordManager class (300-400 lines)
├── Error classes (DuplicateRecordError, RecordNotFoundError, etc.)
├── createDnsRecordManager() factory
└── Types: RecordDetail, MergeResult, etc.
```

### MODIFIED FILES

```
app/resources/dns-records/dns-record.queries.ts
├── useCreateDnsRecord - simplified to call manager.addRecord()
├── useUpdateDnsRecord - simplified to call manager.updateRecord()
├── useDeleteDnsRecord - simplified to call manager.removeRecord()
├── useBulkImportDnsRecords - simplified to call manager.bulkImport()
└── DELETE useBulkCreateDnsRecords

app/resources/dns-records/index.ts
├── Export createDnsRecordManager
├── Export DnsRecordManager type
├── Export error classes
└── REMOVE useBulkCreateDnsRecords export
```

### DELETED CODE

```
❌ useBulkCreateDnsRecords hook (dns-record.queries.ts lines 238-264)
❌ Complex logic inside useCreateDnsRecord mutationFn (lines 69-92) → replaced with manager call
❌ Complex logic inside useUpdateDnsRecord mutationFn (lines 121-150) → replaced with manager call
❌ Complex logic inside useDeleteDnsRecord mutationFn (lines 197-225) → replaced with manager call
❌ processRecordsWithDetails function (lines 315-387) → moved into manager.mergeRecords()
❌ groupDiscoveryRecordsByType function (lines 297-310) → moved into manager.groupByType()
```

### KEPT AS-IS (No Changes)

```
✅ app/resources/dns-records/dns-record.service.ts - All service methods unchanged
✅ app/resources/dns-records/dns-record.adapter.ts - All adapters unchanged
✅ app/resources/dns-records/dns-record.schema.ts - All schemas unchanged
✅ app/utils/helpers/dns/* - All helpers unchanged (manager uses them as building blocks)
✅ app/resources/dns-records/dns-record.watch.ts - Watch hooks unchanged
```

### Migration Phases

#### Phase 1: Build Manager (no breaking changes)

1. Create `dns-record.manager.ts` with full implementation
2. Add tests for manager in isolation
3. Export manager from index.ts

#### Phase 2: Migrate Hooks (one by one)

1. Update `useCreateDnsRecord` to use manager
2. Update `useUpdateDnsRecord` to use manager
3. Update `useDeleteDnsRecord` to use manager
4. Update `useBulkImportDnsRecords` to use manager
5. Test each hook migration individually

#### Phase 3: Cleanup

1. Delete `useBulkCreateDnsRecords` hook
2. Remove helper functions from queries.ts (moved to manager)
3. Update any components using `useBulkCreateDnsRecords` to use `useBulkImportDnsRecords`

#### Phase 4: Verify

1. Run typecheck
2. Test DNS record CRUD in UI
3. Test bulk import flow
4. Verify Watch hooks still work

### Risk Mitigation

- Manager built alongside existing code (no breaking changes during development)
- Hooks migrated one at a time (easy to rollback if issues)
- All existing tests continue to pass (hooks have same external API)
- Partial failure support in bulk operations prevents total failure

---

## Benefits

### Complexity Reduction

- **Single source of truth:** All RecordSet orchestration in one place
- **Eliminate duplication:** Single and bulk flows use same internal logic
- **Clear abstraction:** UI layer never touches RecordSet concept

### Maintainability

- **Easier to extend:** New operations added to manager, not duplicated across hooks
- **Consistent error handling:** All errors handled uniformly
- **Better testing:** Manager can be tested in isolation

### Developer Experience

- **Simpler hooks:** React Query hooks are thin wrappers (5-10 lines each)
- **Clear API:** Manager methods are self-documenting
- **Type safety:** Structured errors with proper types

---

## DNS Helpers - No Changes Needed

The DNS helpers in `app/utils/helpers/dns/` are well-structured and don't need changes:

- **Pure, focused functions** - Each helper has a clear purpose
- **Good separation of concerns** - bind-import, bind-export, record-comparison, form-transform, etc.
- **Solid logic** - Duplicate detection, FQDN handling, type-specific comparisons are well thought out

**The helpers are NOT the problem** - the complexity is at the orchestration layer (hooks). The manager solves this by using the helpers as building blocks while providing clean orchestration.

**Minor improvements (nice-to-have, not blockers):**

- Type safety - Replace `any` types with proper types where possible
- Consistency - Better JSDoc comments

These can be addressed separately if needed.

---

## Success Criteria

- ✅ All DNS record CRUD operations work correctly
- ✅ Bulk import handles partial failures gracefully
- ✅ No RecordSet logic in React Query hooks
- ✅ All TypeScript errors resolved
- ✅ Watch hooks continue to work for real-time updates
- ✅ Zero backward compatibility code (clean migration)
- ✅ Reduced lines of code in dns-record.queries.ts by ~40%
