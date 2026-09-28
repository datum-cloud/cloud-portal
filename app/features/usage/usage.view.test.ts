import { humanizeDimension, toUsageView } from './usage.view';
import type { UsageFetchResult } from '@/modules/billing/usage.types';
import { describe, expect, it } from 'bun:test';

const points = [{ timestamp: 1, value: 5 }];

function albResult(): UsageFetchResult {
  return {
    status: 'ok',
    days: 30,
    groups: [{ id: 'networking', title: 'Networking', meterApiNames: ['alb-requests'] }],
    meters: [
      {
        meterApiName: 'alb-requests',
        label: 'ALB Requests',
        values: points,
        breakdowns: [
          { dimension: 'region', series: [{ groupValue: 'us-east-1', values: points }] },
          {
            dimension: 'httproute_name',
            series: [
              { groupValue: 'storefront-x1y2', values: points },
              { groupValue: 'api-a9b8', values: points },
            ],
          },
        ],
      },
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
});
