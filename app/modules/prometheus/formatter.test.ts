import { formatForChart } from './formatter';
import { describe, expect, it } from 'bun:test';

describe('formatForChart series names', () => {
  it('names an empty group-by label unknown', () => {
    const data = formatForChart({
      resultType: 'matrix',
      result: [{ metric: { coraza_rule_severity: '' }, values: [[1, '10']] }],
    });

    expect(data.series[0]?.name).toBe('unknown');
  });

  it('keeps Series for aggregates with no labels', () => {
    const data = formatForChart({
      resultType: 'matrix',
      result: [{ metric: {}, values: [[1, '10']] }],
    });

    expect(data.series[0]?.name).toBe('Series');
  });
});
