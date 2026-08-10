# Portal Upstream Error Alerts — Runbook

Alerting rules for `portal_upstream_responses_total`, the counter the cloud-portal
server increments for **every** upstream request outcome — each HTTP response
(successes and errors) plus connection-level failures — in the shared server-side
axios layer. These alerts are the regression net that replaced
Sentry-as-a-404-counter: expected 4xx statuses (401/403/404/429) no longer produce
Sentry events, so **volume anomalies in this metric are the only signal** that an
expected-error path has silently regressed. Background: issue
[#1378](https://github.com/datum-cloud/cloud-portal/issues/1378) and the design doc at
`docs/superpowers/specs/2026-08-10-sentry-enterprise-error-recording-design.md`
(Section 5).

## Metric contract

`portal_upstream_responses_total{status, api_group, resource_type, method}`

| Label | Example | Notes |
| --- | --- | --- |
| `status` | `"404"` | Upstream HTTP status as a string; `"network"` for connection-level failures (timeout/DNS/refused) where no HTTP response was received |
| `api_group` | `"networking.datumapis.com"` | `"unknown"` when the URL is unparseable |
| `resource_type` | `"httpproxies"` | `"unknown"` when the URL is unparseable |
| `method` | `"GET"` | Uppercase HTTP method |

Resource names and namespaces are deliberately **never** labels (cardinality
control). If you need per-object detail during an incident, use server logs, not
this metric.

## First response (all alerts)

1. **Check Sentry (`cloud-portal-ef`) for correlated real errors.** Expected 4xx
   are dropped by design, so any error-level events appearing alongside an alert
   are real bugs — likely the cause, not a duplicate signal.
2. **Check recent releases.** Compare the alert start time against the latest
   deploys/tags. A 404/403 spike that begins at a release boundary is almost
   always a regressed API path or RBAC change shipping in that release.
3. **Open the affected `resource_type`'s UI page** in staging or production and
   watch the network tab. Reproduce what the portal requests for that resource
   type and confirm which upstream path is failing.

## PortalUpstream404Anomaly

**Severity:** warning

**Meaning:** the 404 rate for one `(resource_type, api_group)` pair has been
sustained above 5x its trailing 7-day baseline for 30 minutes. Baseline 404s are
normal (deleted resources, optional related resources that render "not
configured" empty states); a 5x sustained departure means the portal is
requesting a path that no longer exists upstream — the issue #1378 `HTTPProxy`
failure mode, which previously ran undetected for seven weeks.

**Response, after the first-response steps above:**

- Verify the portal's API paths for that `resource_type` against the current
  API surface of the labelled `api_group` (path renames and version bumps are
  the usual culprit).
- If `resource_type` or `api_group` is `"unknown"`, the URL parser
  (`parseResourceFromUrl`) does not recognize the request shape — find the raw
  URLs in server logs and fix the parser or the caller.
- Note: a brand-new resource type has no 7-day baseline, so this alert stays
  silent for its first week. The ratio-based alerts below still cover it.

## PortalUpstream403Spike

**Severity:** warning

**Meaning:** more than 10% of all upstream responses for one `resource_type`
were 403s, sustained for 30 minutes. Ordinary per-user permission denials are
spread thin across resource types; a concentrated ratio spike points at an
RBAC/policy regression or a portal page fetching resources its users are not
entitled to.

**Response, after the first-response steps above:**

- Check for recent changes to RBAC policies, roles, or the portal's permission
  checks (`app/modules/rbac/`) for that resource type.
- Confirm whether the 403s come from many users (policy regression upstream) or
  few users hammering retries (UI failing to render the "insufficient
  permissions" state and refetching).

## PortalUpstream5xxElevated

**Severity:** critical — **page-worthy**

**Meaning:** more than 2% of all upstream responses portal-wide were 5xx for 10
minutes. Upstream control-plane APIs are failing, or the portal is sending
malformed requests at scale. User-visible breakage is likely in progress.

**Response, after the first-response steps above:**

- Identify the failing slice:
  `sum by (api_group, resource_type, status) (rate(portal_upstream_responses_total{status=~"5.."}[5m]))`
  — one api_group failing is an upstream outage; everything failing suggests
  network/auth between portal and upstream.
- Escalate to the owning upstream API team once the failing `api_group` is
  identified; the portal cannot fix upstream 5xx on its own.
- Connection-level failures are **not** in this alert's numerator — they carry
  `status="network"` and page via `PortalUpstreamNetworkFailuresElevated`.

## PortalUpstreamNetworkFailuresElevated

**Severity:** critical — **page-worthy**

**Meaning:** more than 2% of upstream requests from the portal server failed at
the connection level (timeout, DNS, connection refused — `status="network"`, no
HTTP response received) for 10 minutes. The network path between the portal and
upstream APIs is degraded; the upstream itself may be healthy.

**Response, after the first-response steps above:**

- Identify the failing slice:
  `sum by (api_group, resource_type) (rate(portal_upstream_responses_total{status="network"}[5m]))`
  — one api_group failing suggests that endpoint is unreachable (DNS change,
  LB outage); everything failing suggests egress/DNS problems on the portal
  side.
- Check portal pod networking, cluster DNS, and any recent infra changes to
  egress paths before escalating to the upstream API team.

## Ops handoff

This directory is the **source of truth** for these alerting rules. Wiring them
into the VictoriaMetrics/vmalert + Grafana stack is done in the **infra repo** —
copy or sync `portal-upstream-errors.rules.yml` there as part of the alerting
deployment; do not fork the rule definitions. Changes to thresholds, windows, or
labels must land here first, then propagate to infra.
