import { sumMeterValues, summarizeMetersForAssistant } from '@/modules/billing/usage-summary';
import type { MeterSeries } from '@/modules/billing/usage.types';

describe('sumMeterValues', () => {
  it('sums sample values', () => {
    expect(sumMeterValues([{ value: 10 }, { value: 5 }, { value: 2.5 }])).to.equal(17.5);
  });

  it('returns 0 for an empty series', () => {
    expect(sumMeterValues([])).to.equal(0);
  });
});

describe('summarizeMetersForAssistant', () => {
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;

  const meters: MeterSeries[] = [
    {
      meterApiName: 'assistant.tokens',
      label: 'Assistant tokens',
      values: [
        { timestamp: now - 2 * dayMs, value: 100 },
        { timestamp: now - 1 * dayMs, value: 50 },
        { timestamp: now - 10 * dayMs, value: 200 },
      ],
    },
  ];

  it('computes total across the full window', () => {
    const [summary] = summarizeMetersForAssistant(meters, 7);
    expect(summary.total).to.equal(350);
  });

  it('includes only recent daily breakdown within detailDays', () => {
    const [summary] = summarizeMetersForAssistant(meters, 7);
    expect(summary.recentDaily).to.have.lengthOf(2);
    expect(summary.recentDaily.every((d) => d.date.match(/^\d{4}-\d{2}-\d{2}$/))).to.equal(true);
  });

  it('preserves meter labels and api names', () => {
    const [summary] = summarizeMetersForAssistant(meters, 7);
    expect(summary.meterApiName).to.equal('assistant.tokens');
    expect(summary.label).to.equal('Assistant tokens');
  });
});
