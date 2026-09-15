import { Counter, register } from 'prom-client';

/**
 * Counters for the traffic-class rate limiter. Registered once per process the
 * same way quota-metrics.ts does, so a re-import under HMR or tests does not
 * throw on a duplicate name. See datum-cloud/cloud-portal#1543.
 */
function counter<L extends string>(name: string, help: string, labelNames: readonly L[]) {
  return (
    (register.getSingleMetric(name) as Counter<L> | undefined) ??
    new Counter<L>({ name, help, labelNames: [...labelNames] })
  );
}

export const rateLimitRejectionsTotal = counter(
  'rate_limit_rejections_total',
  'Count of /api requests rejected by the rate limiter, by bucket and route group',
  ['class', 'route'] as const
);

export const rateLimitPenaltiesTotal = counter(
  'rate_limit_penalties_total',
  'Count of subjects placed in the rate limit penalty box',
  [] as const
);

export const apiNonBrowserRequestsTotal = counter(
  'api_nonbrowser_requests_total',
  'Count of /api requests that carried no browser fetch metadata',
  ['route'] as const
);
