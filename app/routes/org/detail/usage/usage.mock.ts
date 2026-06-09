/**
 * Dummy data for the org usage dashboard redesign.
 *
 * The Figma surfaces quota limits, service categories, and per-meter
 * breakdown tabs that the Amberflo API doesn't expose yet, so the page
 * is driven from this static dataset for now. When the SDK ships
 * matching resources, map `UsageFetchResult.meters` into `MockMeter`
 * and delete this module — the components consume the shapes below, not
 * the literals.
 */
import type { MeterDimensionBreakdown } from '@/modules/billing/usage.types';

export type MeterUnit = 'bytes' | 'count' | 'duration';

export interface MeterPoint {
  timestamp: number;
  value: number;
}

export interface MockMeter {
  apiName: string;
  label: string;
  description: string;
  learnMoreHref: string;
  unit: MeterUnit;
  used: number;
  limit: number;
  /** Breakdown tabs shown above the chart. The first entry is the default. */
  tabs: string[];
  series: MeterPoint[];
  /** Relative "Updated Xm ago" label — static copy for the mock. */
  updatedLabel: string;
  /**
   * Real per-dimension grouped series, when driven from the live API.
   * Absent for mock data (tabs then render the aggregate series).
   */
  breakdowns?: MeterDimensionBreakdown[];
}

export interface MockGroup {
  id: string;
  title: string;
  description: string;
  meters: MockMeter[];
}

export interface UsageSummaryRow {
  apiName: string;
  label: string;
  unit: MeterUnit;
  used: number;
  limit: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build a smooth, slightly noisy ~30-point daily series so the area
 * charts read like the design rather than a flat baseline. Deterministic
 * per `seed` so the mock doesn't reflow between renders.
 */
function buildSeries(seed: number, peak: number, points = 30): MeterPoint[] {
  const start = Date.now() - (points - 1) * DAY_MS;
  const series: MeterPoint[] = [];
  for (let i = 0; i < points; i += 1) {
    // Smooth hump across the window plus a deterministic wobble.
    const phase = (i / (points - 1)) * Math.PI;
    const hump = Math.sin(phase);
    const wobble = (Math.sin(seed + i * 1.7) + 1) / 2;
    const value = Math.max(0, Math.round(peak * (0.35 * hump + 0.4 * hump * wobble)));
    series.push({ timestamp: start + i * DAY_MS, value });
  }
  return series;
}

const GB = 1024 * 1024 * 1024;

/**
 * Meter identifiers mirror the platform's real wire names so the mock
 * reads like the live API:
 *   - Compute maps to the quota system's `compute_*` resource types
 *     (see `quota.miloapis.com` AllowanceBucket.spec.resourceType).
 *   - AI Assistant uses the canonical assistant meter names from
 *     `app/modules/usage/meters.ts` (`assistant.miloapis.com/...`).
 */
export const USAGE_GROUPS: MockGroup[] = [
  {
    id: 'compute',
    title: 'Compute',
    description:
      'Processing capacity consumed by workloads running across the projects in this organization, aggregated for the current billing period.',
    meters: [
      {
        apiName: 'compute_cpu',
        label: 'vCPU',
        description: 'Total vCPU-hours consumed by running workloads across your projects.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'count',
        used: 36,
        limit: 100,
        tabs: ['Total', 'Projects', 'Regions'],
        series: buildSeries(1, 4),
        updatedLabel: 'Updated 3m ago',
      },
      {
        apiName: 'compute_memory',
        label: 'Memory',
        description: 'Memory consumed by running workloads over the current billing period.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'bytes',
        used: 184 * GB,
        limit: 512 * GB,
        tabs: ['Total', 'Projects', 'Regions'],
        series: buildSeries(2, 14 * GB),
        updatedLabel: 'Updated 3m ago',
      },
      {
        apiName: 'compute_gpu',
        label: 'GPU',
        description: 'Total GPU-hours consumed by accelerated workloads across your projects.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'count',
        used: 8,
        limit: 50,
        tabs: ['Total', 'Projects', 'Regions'],
        series: buildSeries(3, 1),
        updatedLabel: 'Updated 12m ago',
      },
    ],
  },
  {
    id: 'assistant',
    title: 'AI Assistant',
    description:
      'Token and message consumption from the Datum AI assistant, summed across every conversation in the organization and grouped by model.',
    meters: [
      {
        apiName: 'assistant.miloapis.com/conversation/input-tokens',
        label: 'Input Tokens',
        description: 'Tokens sent to the model as prompt input across all assistant conversations.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'count',
        used: 1_284_000,
        limit: 5_000_000,
        tabs: ['Total', 'Projects', 'Models'],
        series: buildSeries(4, 95_000),
        updatedLabel: 'Updated 3m ago',
      },
      {
        apiName: 'assistant.miloapis.com/conversation/output-tokens',
        label: 'Output Tokens',
        description:
          'Tokens generated by the model in responses across all assistant conversations.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'count',
        used: 612_000,
        limit: 2_000_000,
        tabs: ['Total', 'Projects', 'Models'],
        series: buildSeries(5, 48_000),
        updatedLabel: 'Updated 3m ago',
      },
      {
        apiName: 'assistant.miloapis.com/conversation/cache-read-tokens',
        label: 'Cache Read Tokens',
        description:
          'Prompt tokens served from the model prompt cache instead of being reprocessed.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'count',
        used: 3_400_000,
        limit: 10_000_000,
        tabs: ['Total', 'Projects', 'Models'],
        series: buildSeries(6, 260_000),
        updatedLabel: 'Updated 3m ago',
      },
      {
        apiName: 'assistant.miloapis.com/conversation/cache-write-tokens',
        label: 'Cache Write Tokens',
        description: 'Prompt tokens written into the model prompt cache for reuse on later turns.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'count',
        used: 248_000,
        limit: 2_000_000,
        tabs: ['Total', 'Projects', 'Models'],
        series: buildSeries(7, 22_000),
        updatedLabel: 'Updated 8m ago',
      },
      {
        apiName: 'assistant.miloapis.com/conversation/messages',
        label: 'Messages',
        description: 'The number of assistant messages exchanged across all conversations.',
        learnMoreHref: 'https://www.datum.net/docs',
        unit: 'count',
        used: 4_820,
        limit: 50_000,
        tabs: ['Total', 'Projects'],
        series: buildSeries(8, 380),
        updatedLabel: 'Updated 3m ago',
      },
    ],
  },
];

/**
 * Flattened, ordered list backing the "Usage summary" table — one row
 * per meter across every group, in group/meter declaration order.
 */
export const USAGE_SUMMARY_ROWS: UsageSummaryRow[] = USAGE_GROUPS.flatMap((group) =>
  group.meters.map((meter) => ({
    apiName: meter.apiName,
    label: meter.label,
    unit: meter.unit,
    used: meter.used,
    limit: meter.limit,
  }))
);

/** Dummy options for the non-functional toolbar filters. */
export const BILLING_CYCLE_OPTIONS = [
  { value: 'current', label: 'Current billing cycle (13 Apr - 13 May 2026)' },
  { value: 'previous', label: 'Previous billing cycle (13 Mar - 13 Apr 2026)' },
];

export const PROJECT_FILTER_OPTIONS = [
  { value: 'all', label: 'All projects' },
  { value: 'demo', label: 'Demo Project' },
];
