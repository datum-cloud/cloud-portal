import { formatMetricError } from './format-metric-error';
import { PrometheusError } from '@/modules/prometheus';
import { describe, expect, it } from 'bun:test';

describe('formatMetricError', () => {
  it('never surfaces the Bun/OTEL captureStackTrace leak', () => {
    expect(formatMetricError(new Error('First argument must be an Error object'))).toBe(
      "Couldn't load this chart. Try refreshing or changing the time range."
    );
  });

  it('maps permission failures', () => {
    expect(formatMetricError(PrometheusError.network('nope', 403))).toBe(
      "You don't have permission to view these metrics"
    );
  });

  it('maps timeouts', () => {
    expect(formatMetricError(PrometheusError.timeout('deadline exceeded'))).toBe(
      'This chart took too long to load. Try a shorter time range.'
    );
  });

  it('maps queryapi 422 (response too large)', () => {
    expect(formatMetricError(new PrometheusError('too many series', 'query', 422))).toBe(
      'This chart has too much data to show. Try a shorter time range or fewer filters.'
    );
  });

  it('maps queryapi 503 (query timeout)', () => {
    expect(formatMetricError(PrometheusError.network('service unavailable', 503))).toBe(
      'This chart took too long to load. Try a shorter time range.'
    );
  });

  it('maps query failures without dumping PromQL', () => {
    expect(formatMetricError(PrometheusError.query('parse error at 1:12'))).toBe(
      "Couldn't calculate this chart for the current filters."
    );
  });

  it('keeps a short, already-human message', () => {
    expect(formatMetricError(new Error('Metrics store is unavailable'))).toBe(
      'Metrics store is unavailable'
    );
  });
});
