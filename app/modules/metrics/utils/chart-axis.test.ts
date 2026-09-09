import {
  autoStepForRange,
  bucketDataToTimeRange,
  getLinearYAxisScale,
  pickEvenlySpaced,
  resolveChartStep,
  timeBucketBarWidth,
} from './chart-axis';
import { describe, expect, it } from 'bun:test';

describe('autoStepForRange', () => {
  it('uses 1m for a 30-minute window so charts have a real series', () => {
    expect(autoStepForRange(30 * 60_000)).toBe('1m');
  });

  it('uses 10m for a 3-hour window', () => {
    expect(autoStepForRange(3 * 60 * 60_000)).toBe('10m');
  });

  it('uses 1h for a 24-hour window', () => {
    expect(autoStepForRange(24 * 60 * 60_000)).toBe('1h');
  });
});

describe('resolveChartStep', () => {
  it('resolves auto against the selected range', () => {
    expect(resolveChartStep('auto', 30 * 60_000)).toBe('1m');
    expect(resolveChartStep(undefined, 30 * 60_000)).toBe('1m');
  });

  it('leaves an explicit step alone', () => {
    expect(resolveChartStep('15m', 30 * 60_000)).toBe('15m');
  });
});

describe('getLinearYAxisScale', () => {
  it('does not invent a 0–4 domain when every point is empty', () => {
    expect(getLinearYAxisScale(0)).toEqual({ domain: [0, 1], ticks: [0, 1] });
  });
});

describe('bucketDataToTimeRange', () => {
  const start = 1_000_000;
  const step = 60_000;

  it('leaves empty quantile buckets null so no-traffic is not 0ms', () => {
    const rows = bucketDataToTimeRange(
      [{ timestamp: start + 60_000, p95: 175 }],
      start,
      start + 2 * step,
      step,
      ['p95'],
      'avg',
      null
    );

    expect(rows[0]?.p95).toBeNull();
    expect(rows[1]?.p95).toBe(175);
    expect(rows[2]?.p95).toBeNull();
  });

  it('skips NaN histogram samples', () => {
    const rows = bucketDataToTimeRange(
      [{ timestamp: start, p95: Number.NaN }],
      start,
      start,
      step,
      ['p95'],
      'avg',
      null
    );

    expect(rows[0]?.p95).toBeNull();
  });
});

describe('pickEvenlySpaced', () => {
  it('keeps the first and last items', () => {
    expect(pickEvenlySpaced([0, 1, 2, 3, 4, 5], 3)).toEqual([0, 3, 5]);
  });
});

describe('timeBucketBarWidth', () => {
  it('sizes bars to the step interval instead of a 1px needle', () => {
    const width = timeBucketBarWidth(600, 30 * 60_000, 15 * 60_000);
    expect(width).toBe(72);
  });
});
