import type { MeterSeries, SummarizedMeterUsage } from './usage.types';

const ASSISTANT_DAILY_DETAIL_DAYS = 7;

/** Collapse daily buckets into recent daily totals for assistant context. */
export function summarizeMetersForAssistant(
  meters: MeterSeries[],
  detailDays = ASSISTANT_DAILY_DETAIL_DAYS
): SummarizedMeterUsage[] {
  const cutoffMs = Date.now() - detailDays * 24 * 3600 * 1000;

  return meters.map((meter) => {
    const dailyByDate = new Map<string, number>();
    for (const { timestamp, value } of meter.values) {
      if (timestamp < cutoffMs) continue;
      const date = new Date(timestamp).toISOString().slice(0, 10);
      dailyByDate.set(date, (dailyByDate.get(date) ?? 0) + value);
    }

    const recentDaily = Array.from(dailyByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      meterDefinition: meter.meterDefinition,
      label: meter.label,
      total: meter.total,
      recentDaily,
    };
  });
}
