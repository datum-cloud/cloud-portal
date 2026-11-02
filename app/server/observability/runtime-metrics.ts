import { collectDefaultMetrics, register } from 'prom-client';

const SENTINEL_METRIC = 'nodejs_eventloop_lag_p99_seconds';

/**
 * Registers prom-client's Node runtime metrics (event loop delay, garbage
 * collection pauses, heap by space, handles, process CPU and memory) on the
 * default registry served at /metrics.
 *
 * Idempotent: the dev server re-evaluates server modules on hot reload, and a
 * second collectDefaultMetrics() call throws "already registered".
 */
export function ensureRuntimeMetrics(): void {
  if (register.getSingleMetric(SENTINEL_METRIC)) return;
  collectDefaultMetrics({ register });
}
