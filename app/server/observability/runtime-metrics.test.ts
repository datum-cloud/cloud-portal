import { ensureRuntimeMetrics } from './runtime-metrics';
import { register } from 'prom-client';
import { describe, expect, test } from 'vitest';

describe('runtime metrics', () => {
  test('exposes event loop, GC, heap and process metrics', async () => {
    ensureRuntimeMetrics();

    const text = await register.metrics();
    for (const name of [
      'nodejs_eventloop_lag_p99_seconds',
      'nodejs_gc_duration_seconds',
      'nodejs_heap_size_used_bytes',
      'nodejs_heap_space_size_used_bytes',
      'process_resident_memory_bytes',
      'process_cpu_seconds_total',
    ]) {
      expect(text).toContain(`# TYPE ${name} `);
    }
  });

  test('registering twice does not throw', () => {
    ensureRuntimeMetrics();
    expect(() => ensureRuntimeMetrics()).not.toThrow();
  });
});
