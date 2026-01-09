# ADR-007: DNS Record Manager

**Status:** Accepted
**Date:** 2026-01-03

---

## Context

DNS record management had several challenges:

1. **RecordSet abstraction** - K8s stores DNS records as RecordSets (grouped by name+type)
2. **Logic scattered in hooks** - Each hook had 50-100 lines of RecordSet manipulation
3. **Duplicate code** - Same RecordSet logic in create, update, delete, bulk import
4. **Generic errors** - No distinction between duplicate records, missing records, etc.

The RecordSet abstraction leaked into every hook, making them complex and hard to maintain:

```typescript
// Before: Each hook had to understand RecordSets
const useCreateDnsRecord = () => {
  // 50+ lines: find existing RecordSet, check duplicates,
  // merge records, update RecordSet, handle errors...
};
```

## Decision

Create a centralized DNS Record Manager class that encapsulates all RecordSet operations and provides typed errors.

### Technical Details

**Manager structure:**

```
app/resources/dns-records/
├── dns-record.manager.ts  # 554 lines - centralized logic
├── dns-record.queries.ts  # Thin hooks (10-15 lines each)
└── ...
```

**Manager API:**

```typescript
class DnsRecordManager {
  addRecord(record: DnsRecordInput): Promise<DnsRecord>;
  updateRecord(id: string, updates: Partial<DnsRecordInput>): Promise<DnsRecord>;
  removeRecord(id: string): Promise<void>;
  bulkImport(records: DnsRecordInput[]): Promise<BulkImportResult>;
}
```

**Typed errors:**

```typescript
class DuplicateRecordError extends Error {}
class RecordNotFoundError extends Error {}
class RecordSetNotFoundError extends Error {}
```

**Simplified hooks:**

```typescript
// After: Hook is just a thin wrapper
const useCreateDnsRecord = () => {
  return useMutation({
    mutationFn: (record) => manager.addRecord(record),
    // 10 lines total
  });
};
```

### Before vs After

| Aspect           | Before                | After                      |
| ---------------- | --------------------- | -------------------------- |
| RecordSet logic  | In every hook         | Centralized in manager     |
| Hook complexity  | 50-100 lines          | 10-15 lines                |
| Error types      | Generic Error         | DuplicateRecordError, etc. |
| Code duplication | High (4 hooks)        | None (single manager)      |
| Testability      | Hard (mixed concerns) | Easy (isolated manager)    |

## Rationale

The manager pattern was chosen because:

1. **Encapsulation** - RecordSet abstraction hidden from hooks
2. **Single source of truth** - All CRUD in one place
3. **Typed errors** - Meaningful error handling in UI
4. **Testability** - Manager can be unit tested
5. **Maintainability** - Changes in one place

## Alternatives Considered

### Option A: Keep Logic in Hooks

- **Pros:** No refactoring needed
- **Cons:** Continued duplication, hard to maintain
- **Why rejected:** RecordSet logic was getting more complex

### Option B: Utility Functions

- **Pros:** Simple, reusable
- **Cons:** No encapsulation, scattered state
- **Why rejected:** Manager provides better organization

### Option C: Service Layer Only

- **Pros:** Consistent with other resources
- **Cons:** RecordSet logic still needs somewhere to live
- **Why rejected:** Manager is more specialized for this domain

## Consequences

### Positive

- 82% code reduction in queries file (270 → 47 lines)
- RecordSet abstraction fully hidden
- Typed errors for better UI feedback
- Partial failure support in bulk operations
- Single place to fix RecordSet bugs

### Negative

- New pattern specific to DNS records
- Learning curve for manager class
- More indirection (hook → manager → service)

### Risks & Mitigations

| Risk                           | Mitigation                        |
| ------------------------------ | --------------------------------- |
| Manager too complex            | Well-documented, private helpers  |
| Different from other resources | Justified by RecordSet complexity |
| Performance                    | Manager is stateless, no overhead |

## References

- [ADR-002: Domain Modules](./002-domain-driven-resource-modules.md) - Manager extends domain module pattern
