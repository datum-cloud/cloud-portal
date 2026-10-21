import {
  breakdownDimensions,
  breakdownDimensionsUnion,
  collectMeterResults,
  dayBuckets,
  planGroupings,
  toMeterSeries,
} from './usage-query';
import type { MeterDefinition } from './usage.types';
import { describe, expect, test } from 'bun:test';

const def = (name: string, dimensions: string[] = []): MeterDefinition => ({
  name,
  meterName: `networking.datumapis.com/${name}`,
  displayName: name,
  dimensions,
  systemDimensions: ['project_name'],
});

const sec = (iso: string) => Date.parse(iso) / 1000;

describe('breakdownDimensions', () => {
  test('leads with project_name across projects and drops hidden dimensions', () => {
    const meter = def('requests', ['region', 'gateway_class', 'httproute_name', 'project_name']);
    expect(breakdownDimensions(meter, true)).toEqual(['project_name', 'region', 'httproute_name']);
  });

  test('leaves out project_name when reading a single project', () => {
    expect(breakdownDimensions(def('requests', ['region']), false)).toEqual(['region']);
  });

  test('only offers project_name when the meter has it', () => {
    const meter = { ...def('tokens', ['model']), systemDimensions: [] };
    expect(breakdownDimensions(meter, true)).toEqual(['model']);
  });
});

describe('breakdownDimensionsUnion', () => {
  test('lists each breakdown once, in first-seen order', () => {
    const defs = [def('requests', ['region']), def('tokens', ['model']), def('egress', ['region'])];
    expect(breakdownDimensionsUnion(defs, true)).toEqual(['project_name', 'region', 'model']);
  });
});

describe('planGroupings', () => {
  test('fits the total and nine breakdowns in one query', () => {
    const dims = Array.from({ length: 9 }, (_, i) => `d${i}`);
    expect(planGroupings(dims)).toEqual([dims]);
  });

  test('moves breakdowns past the grouping limit to another query', () => {
    const dims = Array.from({ length: 12 }, (_, i) => `d${i}`);
    expect(planGroupings(dims)).toEqual([dims.slice(0, 9), dims.slice(9)]);
  });

  test('still makes one query for the total when nothing breaks down', () => {
    expect(planGroupings([])).toEqual([[]]);
  });
});

describe('dayBuckets', () => {
  test('covers each UTC day up to a mid-day end', () => {
    const buckets = dayBuckets(sec('2026-10-01T00:00:00Z'), sec('2026-10-03T12:00:00Z'));
    expect(buckets.map((ts) => new Date(ts).toISOString().slice(0, 10))).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });
});

describe('toMeterSeries', () => {
  const buckets = dayBuckets(sec('2026-10-01T00:00:00Z'), sec('2026-10-04T00:00:00Z'));
  const point = (day: string, value: string) => ({
    start: `2026-10-${day}T00:00:00Z`,
    end: `2026-10-${day}T23:59:59Z`,
    value,
  });

  test('uses the API total and spend, and zero-fills missing days', () => {
    const results = collectMeterResults([
      {
        meters: [
          {
            meterDefinition: 'requests',
            unit: '{request}',
            aggregation: 'Max',
            spend: { amount: '12.5', currency: 'USD' },
            groupings: [{ groupBy: [], series: [{ total: '7', points: [point('02', '7')] }] }],
          },
        ],
      },
      // An overflow query with only a breakdown, as `planGroupings` makes.
      {
        meters: [
          {
            meterDefinition: 'requests',
            groupings: [
              {
                groupBy: ['region'],
                series: [
                  { group: { region: 'us-east-1' }, total: '7', points: [point('02', '7')] },
                  { group: { region: '' }, total: '1', points: [point('03', '1')] },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const series = toMeterSeries(
      def('requests', ['region']),
      results.get('requests'),
      ['region'],
      buckets
    );

    expect(series.total).toBe(7);
    expect(series.aggregation).toBe('Max');
    expect(series.spend).toEqual({ amount: 12.5, currency: 'USD' });
    expect(series.values.map((p) => p.value)).toEqual([0, 7, 0]);
    expect(series.breakdowns).toEqual([
      {
        dimension: 'region',
        series: [
          {
            groupValue: 'us-east-1',
            total: 7,
            values: [
              { timestamp: buckets[0], value: 0 },
              { timestamp: buckets[1], value: 7 },
              { timestamp: buckets[2], value: 0 },
            ],
          },
        ],
      },
    ]);
  });

  test('keeps a meter with no usage empty', () => {
    const results = collectMeterResults([
      { meters: [{ meterDefinition: 'requests', groupings: [{ groupBy: [], series: [] }] }] },
    ]);
    const series = toMeterSeries(def('requests'), results.get('requests'), [], buckets);
    expect(series.values).toEqual([]);
    expect(series.total).toBe(0);
    expect(series.spend).toBeUndefined();
  });

  test('returns a meter the backend could not read empty', () => {
    const results = collectMeterResults([
      { meters: [{ meterDefinition: 'requests', error: 'meter not found in OpenMeter' }] },
    ]);
    const series = toMeterSeries(def('requests'), results.get('requests'), [], buckets);
    expect(series.values).toEqual([]);
    expect(series.label).toBe('requests');
  });

  test('keeps the totals when only an overflow query fails for a meter', () => {
    const results = collectMeterResults([
      {
        meters: [
          {
            meterDefinition: 'requests',
            groupings: [{ groupBy: [], series: [{ total: '7', points: [point('02', '7')] }] }],
          },
        ],
      },
      { meters: [{ meterDefinition: 'requests', error: 'backend timed out' }] },
    ]);
    const series = toMeterSeries(
      def('requests', ['region']),
      results.get('requests'),
      ['region'],
      buckets
    );
    expect(series.total).toBe(7);
    expect(series.breakdowns).toEqual([]);
  });

  test('shows a meter the query did not return empty', () => {
    const series = toMeterSeries(def('requests'), undefined, [], buckets);
    expect(series.values).toEqual([]);
  });
});
