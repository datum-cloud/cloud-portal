import type { MeterUnit } from './usage.types';
import type { UsageSpend } from '@/modules/billing/usage.types';

const BYTE_FACTORS: Record<string, number> = {
  By: 1,
  kBy: 1e3,
  KiBy: 1024,
  MBy: 1e6,
  MiBy: 1024 ** 2,
  GBy: 1e9,
  GiBy: 1024 ** 3,
  TBy: 1e12,
  TiBy: 1024 ** 4,
};

const TIME_FACTORS: Record<string, number> = {
  ms: 1e-3,
  s: 1,
  min: 60,
  h: 3600,
  d: 86400,
};

/** Annotations that measure CPU, in cores per unit. */
const CPU_FACTORS: Record<string, number> = {
  '{cpu}': 1,
  '{core}': 1,
  '{vcpu}': 1,
  '{millicore}': 1e-3,
  '{millicpu}': 1e-3,
};

type UnitTerm = { family: 'bytes' | 'time' | 'cpu' | 'other'; factor: number };

function parseTerm(term: string): UnitTerm {
  if (term in BYTE_FACTORS) return { family: 'bytes', factor: BYTE_FACTORS[term] };
  if (term in TIME_FACTORS) return { family: 'time', factor: TIME_FACTORS[term] };
  const cpu = CPU_FACTORS[term.toLowerCase()];
  if (cpu !== undefined) return { family: 'cpu', factor: cpu };
  return { family: 'other', factor: 1 };
}

/**
 * Map a UCUM unit from `MeterDefinition.spec.measurement.unit` onto the
 * display families this page formats, with the factor that converts a raw
 * value into the family's base unit:
 *   - `By`, `KiBy`, `GBy` … → bytes
 *   - `s`, `ms`, `min`, `h`, `d` → duration (seconds)
 *   - `By.s`, `GBy.h` … → byte-time (byte-seconds), e.g. memory over time
 *   - `{millicore}.s`, `{cpu}.s` … → CPU time (core-seconds)
 *   - `{cpu}`, `{millicore}` … → CPU (cores), e.g. allocated vCPU
 *   - everything else (`{request}`, `{token}`, `1`, …) → count
 */
export function ucumToMeterUnit(unit: string | undefined): MeterUnit {
  const terms = (unit ?? '').trim().split('.').filter(Boolean).map(parseTerm);
  const count: MeterUnit = { kind: 'count', scale: 1 };

  if (terms.length === 1) {
    const [term] = terms;
    if (term.family === 'bytes') return { kind: 'bytes', scale: term.factor };
    if (term.family === 'time') return { kind: 'duration', scale: term.factor };
    if (term.family === 'cpu') return { kind: 'cpu', scale: term.factor };
    return count;
  }

  if (terms.length === 2) {
    const time = terms.find((term) => term.family === 'time');
    const other = terms.find((term) => term !== time);
    if (!time || !other) return count;
    const scale = time.factor * other.factor;
    if (other.family === 'bytes') return { kind: 'byteTime', scale };
    if (other.family === 'cpu') return { kind: 'cpuTime', scale };
  }

  return count;
}

/** Up to 2 significant decimals, without trailing zeros (`40.0` → `40`). */
function trimNumber(value: number): string {
  const fixed = value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

/**
 * Bytes in binary multiples, labelled KB/MB/GB as the platform labels them:
 * byte meters are priced per GB of 2^30 bytes (see the egress
 * ServicePricing), so usage reads in the unit spend is charged in. A unit
 * with a UCUM decimal prefix (`GBy` = 10^9 bytes) is parsed at its real
 * size and shown in these units, so 1 GBy reads as 954 MB.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${trimNumber(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${trimNumber(v)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${trimNumber(seconds)}s`;
  if (seconds < 3600) return `${trimNumber(seconds / 60)}m`;
  if (seconds < 86400) return `${trimNumber(seconds / 3600)}h`;
  return `${trimNumber(seconds / 86400)}d`;
}

/** Byte-seconds as size × hours, e.g. `219 GB·h`. */
function formatByteTime(byteSeconds: number): string {
  return `${formatBytes(byteSeconds / 3600)}·h`;
}

/** Core-seconds as vCPU time, e.g. `120 vCPU·h`, `35 vCPU·min`. */
function formatCpuTime(coreSeconds: number): string {
  if (coreSeconds >= 3600) return `${trimNumber(coreSeconds / 3600)} vCPU·h`;
  if (coreSeconds >= 60) return `${trimNumber(coreSeconds / 60)} vCPU·min`;
  return `${trimNumber(coreSeconds)} vCPU·s`;
}

/**
 * Format a raw meter value for its unit. Drives the card headline, the
 * summary table, tooltips and chart axes so every surface agrees.
 */
export function formatByUnit(unit: MeterUnit, value: number): string {
  if (value === 0) return '0';
  const base = value * unit.scale;
  switch (unit.kind) {
    case 'bytes':
      return formatBytes(base);
    case 'duration':
      return formatDuration(base);
    case 'byteTime':
      return formatByteTime(base);
    case 'cpuTime':
      return formatCpuTime(base);
    case 'cpu':
      return `${trimNumber(base)} vCPU`;
    default:
      return base.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}

/**
 * Short label for chart axes. Counts use compact notation (`70K`), and the
 * space before a unit is non-breaking so ticks never wrap onto two lines.
 */
export function formatAxisValue(unit: MeterUnit, value: number): string {
  if (unit.kind === 'count') {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value * unit.scale);
  }
  return formatByUnit(unit, value).replace(/ /g, ' ');
}

/**
 * "used / limit" pair formatted for display, e.g. `0 B / 100GB`. When the
 * meter has no matching quota (`limit <= 0`), only the consumed figure is
 * shown so the card doesn't imply a fabricated "/ 0" ceiling.
 */
export function formatUsagePair(unit: MeterUnit, used: number, limit: number): string {
  if (limit <= 0) return formatByUnit(unit, used);
  return `${formatByUnit(unit, used)} / ${formatByUnit(unit, limit)}`;
}

const AGGREGATION_QUALIFIERS: Record<string, string> = {
  Latest: 'latest',
  Max: 'peak',
  Min: 'lowest',
  Average: 'average',
  UniqueCount: 'unique',
};

/**
 * Qualifier for a meter whose period value is not a running total, e.g. a
 * `Latest` gauge like allocated CPU. `undefined` for Sum and Count.
 */
export function aggregationQualifier(aggregation: string | undefined): string | undefined {
  return aggregation ? AGGREGATION_QUALIFIERS[aggregation] : undefined;
}

/**
 * Spend in its currency, e.g. `$12.50`. Sub-dollar amounts keep enough
 * digits to stay meaningful (`$0.0042`); a missing amount is `—`.
 */
export function formatCurrency(spend: UsageSpend | undefined): string {
  if (!spend || !Number.isFinite(spend.amount)) return '—';
  const { amount, currency } = spend;
  // Cents as usual; up to 4 decimals below a dollar without padding zeros
  // (`$0.09`, not `$0.0900`).
  const minDigits = amount === 0 ? 0 : 2;
  const maxDigits = amount === 0 ? 0 : Math.abs(amount) >= 1 ? 2 : 4;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(maxDigits)} ${currency}`;
  }
}
