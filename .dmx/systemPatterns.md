# System Patterns

## High-level architecture

A single full-stack application, not a monorepo:

- **Browser** — React 19 UI rendered by React Router (SSR + hydration). TanStack Query holds server state; a watch manager subscribes to Kubernetes watch events over SSE and updates the cache.
- **Server** — Hono running on Bun (`app/server/`), via `react-router-hono-server`. Middleware handles auth/session, logging, rate limiting (Redis-backed), metrics and tracing; server routes proxy the control plane and serve the watch stream.
- **Control plane** — Milo / Kubernetes-style APIs reached through generated OpenAPI clients (`app/modules/control-plane/*`) and GraphQL (`app/modules/graphql`, ADR-008).

Long-lived architectural decisions are recorded as ADRs in `docs/architecture/adrs/` and larger designs as enhancement records in `docs/enhancements/`.

## Key patterns

- **Domain resource modules** (ADR-002): every resource lives in `app/resources/{resource}/` with co-located `*.schema.ts` (Zod types), `*.adapter.ts` (API → domain), `*.service.ts` (API calls), `*.queries.ts` (React Query hooks) and `*.watch.ts` (watch subscriptions), exported through `index.ts`. New resources follow `docs/guides/adding-new-resource.md`.
- **Zod as the type source.** Schemas define both runtime validation and TypeScript types; no `any`.
- **Forms** use Conform + Zod (`docs/ui/forms.md`).
- **Component hierarchy:** `app/features/{feature}/` (feature-only) → `app/components/` (shared, used in 3+ places) → `@datum-cloud/datum-ui` (design system) → shadcn/ui primitives. Follow `docs/ui/shadcn-rules.md` and `docs/ui/datum-ui-guide.md`.
- **Routing:** route modules under `app/routes/`, wired in `app/routes.ts`; layout invariants are tested in `app/routes-layout-invariant.test.ts`.
- **Real-time by default** (ADR-003): watch, don't poll; optimistic updates for mutations.
- **Write gating:** every mutation and write button is gated on RBAC, quota and read-only state (`docs/guides/gating-write-actions.md`).
- **Fail-fast config** (ADR-005): env vars validated with Zod at startup, split into `env.public.*` and `env.server.*`.
- **Observability** (ADR-004, ADR-006): structured logger with request correlation, Sentry + OpenTelemetry tracing, Prometheus metrics.
- **Async operations** (ADR-009): long-running K8s operations go through a task queue with timeout protection.
- **URL state** with `nuqs`.
- **Generated code** in `app/modules/control-plane/*` comes from `bun run openapi` / `bun run graphql`; don't hand-edit it.

## Component relationships

- `app/routes/*` load data and compose `app/features/*` UI.
- `app/features/*` use `app/resources/*` hooks and services, shared `app/components/*`, and infrastructure in `app/modules/*` (rbac, quota, watch, feature-flags, billing, plugins…).
- `app/resources/*` depend on `app/modules/control-plane/*` generated clients and `app/modules/axios` / `app/modules/graphql`.
- `app/server/*` hosts middleware, server routes and the watch proxy; it depends on `app/modules/*` for auth, logging, redis, rate-limit and metrics.
- `observability/` boots OTEL/Sentry before the server starts (`bun run dev` / `bun run start`).
- `config/` deploys the built image; `devenv/` + `Taskfile.yml` provide a local kwok cluster for the plugin registry.
