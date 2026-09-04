import {
  albErrorRateQuery,
  albLatencyPercentilesQuery,
  albRpsByClassQuery,
  albRpsQuery,
  albWafIncreaseQuery,
  albWafTopRulesQuery,
  createStatusClassFilter,
  resetGuardedIncrease,
  toStatusClassPatterns,
} from './queries';
import { describe, expect, it } from 'bun:test';

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

describe('toStatusClassPatterns', () => {
  it('maps 2XX-style classes to Envoy response-code regexes', () => {
    expect(toStatusClassPatterns(['2XX', '5XX'])).toEqual(['2..', '5..']);
  });

  it('ignores empty and unknown values', () => {
    expect(toStatusClassPatterns(['', '1XX', '2XX'])).toEqual(['2..']);
    expect(toStatusClassPatterns(null)).toEqual([]);
  });
});

describe('createStatusClassFilter', () => {
  it('emits envoy_response_code patterns for selected classes', () => {
    expect(createStatusClassFilter(['4XX'])).toEqual({
      label: 'envoy_response_code',
      value: ['4..'],
    });
  });
});

describe('alb query builders', () => {
  const scope = { projectId: 'proj', proxyId: 'gw-1' };

  it('scopes RPS to the project gateway and optional status class', () => {
    const query = albRpsQuery({ ...scope, statusClasses: ['2XX'] }, '1m');
    expect(query).toContain('envoy_vhost_vcluster_upstream_rq');
    expect(query).toContain('resourcemanager_datumapis_com_project_name="proj"');
    expect(query).toContain('gateway_name="gw-1"');
    expect(query).toContain('envoy_response_code=~"2.."');
  });

  it('derives 2XX-5XX classes via label_replace', () => {
    const query = albRpsByClassQuery(scope, '1m');
    expect(query).toContain('sum by (envoy_response_code_class)');
    expect(query).toContain('${1}XX');
  });

  it('builds an error-rate ratio against unfiltered total RPS', () => {
    const query = albErrorRateQuery({ ...scope, statusClasses: ['5XX'] }, '1m');
    expect(query).toContain('envoy_response_code=~"[45].."');
    expect(query).toContain(' / ');
    // Denominator should not inherit the 5XX-only filter.
    const [, denominator] = query.split(' / ');
    expect(denominator).not.toContain('envoy_response_code=~"5.."');
  });

  it('overlays p50/p95/p99 with quantile labels', () => {
    const query = albLatencyPercentilesQuery(scope, '1m');
    expect(query).toContain('histogram_quantile(0.5');
    expect(query).toContain('histogram_quantile(0.95');
    expect(query).toContain('histogram_quantile(0.99');
    expect(query).toContain('"quantile","p50"');
    expect(query).toContain('"quantile","p95"');
    expect(query).toContain('"quantile","p99"');
  });

  it('guards WAF increases and top-rule aggregations', () => {
    const blocked = albWafIncreaseQuery(
      { ...scope, customLabels: { coraza_outcome: '=~"blocked|dropped"' } },
      '1h'
    );
    expect(blocked).toContain('coraza_envoy_filter_request_events_total');
    expect(blocked).toContain('resets(');
    expect(blocked).toContain('coraza_outcome=~"blocked|dropped"');

    const topRules = albWafTopRulesQuery(scope, '1h');
    expect(topRules.startsWith('topk(10,')).toBe(true);
    expect(topRules).toContain('coraza_rule_id');
  });
});
