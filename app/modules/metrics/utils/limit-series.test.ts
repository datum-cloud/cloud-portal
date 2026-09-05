import { limitSeriesByVolume } from './limit-series';
import type { ChartSeries, FormattedMetricData } from '@/modules/prometheus';
import { describe, expect, it } from 'bun:test';

function series(name: string, values: number[]): ChartSeries {
  return {
    name,
    labels: {},
    data: values.map((value, index) => ({
      timestamp: index * 60_000,
      value,
      formattedTime: String(index),
    })),
  };
}

function data(items: ChartSeries[]): FormattedMetricData {
  return { series: items, timeRange: { start: 0, end: 60_000 } };
}

describe('limitSeriesByVolume', () => {
  it('leaves a short list alone', () => {
    const input = data([series('200', [1]), series('404', [2])]);
    expect(limitSeriesByVolume(input, 6)).toBe(input);
  });

  it('keeps the busiest codes and rolls the rest into Other', () => {
    const limited = limitSeriesByVolume(
      data([
        series('103', [1]),
        series('200', [40]),
        series('204', [2]),
        series('304', [8]),
        series('404', [20]),
        series('405', [15]),
      ]),
      4
    );

    expect(limited.series.map((item) => item.name)).toEqual(['200', '404', '405', 'Other']);
    expect(limited.series.at(-1)?.data[0]?.value).toBe(11);
  });
});
