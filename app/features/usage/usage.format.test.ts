import {
  aggregationQualifier,
  formatAxisValue,
  formatCurrency,
  formatByUnit,
  ucumToMeterUnit,
} from './usage.format';
import { describe, expect, it } from 'bun:test';

const format = (ucum: string, value: number) => formatByUnit(ucumToMeterUnit(ucum), value);

describe('ucumToMeterUnit', () => {
  it('reads plain and prefixed byte units', () => {
    expect(ucumToMeterUnit('By')).toEqual({ kind: 'bytes', scale: 1 });
    expect(ucumToMeterUnit('GiBy')).toEqual({ kind: 'bytes', scale: 1024 ** 3 });
  });

  it('reads time units as durations in seconds', () => {
    expect(ucumToMeterUnit('s')).toEqual({ kind: 'duration', scale: 1 });
    expect(ucumToMeterUnit('h')).toEqual({ kind: 'duration', scale: 3600 });
  });

  it('reads bytes over time as byte-time, not bytes', () => {
    expect(ucumToMeterUnit('By.s')).toEqual({ kind: 'byteTime', scale: 1 });
  });

  it('reads millicores over time as CPU time, not a duration', () => {
    expect(ucumToMeterUnit('{millicore}.s')).toEqual({ kind: 'cpuTime', scale: 1e-3 });
  });

  it('reads CPU units on their own as cores', () => {
    expect(ucumToMeterUnit('{cpu}')).toEqual({ kind: 'cpu', scale: 1 });
    expect(ucumToMeterUnit('{millicore}')).toEqual({ kind: 'cpu', scale: 1e-3 });
  });

  it('treats annotations and unknown units as counts', () => {
    expect(ucumToMeterUnit('{token}').kind).toBe('count');
    expect(ucumToMeterUnit('{request}.s').kind).toBe('count');
    expect(ucumToMeterUnit(undefined).kind).toBe('count');
  });
});

describe('formatByUnit', () => {
  it('shows memory-seconds as GB-hours', () => {
    // 1 GiB held for 10 hours.
    expect(format('By.s', 1024 ** 3 * 36000)).toBe('10 GB·h');
  });

  it('shows millicore-seconds as vCPU time', () => {
    // 500 millicores for 4 hours = 2 vCPU-hours.
    expect(format('{millicore}.s', 500 * 4 * 3600)).toBe('2 vCPU·h');
    expect(format('{millicore}.s', 1000 * 90)).toBe('1.5 vCPU·min');
  });

  it('shows allocated CPU as vCPU, whatever the unit', () => {
    expect(format('{cpu}', 4)).toBe('4 vCPU');
    expect(format('{millicore}', 4000)).toBe('4 vCPU');
    expect(format('{millicore}', 500)).toBe('0.5 vCPU');
  });

  it('drops trailing zeros without eating whole numbers', () => {
    expect(format('By', 1024 * 40)).toBe('40 KB');
    expect(format('By', 1024 * 1024 * 100)).toBe('100 MB');
    expect(format('s', 5400)).toBe('1.5h');
  });

  it('shows zero the same way for every unit', () => {
    expect(format('By', 0)).toBe('0');
    expect(format('s', 0)).toBe('0');
    expect(format('{token}', 0)).toBe('0');
  });
});

describe('formatAxisValue', () => {
  it('compacts counts', () => {
    expect(formatAxisValue(ucumToMeterUnit('{token}'), 70000)).toBe('70K');
  });

  it('keeps a unit on the same line as its number', () => {
    expect(formatAxisValue(ucumToMeterUnit('By'), 1024 * 1024 * 15.3)).toBe('15.3 MB');
  });
});

describe('aggregationQualifier', () => {
  it('labels gauges and leaves totals alone', () => {
    expect(aggregationQualifier('Latest')).toBe('latest');
    expect(aggregationQualifier('Max')).toBe('peak');
    expect(aggregationQualifier('Sum')).toBeUndefined();
  });
});

describe('formatCurrency', () => {
  it('formats spend in its currency', () => {
    expect(formatCurrency({ amount: 12.5, currency: 'USD' })).toBe('$12.50');
    expect(formatCurrency({ amount: 3, currency: 'EUR' })).toBe('€3.00');
  });

  it('keeps sub-dollar amounts meaningful', () => {
    expect(formatCurrency({ amount: 0.0042, currency: 'USD' })).toBe('$0.0042');
    expect(formatCurrency({ amount: 0.09, currency: 'USD' })).toBe('$0.09');
  });

  it('shows zero and missing spend plainly', () => {
    expect(formatCurrency({ amount: 0, currency: 'USD' })).toBe('$0');
    expect(formatCurrency(undefined)).toBe('—');
  });
});
