import { describe, expect, it } from 'bun:test';

import { resetGuardedIncrease } from './waf-events';

describe('resetGuardedIncrease', () => {
  it('multiplies increase() by a resets()-equals-zero guard over the same series and window', () => {
    const query = resetGuardedIncrease(
      'coraza_envoy_filter_request_events_total',
      '{coraza_outcome="allowed"}',
      '30m'
    );

    expect(query).toBe(
      '(increase(coraza_envoy_filter_request_events_total{coraza_outcome="allowed"}[30m]) * ' +
        '(resets(coraza_envoy_filter_request_events_total{coraza_outcome="allowed"}[30m]) == bool 0))'
    );
  });

  it('applies the same window to both increase() and resets()', () => {
    const query = resetGuardedIncrease('some_counter_total', '{label="value"}', '1m');

    const incWindow = query.match(/increase\([^[]+\[(\w+)\]\)/)?.[1];
    const resetsWindow = query.match(/resets\([^[]+\[(\w+)\]\)/)?.[1];

    expect(incWindow).toBe('1m');
    expect(resetsWindow).toBe('1m');
  });
});
