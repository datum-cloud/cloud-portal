import {
  apiNonBrowserRequestsTotal,
  rateLimitPenaltiesTotal,
  rateLimitRejectionsTotal,
} from './rate-limit-metrics';
import { describe, expect, test } from 'bun:test';
import { register } from 'prom-client';

async function valueOf(name: string, labels: Record<string, string> = {}): Promise<number> {
  const metric = await register.getSingleMetric(name)?.get();
  const entry = metric?.values.find((v) =>
    Object.entries(labels).every(([k, val]) => v.labels[k] === val)
  );
  return entry?.value ?? 0;
}

describe('rate limit metrics', () => {
  test('registers once and counts with the documented labels', async () => {
    // The registry is shared across test files, so assert deltas rather than
    // absolute values; another file may have incremented these already.
    const rejectionLabels = { class: 'machine', route: 'watch' };
    const before = {
      rejections: await valueOf('rate_limit_rejections_total', rejectionLabels),
      penalties: await valueOf('rate_limit_penalties_total'),
      nonBrowser: await valueOf('api_nonbrowser_requests_total', { route: 'proxy' }),
    };

    rateLimitRejectionsTotal.inc(rejectionLabels);
    rateLimitRejectionsTotal.inc(rejectionLabels);
    rateLimitPenaltiesTotal.inc();
    apiNonBrowserRequestsTotal.inc({ route: 'proxy' });

    expect(await valueOf('rate_limit_rejections_total', rejectionLabels)).toBe(
      before.rejections + 2
    );
    expect(await valueOf('rate_limit_penalties_total')).toBe(before.penalties + 1);
    expect(await valueOf('api_nonbrowser_requests_total', { route: 'proxy' })).toBe(
      before.nonBrowser + 1
    );
  });

  test('re-importing does not throw on a duplicate registration', async () => {
    const again = await import('./rate-limit-metrics');
    expect(again.rateLimitRejectionsTotal).toBe(rateLimitRejectionsTotal);
  });
});
