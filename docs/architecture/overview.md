# Architecture Overview

The Datum Cloud Portal is a modern, full-stack web application for managing cloud infrastructure resources.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Bun 1.2.17 | JavaScript runtime & package manager |
| **Server** | Hono | Lightweight web framework (replaced Express) |
| **Frontend** | React 19 + React Router v7 | UI framework with SSR |
| **State** | TanStack Query | Server state management & caching |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Utility-first CSS + component library |
| **Validation** | Zod | Runtime type validation |
| **API Client** | @hey-api/openapi-ts | Generated TypeScript clients |
| **Testing** | Cypress | E2E and component testing |
| **Observability** | Sentry + OpenTelemetry | Error tracking & tracing |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           BROWSER                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ React Query  │◄──►│   Loaders    │◄──►│  UI Components   │   │
│  │    Cache     │    │  (SSR data)  │    │                  │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│         ▲                                         ▲              │
│         │ Real-time updates                       │              │
│  ┌──────┴───────┐                                 │              │
│  │ Watch Manager│─────────────────────────────────┘              │
│  │  (K8s SSE)   │                                                │
│  └──────────────┘                                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HONO SERVER (Bun)                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Middleware  │───►│   Services   │───►│  @hey-api client │   │
│  │ auth/logger  │    │ (resources/) │    │   (generated)    │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Control Plane     │
                    │    (Kubernetes)      │
                    └──────────────────────┘
```

---

## Design Principles

### 1. Co-location Over Separation

All code related to a resource lives in one folder:

```
app/resources/organizations/
├── organization.schema.ts    # Types
├── organization.adapter.ts   # Transformers
├── organization.service.ts   # API calls
├── organization.queries.ts   # React Query hooks
└── index.ts                  # Exports
```

### 2. Type Safety Everywhere

- Zod schemas define both runtime validation AND TypeScript types
- API clients are generated from OpenAPI specs
- No `any` types allowed

### 3. Real-time by Default

- K8s Watch API provides instant updates
- No polling (eliminated 5-10s delays)
- Optimistic updates for mutations

### 4. Fail-fast Configuration

- Environment variables validated at startup with Zod
- Missing config = immediate error, not runtime crash
- Clear separation: `env.public.*` vs `env.server.*`

### 5. Observable by Design

- Structured logging with request correlation
- Distributed tracing via OpenTelemetry
- Error tracking via Sentry
- Metrics via Prometheus

---

## Key Architectural Decisions

All major decisions are documented in Architecture Decision Records (ADRs):

| ADR | Decision | Impact |
|-----|----------|--------|
| [001](./adrs/001-express-to-hono-migration.md) | Express → Hono | ~300KB bundle reduction, native Bun support |
| [002](./adrs/002-domain-driven-resource-modules.md) | Domain modules | Co-located code, consistent patterns |
| [003](./adrs/003-k8s-watch-api-integration.md) | K8s Watch API | Real-time updates, no polling |
| [004](./adrs/004-structured-logger-module.md) | Structured logging | Request correlation, CURL generation |
| [005](./adrs/005-unified-environment-config.md) | Unified env config | Type-safe, fail-fast configuration |
| [006](./adrs/006-sentry-otel-observability.md) | Sentry + OTEL | Unified observability stack |
| [007](./adrs/007-dns-record-manager.md) | DNS Record Manager | Centralized DNS operations |

---

## Component Hierarchy

```
┌────────────────────────────────────────────────────────────────┐
│                       features/                                 │
│   Feature-specific components (only used within that feature)   │
└────────────────────────────────┬───────────────────────────────┘
                                 │ uses
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                       components/                               │
│   Core shared components (used across all parts of the app)     │
└────────────────────────────────┬───────────────────────────────┘
                                 │ uses
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                        datum-ui                                 │
│   Datum's component library (shared across all portals)         │
│   Future: separate npm package                                  │
└────────────────────────────────┬───────────────────────────────┘
                                 │ built on
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                        shadcn/ui                                │
│   UI primitives (Radix + Tailwind)                              │
└────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Data Flow](./data-flow.md) - Request lifecycle details
- [Domain Modules](./domain-modules.md) - Resource module patterns
- [Watch API](./watch-api.md) - Real-time integration
- [ADRs](./adrs/) - All architectural decisions
