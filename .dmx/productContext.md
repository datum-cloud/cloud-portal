# Product Context

## Why this exists

Datum Cloud exposes its platform as Kubernetes-style resources on a multi-tenant control plane. That is powerful but not approachable for most users. The portal turns those resources into a guided web experience: users sign in, pick an organization and project, and manage resources through forms, tables and status views instead of YAML and `kubectl`.

## How it works

- **Sign-in and session.** OIDC via `remix-auth` / `remix-auth-oauth2`; the Hono server holds the session and proxies API calls to the control plane with the user's token (`docs/development/authentication.md`).
- **Navigation hierarchy.** Account → organization (`app/routes/org`) → project (`app/routes/project`). Organizations own members, invitations, groups, roles, billing and quotas; projects own the infrastructure resources.
- **Resource management.** Each resource type (DNS zones, domains, HTTP proxies, networks, connectors, secrets, service accounts, export policies, etc.) has list, detail and create/edit flows. Mutations go through the control-plane API; the watch stream updates the cache when the resource's status changes.
- **Real-time status.** The Watch API (`app/modules/watch`, `app/server/watch`) streams ADDED/MODIFIED/DELETED events over SSE into the React Query cache.
- **Gating.** Write actions are gated on RBAC (`app/modules/rbac`), quota headroom (`app/modules/quota`) and project suspension / read-only mode.
- **Billing and usage.** Stripe-backed billing accounts, payment methods and invoices; usage and metrics views backed by Prometheus/usage queries.
- **Activity and insights.** Activity timelines via `@datum-cloud/activity-ui`; notes, notifications and search across resources.
- **Assistant.** An AI assistant built on the Vercel AI SDK with the Anthropic provider, registered as a platform service (`config/services/*assistant*`).
- **Plugins.** Platform services can ship UI as `PortalPlugin` resources loaded at runtime through Module Federation and a same-origin proxy (`docs/enhancements/portal-plugin-system.md`).

## Who uses it

- **Datum Cloud customers** — developers and operators managing their organizations, projects, DNS, edge and networking resources.
- **Organization admins** — managing members, roles, billing and quotas.
- **Datum platform teams** — contributing service UIs through the plugin system and relying on the portal to surface their resources' status.
- **Datum support and internal staff** — using the portal to see what customers see.
