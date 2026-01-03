# ADR-002: Domain-Driven Resource Modules

**Status:** Accepted
**Date:** 2026-01-03

---

## Context

The codebase had a scattered organization for managing resources:

1. **Interfaces** - 16 files in `app/resources/interfaces/`
2. **Schemas** - 15 files in `app/resources/schemas/`
3. **Control plane** - 17 files in `app/resources/control-plane/`
4. **BFF routes** - 40+ files in `app/routes/api/`

This separation made it difficult to understand how a single resource (e.g., Organization) was handled across the stack. Developers had to navigate 4+ directories to understand or modify a resource.

Additionally:
- Type definitions and validation schemas were duplicated
- Business logic was scattered between BFF routes and control-plane files
- No consistent pattern for data fetching (useFetcher, manual fetch, etc.)

## Decision

Adopt a domain-driven module structure where each resource lives in a single folder with a consistent set of files.

### Technical Details

**New structure per resource:**

```
app/resources/{resource-name}/
├── {resource}.schema.ts     # Zod schema + inferred types
├── {resource}.adapter.ts    # API response → Domain model
├── {resource}.service.ts    # Business logic, API calls
├── {resource}.queries.ts    # React Query hooks (useQuery, useMutation)
├── {resource}.watch.ts      # K8s Watch hook (optional)
└── index.ts                 # Public exports
```

**17 domain modules created:**

| Category | Resources |
|----------|-----------|
| Core | organizations, projects, users, members, groups, roles, invitations, policy-bindings |
| Edge | dns-zones, dns-records, dns-zone-discoveries, domains, secrets, http-proxies |
| Other | export-policies, access-review, allowance-buckets |

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Files per resource | 4+ (scattered) | 5-6 (co-located) |
| Type definitions | Interface files | Zod inferred types |
| Validation | Separate schemas | Same as types (Zod) |
| API calls | BFF routes | Service layer |
| Data fetching | useFetcher | React Query hooks |
| Understanding a resource | 4 directories | 1 folder |

## Rationale

The domain-driven approach was chosen because:

1. **Co-location** - All resource files in one folder
2. **Single source of truth** - Zod schema is both type and validation
3. **Consistent patterns** - Same file structure for every resource
4. **Better DX** - Easy to find, understand, and modify
5. **React Query integration** - Built-in caching, optimistic updates

## Alternatives Considered

### Option A: Keep Scattered Structure

- **Pros:** No migration effort
- **Cons:** Continues to be confusing, hard to maintain
- **Why rejected:** Growing complexity was unsustainable

### Option B: Feature-Based Organization

- **Pros:** Groups by feature (e.g., DNS management)
- **Cons:** Resources used across features get duplicated
- **Why rejected:** Resources are the atomic unit, not features

### Option C: Layer-Based Organization

- **Pros:** Clear separation of concerns (types, services, hooks)
- **Cons:** Still requires jumping between folders
- **Why rejected:** This was the existing structure causing problems

## Consequences

### Positive

- Single folder to understand any resource
- Types inferred from Zod (no duplication)
- Consistent patterns across all resources
- Easy to add new resources (copy a template)
- React Query provides caching, loading states, error handling

### Negative

- Learning curve for Zod + React Query patterns
- Initial migration effort (17 resources)
- More files per resource (5-6 vs 1-2 in old structure)

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Team unfamiliarity with pattern | Clear examples, consistent naming |
| Migration bugs | Gradual migration, one resource at a time |
| Zod learning curve | Similar to other validation libraries |

## References

- [ADR-001: Express to Hono Migration](./001-express-to-hono-migration.md) - Enabled removal of BFF routes
- [ADR-003: K8s Watch API](./003-k8s-watch-api-integration.md) - Adds .watch.ts to modules
