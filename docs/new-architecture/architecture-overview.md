# Architecture Overview: Hono + React Query Refactor

## 1. Executive Summary

This refactor transforms the cloud-portal from an Express-based BFF (Backend-for-Frontend) architecture to a modern Hono server with React Query for client-side state management. The result is a faster, leaner, and more maintainable codebase with real-time updates via K8s Watch API.

**Key Outcomes:**

- 40+ BFF routes eliminated, replaced by direct service calls
- Real-time updates replace 5-10s polling intervals
- ~300KB reduction in bundle size (Express → Hono)
- Unified domain-driven module structure

---

## 2. Background & Motivation

### Pain Points (Before)

| Issue                       | Impact                                            |
| --------------------------- | ------------------------------------------------- |
| BFF route proliferation     | 40+ routes to maintain, duplicated logic          |
| Polling-based updates       | High server load, 5-10s data staleness            |
| Scattered code organization | Interfaces, schemas, controls in separate folders |
| Express overhead            | Large bundle, not optimized for Bun runtime       |
| Manual error handling       | Inconsistent patterns across routes               |
| No request correlation      | Difficult to trace requests across systems        |

### Goals

1. **Simplify data layer** - One pattern for all resources
2. **Real-time updates** - Instant UI updates via K8s Watch
3. **Reduce bundle size** - Leverage Hono's lightweight design
4. **Improve DX** - Consistent patterns, better debugging
5. **Better observability** - Request correlation across OTEL, Sentry, logs

---

## 3. Architecture Comparison

### 3.1 Before (Express + BFF)

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ useFetcher  │───▶│ BFF Routes   │───▶│ UI Components  │  │
│  │ (polling)   │    │ /api/xyz     │    │                │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP (internal hop)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ routes/api/  │───▶│ control-plane│───▶│ @hey-api     │   │
│  │ (40+ files)  │    │ (17 files)   │    │ client-axios │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Control Plane   │
                    │  (Kubernetes)    │
                    └──────────────────┘
```

**File Structure (Before):**

```
app/
├── resources/
│   ├── interfaces/      # 16 type definition files
│   ├── schemas/         # 15 Zod schema files
│   └── control-plane/   # 17 API control files
├── routes/api/          # 40+ BFF route files
├── hooks/
│   ├── useDatumFetcher.ts
│   ├── useRevalidation.ts    # 363 lines polling logic
│   └── useNotificationPolling.ts
└── server.ts            # 373 lines Express server
```

### 3.2 After (Hono + React Query)

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ React Query │◀──▶│ Service Hooks│◀──▶│ UI Components  │  │
│  │   Cache     │    │ (useQuery)   │    │                │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
│         ▲                                       ▲           │
│         │ K8s Watch                             │           │
│  ┌──────┴──────┐                                │           │
│  │ WatchManager│────────────────────────────────┘           │
│  │ (real-time) │                                            │
│  └─────────────┘                                            │
└─────────────────────────────┬───────────────────────────────┘
                              │ /api/proxy (passthrough)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    HONO SERVER (Bun)                         │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │ React Router │───▶│   Services   │                       │
│  │   Loaders    │    │ (direct API) │                       │
│  └──────────────┘    └──────────────┘                       │
│                             │                                │
│                             ▼                                │
│                    ┌──────────────────┐                     │
│                    │ @hey-api/client  │                     │
│                    └────────┬─────────┘                     │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Control Plane   │
                    │  (Kubernetes)    │
                    └──────────────────┘
```

**File Structure (After):**

```
app/
├── resources/
│   ├── base/                 # Shared schemas and types
│   ├── organizations/        # Domain module
│   │   ├── organization.schema.ts
│   │   ├── organization.adapter.ts
│   │   ├── organization.service.ts
│   │   ├── organization.queries.ts
│   │   └── index.ts
│   ├── projects/             # Domain module
│   ├── dns-zones/            # Domain module
│   └── ... (14 more)
├── modules/
│   ├── watch/                # K8s Watch infrastructure
│   └── logger/               # Structured logging
├── server/
│   ├── entry.ts              # Hono server
│   ├── middleware/           # Auth, logger, error-handler
│   └── routes/               # 10 API routes (external only)
└── utils/env/                # Unified env config
```

### 3.3 Side-by-Side Summary

| Aspect            | Before                        | After                                  |
| ----------------- | ----------------------------- | -------------------------------------- |
| Server            | Express 5.1.0                 | Hono                                   |
| Runtime           | Bun + Express adapter         | Bun native                             |
| Data fetching     | BFF routes + useFetcher       | React Query + services                 |
| Real-time         | Polling (5-10s)               | K8s Watch API (instant)                |
| Code organization | Scattered (3 folders)         | Domain modules (1 folder per resource) |
| BFF routes        | 40+ files                     | 0 (deleted)                            |
| API routes        | N/A                           | 10 (external services only)            |
| Type definitions  | Interfaces + schemas separate | Zod schemas (types inferred)           |
| Error handling    | Manual, inconsistent          | Unified AppError + error-handler       |
| Logging           | console.log + morgan          | Structured logger + CURL               |
| Env config        | process.env everywhere        | env.public._ / env.server._            |

---

## 4. Major Changes Overview

| Change             | Description                                                        | ADR                                                    |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------ |
| **Hono Migration** | Replace Express with Hono for native Bun support                   | [ADR-001](./adr/001-express-to-hono-migration.md)      |
| **Domain Modules** | Unified per-resource structure (schema, adapter, service, queries) | [ADR-002](./adr/002-domain-driven-resource-modules.md) |
| **Watch API**      | Real-time updates via K8s Watch, replacing polling                 | [ADR-003](./adr/003-k8s-watch-api-integration.md)      |
| **Logger Module**  | Structured logging with CURL generation, Sentry integration        | [ADR-004](./adr/004-structured-logger-module.md)       |
| **Env Config**     | Namespaced environment variables with Zod validation               | [ADR-005](./adr/005-unified-environment-config.md)     |
| **Observability**  | OTEL trace correlation in Sentry events                            | [ADR-006](./adr/006-sentry-otel-observability.md)      |
| **DNS Manager**    | Centralized RecordSet operations, typed errors                     | [ADR-007](./adr/007-dns-record-manager.md)             |

### Dependency Changes

**Removed:**

- `express` (~200KB)
- `@react-router/express` (~50KB)
- `express-rate-limit` (~15KB)
- `express-prom-bundle` (~20KB)
- `unstorage` (~30KB)

**Added:**

- `hono` (~14KB)
- `react-router-hono-server` (~5KB)

**Net reduction:** ~300KB+

---

## 5. Impact

### Codebase Statistics

| Metric        | Value   |
| ------------- | ------- |
| Files changed | 514     |
| Lines added   | +31,413 |
| Lines removed | -14,449 |
| Net change    | +16,964 |

### Deleted (Legacy)

| Category                   | Count     | Lines  |
| -------------------------- | --------- | ------ |
| BFF routes (`routes/api/`) | 40+ files | ~3,000 |
| Legacy hooks               | 3 files   | ~500   |
| Control-plane files        | 17 files  | ~1,500 |
| Interface files            | 16 files  | ~800   |
| Schema files (old)         | 15 files  | ~600   |
| Express server             | 1 file    | 373    |

### Created (New)

| Category       | Count    | Purpose                                          |
| -------------- | -------- | ------------------------------------------------ |
| Domain modules | 17       | Unified resource management                      |
| Hono server    | 1        | Lightweight server                               |
| Middleware     | 6        | Auth, logger, error, rate-limit, sentry, context |
| API routes     | 10       | External service proxies                         |
| Watch module   | 6 files  | Real-time updates                                |
| Logger module  | 10 files | Structured logging                               |

### Real-Time Improvements

| Metric                 | Before       | After               |
| ---------------------- | ------------ | ------------------- |
| Update latency         | 5-10 seconds | Instant             |
| Requests/min (polling) | 6-12         | 0                   |
| Connection type        | HTTP polling | EventSource (Watch) |

---

## 6. Migration Notes

### Breaking Changes

None - all changes are internal architecture. External API contracts remain unchanged.

### Backward Compatibility

- All existing routes continue to work
- No changes to authentication flow
- No changes to user-facing features

### Developer Notes

1. **New resource?** Create a domain module in `app/resources/{name}/`
2. **Need real-time?** Add a `.watch.ts` file to the domain module
3. **API debugging?** Check terminal for auto-generated CURL commands
4. **Env variable?** Add to `app/utils/env/` with Zod validation

---

## 7. References

- [Test Guide](./test-guide.md) - Quickstart and verification
- [ADRs](./adr/) - Detailed decision records
