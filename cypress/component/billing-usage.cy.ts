import { summarizeMetersForAssistant } from '@/modules/billing/usage-summary';
import type { MeterSeries } from '@/modules/billing/usage.types';

describe('summarizeMetersForAssistant', () => {
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;

  const meters: MeterSeries[] = [
    {
      meterDefinition: 'assistant.tokens',
      label: 'Assistant tokens',
      total: 350,
      values: [
        { timestamp: now - 2 * dayMs, value: 100 },
        { timestamp: now - 1 * dayMs, value: 50 },
        { timestamp: now - 10 * dayMs, value: 200 },
      ],
    },
  ];

  it('uses the meter total for the full window', () => {
    const [summary] = summarizeMetersForAssistant(meters, 7);
    expect(summary.total).to.equal(350);
  });

  it('includes only recent daily breakdown within detailDays', () => {
    const [summary] = summarizeMetersForAssistant(meters, 7);
    expect(summary.recentDaily).to.have.lengthOf(2);
    expect(summary.recentDaily.every((d) => d.date.match(/^\d{4}-\d{2}-\d{2}$/))).to.equal(true);
  });

  it('preserves meter labels and definition names', () => {
    const [summary] = summarizeMetersForAssistant(meters, 7);
    expect(summary.meterDefinition).to.equal('assistant.tokens');
    expect(summary.label).to.equal('Assistant tokens');
  });
});
