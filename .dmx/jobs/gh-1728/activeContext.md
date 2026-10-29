# Active Context: gh-1728

## Open Learnings

- `bun test` has 16 failures on a clean tree locally (WatchHub, StaticSource, getValidSession) under bun 1.3.3. They aren't caused by this branch.
- `SparklineStatCard` had no `projectId`; it and its three parents (`kpi-cards`, `metrics-strip`, `project/home/project-traffic`) now pass one. These weren't in the tasks.md caller list.
- The request function drops the `connection`/`buildinfo` request types from the hook, since queryapi has no routes for them; the server-side code for them stays for #1730.
- Chart requests without a step now use `resolveChartStep` (the same auto step the chart hook uses) instead of `PrometheusService.calculateOptimalStep`.
- Label-value failures now surface as `error` from `usePrometheusLabels`; the old server path swallowed them and returned `[]`. Options still default to `[]`.
- `gatedFetch` is gone from the metrics path; the browser axios client already gates requests through `gateAxiosRequest`.
- `PROMETHEUS_URL` was also documented in `docs/getting-started/02-environment-setup.md`, which wasn't in the task list; removed it there too. `app/modules/prometheus/README.md` and a commented-out line in `app/modules/prometheus/client.ts` still mention it; both go with #1730.
- Unauthenticated requests to `/api/prometheus` now return 401 from the auth guard before routing, so the route's removal only shows as a 404 for a signed-in session.
- Checked against staging on 2026-10-29: the proxy metrics page, the proxy overview and the project home traffic card load through queryapi, and every request returned 200.

## Open Decisions

- None.

## Session Notes

- Added the o11y-metrics service for queryapi's Prometheus routes with tests. Phase 1 complete.
- Moved the metrics hooks and every caller onto queryapi with a required projectId. Phase 2 complete.
- Deleted `/api/prometheus`, removed `PROMETHEUS_URL`, updated the metrics README and confirmed the role permissions. Phase 3 complete: after the restart the proxy metrics charts load through queryapi (200s) and the server log shows no `/api/prometheus` calls.
- Validation: READY FOR PR. Fixed its suggestions: queryapi 400s are query errors, and query errors, timeouts, 401 and 403 aren't retried (`shouldRetryMetricsQuery`).
