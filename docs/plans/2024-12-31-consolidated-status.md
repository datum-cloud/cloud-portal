# Consolidated Phase Status - Data-Driven Architecture Refactor

**Last Updated:** 2024-12-31

---

## Executive Summary

| Phase | Description                                               | Status             | Plan Document                            |
| ----- | --------------------------------------------------------- | ------------------ | ---------------------------------------- |
| 1     | Foundation (errors, logger, base utilities)               | ✅ **COMPLETE**    | `data-driven-refactor-implementation.md` |
| 2     | Organization Resource (schema, adapter, service, queries) | ✅ **COMPLETE**    | `data-driven-refactor-implementation.md` |
| 3     | Service Provider & React Query Setup                      | ✅ **COMPLETE**    | `data-driven-refactor-implementation.md` |
| 4     | Hono Server with Middleware                               | ✅ **COMPLETE**    | `data-driven-refactor-implementation.md` |
| 5     | Route Migration to Service Layer                          | ✅ **COMPLETE**    | `data-driven-refactor-implementation.md` |
| 6     | Expand to All Domains                                     | ✅ **COMPLETE**    | `phase6-domain-migration.md`             |
| 7     | BFF Migration to Hono + React Query Mutations             | ⏳ **NOT STARTED** | `phase7-bff-migration.md`                |

---

## Completed Work

### Phase 1: Foundation ✅

- Error system (AppError, ValidationError, etc.)
- Logger module with CURL generation
- Base resource utilities (types, schemas)

### Phase 2: Organization Resource ✅

- Zod v4 schema with validation
- API ↔ Domain adapter
- Service layer with direct API calls
- React Query hooks (queries + mutations)

### Phase 3: Service Provider ✅

- ServiceContext provider for React components
- useServiceContext hook

### Phase 4: Hono Server ✅

- Server entry with middleware chain
- Auth middleware
- Logger middleware
- Error handler
- Rate limiter
- Sentry tracing
- CSP nonce generation
- Health/readiness endpoints

### Phase 5: Route Migration ✅

- All routes use new service layer
- Loaders use `createXxxService(ctx)` pattern
- Context includes `requestId`, `controlPlaneClient`, `userScopedClient`

### Phase 6: Domain Expansion ✅

**New Domain Modules Created:**

- `app/resources/access-review/`
- `app/resources/allowance-buckets/`
- `app/resources/dns-records/`
- `app/resources/dns-zone-discoveries/`
- `app/resources/dns-zones/`
- `app/resources/domains/`
- `app/resources/export-policies/`
- `app/resources/groups/`
- `app/resources/http-proxies/`
- `app/resources/invitations/`
- `app/resources/members/`
- `app/resources/organizations/`
- `app/resources/policy-bindings/`
- `app/resources/projects/`
- `app/resources/roles/`
- `app/resources/secrets/`
- `app/resources/users/`

**Legacy Directories Deleted:**

- `app/resources/interfaces/` (16 files)
- `app/resources/schemas/` (15 files)
- `app/resources/control-plane/` (17 files)

---

## Remaining Work

### Phase 7: BFF Migration to Hono + React Query Mutations ⏳

**Goal:** Remove all 40 BFF API routes, replace with:

1. Hono routes for external services (Prometheus, CloudValid, Grafana, Notifications)
2. React Query mutations for all CRUD operations
3. Remove inline actions from page routes
4. Delete useDatumFetcher hook

**Sub-Phases:**
| Sub-Phase | Description | Tasks |
|-----------|-------------|-------|
| 7A | Hono API Routes (external services) | 7 tasks |
| 7B | Add mutations.ts to all resources | 14 tasks |
| 7C | Migrate components from useDatumFetcher | 13 tasks |
| 7D | Remove inline actions from page routes | 11 tasks |
| 7E | Delete BFF routes + Express cleanup | 7 tasks |

**Total Remaining:** 52 tasks

---

## Architecture After Phase 7

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  Page Routes (SSR only)      │  Components (CSR)                │
│  ┌─────────────────────┐     │  ┌─────────────────────────┐     │
│  │ loader() {          │     │  │ const mutation =        │     │
│  │   service.list()    │     │  │   useCreateProject();   │     │
│  │ }                   │     │  │                         │     │
│  │ // NO action export │     │  │ mutation.mutate(data);  │     │
│  └─────────────────────┘     │  └─────────────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│                      RESOURCE MODULES                            │
│  app/resources/{resource}/                                       │
│  ├── schema.ts      (Zod validation)                            │
│  ├── adapter.ts     (API ↔ Domain transform)                    │
│  ├── service.ts     (Business logic, direct API calls)          │
│  ├── queries.ts     (useQuery + useMutation hooks)              │
│  └── index.ts       (barrel export)                             │
├─────────────────────────────────────────────────────────────────┤
│                      HONO SERVER                                 │
│  app/server/                                                     │
│  ├── entry.ts           (main server + middleware)              │
│  ├── routes/            (external service proxies only)         │
│  │   ├── prometheus.ts                                          │
│  │   ├── cloudvalid.ts                                          │
│  │   ├── grafana.ts                                             │
│  │   ├── preferences.ts                                         │
│  │   └── notifications.ts                                       │
│  └── middleware/        (auth, logger, error-handler, etc.)     │
├─────────────────────────────────────────────────────────────────┤
│                      DELETED                                     │
│  ❌ app/routes/api/*    (40 files)                              │
│  ❌ useDatumFetcher     (replaced by mutations)                 │
│  ❌ inline actions      (replaced by mutations)                 │
│  ❌ server.ts           (old Express server)                    │
│  ❌ express packages    (express, @react-router/express, etc.)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Execute Phase 7

**Plan Document:** `docs/plans/2024-12-31-phase7-bff-migration.md`

**Execution Options:**

1. Subagent-Driven (same session) - dispatch per task
2. Parallel Session (separate) - use executing-plans skill

---

## Notes

- All phases build on each other - no conflicts
- Phase 7 is independent and can be executed immediately
- Resource modules with `queries.ts` already have mutations (organizations, projects, dns-zones)
- Resources without mutations need them added in Phase 7B
