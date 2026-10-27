# Project Brief

## Name and description

**Datum Cloud Portal** (`datum-cloud/cloud-portal`) is the web console for Datum Cloud. It is a full-stack React Router app, server-rendered by a Hono server on Bun, that lets users manage organizations, projects and the cloud resources inside them: DNS zones and records, domains, HTTP proxies / edge (ALB) configuration, networks, connectors, secrets, service accounts, IAM, quotas, usage and billing.

The portal talks to the Datum control plane (Milo, a Kubernetes-style API) through generated OpenAPI clients and GraphQL, and keeps the UI live through the Kubernetes Watch API streamed over SSE.

## Primary goals

- Give Datum Cloud customers one place to create, configure and observe their resources without using the CLI or raw Kubernetes APIs.
- Reflect control-plane state in real time (watch, not polling) and show resource status clearly.
- Enforce platform rules in the UI before the API does: RBAC permissions, quota headroom, and read-only mode for suspended projects (see `docs/guides/gating-write-actions.md`).
- Stay type-safe end to end: generated API clients, Zod schemas as the source of runtime and static types.
- Be observable in production (Sentry, OpenTelemetry, Prometheus, structured logging).
- Let platform services contribute their own UI through the portal plugin system (`PortalPlugin` resources, Module Federation).

## Scope

In scope for this codebase:

- `app/` — the React Router application: routes, features, shared components, domain resource modules, infrastructure modules, and the Hono server (`app/server/`).
- `observability/` — OTEL and Sentry bootstrapping for dev and prod start.
- `cypress/` and `*.test.ts` — Cypress E2E/component tests and Bun unit tests.
- `config/` — Kustomize base, components and service-catalog manifests used to deploy the portal.
- `devenv/`, `Taskfile.yml`, `examples/sample-plugin/` — local plugin-registry dev environment and a sample plugin.
- `scripts/` — OpenAPI and GraphQL client generation, asset precompression, Lighthouse.
- `docs/` — developer docs, ADRs and enhancement design records.

Out of scope:

- The control-plane APIs and controllers themselves (Milo and the service apiservers) — the portal only consumes them.
- The shared design system `@datum-cloud/datum-ui`, `@datum-cloud/activity-ui` and `@datum-cloud/portal-plugin-sdk`, which are published from other repos.
- Infrastructure that deploys the portal beyond the Kustomize bundles published from here (FluxCD lives in the infra repo).
