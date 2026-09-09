import { resolveBrushTimeRange, timestampFromChartEvent } from './chart-brush';
import { describe, expect, it } from 'bun:test';

describe('timestampFromChartEvent', () => {
  it('prefers the payload timestamp', () => {
    expect(
      timestampFromChartEvent({
        activeLabel: 'nope',
        activePayload: [{ payload: { timestamp: 1_700_000_000_000 } }],
      })
    ).toBe(1_700_000_000_000);
  });

  it('falls back to a numeric label', () => {
    expect(timestampFromChartEvent({ activeLabel: 1_700_000_000_000 })).toBe(1_700_000_000_000);
  });

  it('returns null when the event has no time', () => {
    expect(timestampFromChartEvent({})).toBeNull();
  });
});

describe('resolveBrushTimeRange', () => {
  const options = {
    stepMs: 60_000,
    rangeStart: 0,
    rangeEnd: 30 * 60_000,
  };

  it('ignores a click on a single bucket', () => {
    expect(resolveBrushTimeRange(120_000, 120_000, options)).toBeNull();
  });

  it('expands the last bucket by one step', () => {
    const range = resolveBrushTimeRange(60_000, 180_000, options);
    expect(range?.start.getTime()).toBe(60_000);
    expect(range?.end.getTime()).toBe(240_000);
  });

  it('clamps to the visible window', () => {
    const range = resolveBrushTimeRange(-10_000, 40 * 60_000, options);
    expect(range?.start.getTime()).toBe(0);
    expect(range?.end.getTime()).toBe(30 * 60_000);
  });
});
