import { timeRangeSchema } from './validator';
import { describe, expect, it } from 'bun:test';

describe('timeRangeSchema', () => {
  it('converts unix seconds to dates', () => {
    const result = timeRangeSchema.parse({ start: 1_700_000_000, end: 1_700_003_600 });

    expect(result.start.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    expect(result.end.getTime() - result.start.getTime()).toBe(3_600_000);
  });

  it('passes Date objects through unchanged', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-02T00:00:00Z');

    const result = timeRangeSchema.parse({ start, end });

    expect(result.start).toBe(start);
    expect(result.end).toBe(end);
  });

  it('accepts ISO strings that carry seconds', () => {
    const result = timeRangeSchema.parse({
      start: '2026-01-01T06:15:00Z',
      end: '2026-01-01T07:15:00.000Z',
    });

    expect(result.start.toISOString()).toBe('2026-01-01T06:15:00.000Z');
    expect(result.end.toISOString()).toBe('2026-01-01T07:15:00.000Z');
  });

  it('rejects ISO strings without seconds', () => {
    // RFC 3339 mandates seconds; zod 4.5 stopped accepting minute precision.
    const result = timeRangeSchema.safeParse({
      start: '2026-01-01T06:15Z',
      end: '2026-01-01T07:15Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a start that is not before the end', () => {
    const result = timeRangeSchema.safeParse({ start: 1_700_003_600, end: 1_700_000_000 });

    expect(result.success).toBe(false);
  });
});
