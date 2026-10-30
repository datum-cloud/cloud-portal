---
ticket: gh-1728
branch: feature-gh-1728-send-portal-metric-queries-to-queryapi
summary: Send portal metric queries to queryapi
ticketing: github-issues
---

# Send portal metric queries to queryapi

**Ticket:** [#1728](https://github.com/datum-cloud/cloud-portal/issues/1728)
**Type:** feature
**Branch:** feature-gh-1728-send-portal-metric-queries-to-queryapi

---

## Context

Metric requests go from the browser to `/api/prometheus`, and the server forwards them as GETs to `PROMETHEUS_URL` (VictoriaMetrics) with the user's token. Project scoping depends on the browser writing a project label matcher into every query. queryapi serves the same Prometheus routes with project isolation enforced on the server, and the portal already reads logs through it (`app/resources/o11y-logs/o11y-log.service.ts`). Part of epic [#1727](https://github.com/datum-cloud/cloud-portal/issues/1727).

## Scope

- The browser reads `chart`, `card` and `labels` data from queryapi at `getProjectScopedBase(projectId)` + `/apis/o11y.miloapis.com/v1alpha1/metrics/api/v1/...`, through `/api/proxy`, the same way logs do.
- `query` and `query_range` go as form-encoded POSTs.
- Delete the `/api/prometheus` server route (`app/server/routes/prometheus.ts` and its registration in `app/server/routes/api.ts`). This differs from the issue, which keeps the route; decided in Q&A.
- The metrics hooks take a required `projectId`. Every caller passes it. Callers found so far (more than the issue lists):
  - `app/features/edge/proxy/metrics/*`: proxy and connector sparklines, WAF events, WAF top rules, WAF filters, regions filter
  - `app/features/edge/proxy/overview/*`: live traffic card, active PoPs card, sparkline stat card, `use-alb-traffic-presence`
  - `app/features/edge/proxy/backends/pool-stats.tsx`
  - `app/features/metric/export-policies/card/activity-card.tsx`
  - the shared `app/modules/metrics` components and hooks (`metric-chart`, `metric-card`, `filters/regions-filter`, `usePrometheusLabels`)
- The UI shows clear messages for queryapi's 422 (response too large) and 503 (timeout).
- A user without metrics permissions sees the existing "no permission" state.
- The project editor and owner roles grant `o11y.miloapis.com/metrics.query`, `metrics.getLabels`, `metrics/v1.get` and `metrics/v1.create` (check whether this is already done).
- Tests for the new `o11y-metrics` service and the request path in the hook. These replace the issue's "route and client have tests" item, since the route is deleted.
- Remove `PROMETHEUS_URL` from `app/utils/env/env.server.ts`, `app/utils/env/types.ts`, `.env.example` and `config/base/deployment.yaml`.
- Responses keep the Prometheus envelope, so `formatter.ts`, the charts and the existing queries stay as they are.

## Out of Scope

- Local development against stock Prometheus: [#1729](https://github.com/datum-cloud/cloud-portal/issues/1729).
- Removing the `buildinfo`/`connection` request types, `axios-curl.ts`, the unused query-builder exports, `getPrometheusService()` and `/test/metrics`: [#1730](https://github.com/datum-cloud/cloud-portal/issues/1730).
- Closing the network path to VictoriaMetrics: infra#7922.
- Changes to the compute plugin repo. Its `/api/prometheus` calls stop working when the route is deleted. The plugin's move to queryapi is merged in datum-cloud/compute#568; compute must be released to production before or with the cloud-portal release that includes this ticket.

## Technical Approach

Reuse the logs path:

- **Service.** Add `app/resources/o11y-metrics/` following ADR-002 and `o11y-log.service.ts`: `createO11yMetricsService({ client? })` on the shared control-plane client, using `getProjectScopedBase(projectId)` as `baseURL`. It provides `queryRange` and `query` as form-encoded POSTs and `labelValues` as a GET, and returns the raw Prometheus envelope. The client is injectable for tests, as in the logs service.
- **Transport.** In the browser the base resolves to `/api/proxy/...`. `app/server/routes/proxy.ts` adds the session token, passes the raw body and `Content-Type` through unchanged, and already refreshes the token and retries. The metrics path needs no token handling of its own.
- **Hook.** `makePrometheusAPIRequest` in `app/modules/metrics/hooks/usePrometheusApi.ts` calls the service in place of `fetch('/api/prometheus')`, then runs the existing `formatForChart` / `formatForCard` in the browser. `formatter.ts` is pure and has no server imports. Query building, query keys and the charts stay as they are.
- **Errors.** Map 403 to the existing "no permission" state. Map 422 and 503 from queryapi to clear `PrometheusError` messages, which the charts and cards already render.
- **Config.** Remove `PROMETHEUS_URL` now. With the route gone it has no reader.

## Q&A decisions

1. **How the server calls queryapi:** it doesn't. The browser calls queryapi through `/api/proxy` with the shared control-plane client, as the logs service does.
2. **Token refresh-and-retry:** comes from `/api/proxy`. No new work.
3. **`/api/prometheus`:** delete it. The compute plugin is its only remaining caller and has to migrate.
4. **`PROMETHEUS_URL`:** remove it in this ticket. Local metrics stop working until #1729 lands, whether or not the variable stays, because nothing reads it once the route is gone.

---

## Questions
<!-- Answer each question below before running /dmx/plan. -->

1. Deleting the route leaves `PrometheusService`, `client.ts`, `getPrometheusService()` and the `buildinfo`/`connection` types with no callers. Should this ticket delete them, or leave them for #1730?
   Answer: Leave them for #1730. This ticket deletes only the route and its registration.
