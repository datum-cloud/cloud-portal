import { humanizeDimension, toUsageView } from './usage.view';
import type { UsageFetchResult } from '@/modules/billing/usage.types';
import { describe, expect, it } from 'vitest';

const points = [{ timestamp: 1, value: 5 }];

function albResult(): UsageFetchResult {
  return {
    status: 'ok',
    days: 30,
    groups: [
      {
        id: 'networking',
        title: 'Networking',
        meterDefinitions: ['alb-requests', 'alb-ingress'],
      },
    ],
    meters: [
      {
        meterDefinition: 'alb-requests',
        label: 'ALB Requests',
        values: points,
        total: 5,
        breakdowns: [
          { dimension: 'region', series: [{ groupValue: 'us-east-1', total: 5, values: points }] },
          {
            dimension: 'httproute_name',
            series: [
              { groupValue: 'storefront-x1y2', total: 5, values: points },
              { groupValue: 'api-a9b8', total: 5, values: points },
            ],
          },
        ],
      },
      { meterDefinition: 'alb-ingress', label: 'ALB Ingress', values: [], total: 0 },
    ],
  };
}

describe('humanizeDimension', () => {
  it('labels the HTTPRoute dimension as ALB', () => {
    expect(humanizeDimension('httproute_name')).toBe('ALB');
  });

  it('title-cases other dimensions', () => {
    expect(humanizeDimension('model_name')).toBe('Model Name');
  });
});

describe('toUsageView', () => {
  it('shows ALB display names in the ALB breakdown, falling back to the name', () => {
    const view = toUsageView(albResult(), undefined, [
      { name: 'storefront-x1y2', displayName: 'Storefront' },
      { name: 'api-a9b8', displayName: '' },
    ]);
    const meter = view?.groups[0].meters[0];

    expect(meter?.tabs).toEqual(['Total', 'Region', 'ALB']);
    const alb = meter?.breakdowns?.find((b) => b.dimension === 'httproute_name');
    expect(alb?.series.map((s) => s.groupValue)).toEqual(['Storefront', 'api-a9b8']);
  });

  it('lists meters without usage by name instead of as cards', () => {
    const group = toUsageView(albResult())?.groups[0];

    expect(group?.meters.map((m) => m.id)).toEqual(['alb-requests']);
    expect(group?.idleMeters.map((m) => m.label)).toEqual(['ALB Ingress']);
  });

  it('marks gauges with how their period value reads', () => {
    const result = albResult();
    result.meters[0].aggregation = 'Latest';

    expect(toUsageView(result)?.groups[0].meters[0].qualifier).toBe('latest');
  });

  it('has nothing to show when no meter has usage', () => {
    const result = albResult();
    result.meters = result.meters.map((m) => ({ ...m, values: [], total: 0 }));

    expect(toUsageView(result)).toBeNull();
  });

  it('carries spend through for the header, cards and table', () => {
    const result = albResult();
    result.spend = { amount: 4.2, currency: 'USD' };
    result.meters[0].spend = { amount: 4.2, currency: 'USD' };

    const view = toUsageView(result);
    expect(view?.spend).toEqual({ amount: 4.2, currency: 'USD' });
    expect(view?.groups[0].meters[0].spend).toEqual({ amount: 4.2, currency: 'USD' });
    expect(view?.summaryRows[0].spend).toEqual({ amount: 4.2, currency: 'USD' });
  });
});
