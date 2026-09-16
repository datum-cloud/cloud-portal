import type { ProxyBackend } from '@/resources/http-proxies';

/** Palette for distribution segments and their legend swatches. */
export const BACKEND_SHARE_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

export interface BackendShare {
  backend: ProxyBackend;
  /** Percentage of traffic, 0–100. Rounded for display only. */
  percent: number;
  /** A zero-weight backend receives nothing, whatever the algorithm. */
  excluded: boolean;
  color: string;
}

export interface ShareBreakdown {
  shares: BackendShare[];
  totalWeight: number;
  /** True when no backend can receive traffic, so there is no bar to draw. */
  noTraffic: boolean;
}

/**
 * Split a pool by weight.
 *
 * Share is weight / sum-of-weights within the rule, which is the Gateway API's
 * own definition and what Envoy actually applies. It is derived from spec, not
 * measured — there is no per-backend request metric to measure with.
 */
export function backendShares(backends: ProxyBackend[]): ShareBreakdown {
  const totalWeight = backends.reduce((sum, b) => sum + b.weight, 0);

  // Every weight is 0: the API allows it, and it means the pool is drained.
  // Dividing here would produce NaN, so say "no traffic" instead of drawing a
  // bar that implies an even split.
  if (totalWeight === 0) {
    return {
      shares: backends.map((backend, i) => ({
        backend,
        percent: 0,
        excluded: true,
        color: BACKEND_SHARE_COLORS[i % BACKEND_SHARE_COLORS.length],
      })),
      totalWeight: 0,
      noTraffic: true,
    };
  }

  return {
    shares: backends.map((backend, i) => ({
      backend,
      percent: (backend.weight / totalWeight) * 100,
      excluded: backend.weight === 0,
      color: BACKEND_SHARE_COLORS[i % BACKEND_SHARE_COLORS.length],
    })),
    totalWeight,
    noTraffic: false,
  };
}

/**
 * Percentages for display. Rounded to whole numbers, which can leave the
 * column not summing to exactly 100 — honest rounding beats a fudged total.
 */
export function formatSharePercent(percent: number): string {
  if (percent > 0 && percent < 1) return '<1%';
  return `${Math.round(percent)}%`;
}
