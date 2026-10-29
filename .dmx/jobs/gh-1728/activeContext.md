# Active Context: gh-1728

## Open Learnings

- `mapApiError` reads `message` from an error body, but queryapi errors are Prometheus envelopes (`errorType`, `error`), so non-2xx responses lose queryapi's error text and keep only the status. Phase 2's 422/503 messages key off the status; a 400 `bad_data` message would need the envelope's `error`.
- `bun test` has 16 failures on a clean tree locally (WatchHub, StaticSource, getValidSession) under bun 1.3.3. They aren't caused by this branch.

## Open Decisions

- None.

## Session Notes

- Added the o11y-metrics service for queryapi's Prometheus routes with tests. Phase 1 complete.
