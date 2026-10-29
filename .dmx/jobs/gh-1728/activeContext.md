# Active Context: gh-1728

## Open Learnings

- `bun test` has 16 failures on a clean tree locally (WatchHub, StaticSource, getValidSession) under bun 1.3.3. They aren't caused by this branch.
- `SparklineStatCard` had no `projectId`; it and its three parents (`kpi-cards`, `metrics-strip`, `project/home/project-traffic`) now pass one. These weren't in the tasks.md caller list.
- The request function drops the `connection`/`buildinfo` request types from the hook, since queryapi has no routes for them; the server-side code for them stays for #1730.
- Chart requests without a step now use `resolveChartStep` (the same auto step the chart hook uses) instead of `PrometheusService.calculateOptimalStep`.
- Label-value failures now surface as `error` from `usePrometheusLabels`; the old server path swallowed them and returned `[]`. Options still default to `[]`.
- `gatedFetch` is gone from the metrics path; the browser axios client already gates requests through `gateAxiosRequest`.
- Checked against staging on 2026-10-29: the proxy metrics page, the proxy overview and the project home traffic card load through queryapi, and every request returned 200.

## Open Decisions

- None.

## Session Notes

- Added the o11y-metrics service for queryapi's Prometheus routes with tests. Phase 1 complete.
- Moved the metrics hooks and every caller onto queryapi with a required projectId. Phase 2 complete.
