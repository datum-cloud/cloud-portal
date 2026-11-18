import { groupCountryOptions } from './country-autocomplete';
import { BILLING_COUNTRIES } from '@/features/billing/constants';
import { describe, expect, it } from 'vitest';

describe('groupCountryOptions', () => {
  const [popular, all] = groupCountryOptions(BILLING_COUNTRIES);

  it('puts the popular countries first, in priority order', () => {
    expect(popular?.label).toBe('Popular');
    expect(popular?.options.map((o) => o.value)).toEqual([
      'US',
      'GB',
      'CA',
      'AU',
      'IE',
      'DE',
      'FR',
      'ES',
      'IT',
      'NL',
    ]);
  });

  it('keeps every country, popular ones included, in the A–Z list', () => {
    expect(all?.label).toBe('All countries');
    expect(all?.options).toHaveLength(BILLING_COUNTRIES.length);
    expect(all?.options.map((o) => o.value)).toEqual(expect.arrayContaining(['US', 'IE', 'NL']));

    const labels = all?.options.map((o) => o.label) ?? [];
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it('skips the popular group when none of the countries are popular', () => {
    const groups = groupCountryOptions([
      { value: 'JP', label: 'Japan' },
      { value: 'BR', label: 'Brazil' },
    ]);
    expect(groups).toEqual([
      {
        label: 'All countries',
        options: [
          { value: 'BR', label: 'Brazil' },
          { value: 'JP', label: 'Japan' },
        ],
      },
    ]);
  });
});
