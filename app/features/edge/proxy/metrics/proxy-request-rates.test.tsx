// @vitest-environment jsdom
import {
  ProxyRequestRatesProvider,
  selectProxyRequestRate,
  useProxyRequestRate,
} from './proxy-request-rates';
import { albRpsByProxyQuery, albRpsQuery } from './queries';
import type { PrometheusAPIRequest } from '@/modules/metrics/utils/prometheus-request';
import {
  formatForChart,
  type FormattedMetricData,
  type PrometheusQueryResult,
} from '@/modules/prometheus';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock('@/modules/metrics/utils/prometheus-request', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/modules/metrics/utils/prometheus-request')>();
  return { ...actual, executePrometheusRequest: executeMock };
});

const RANGE = { start: 1_767_268_800, end: 1_767_272_400 };
const T1 = RANGE.start + 60;
const T2 = RANGE.start + 120;
const T3 = RANGE.start + 180;

type Sample = [number, string];

const matrix = (
  series: Array<{ labels: Record<string, string>; values: Sample[] }>
): PrometheusQueryResult => ({
  resultType: 'matrix',
  result: series.map(({ labels, values }) => ({ metric: labels, values })),
});

// What `sum(rate(...)) by (gateway_name)` returns for a project with three ALBs.
const BATCHED = formatForChart(
  matrix([
    {
      labels: { gateway_name: 'alb-a' },
      values: [
        [T1, '1.5'],
        [T2, '2.5'],
        [T3, '0.25'],
      ],
    },
    {
      labels: { gateway_name: 'alb-b' },
      values: [
        [T2, '4'],
        [T3, '8'],
      ],
    },
    { labels: { gateway_name: 'alb-other' }, values: [[T1, '100']] },
  ]),
  RANGE
);

/**
 * What the row's own query used to produce: `sum(rate(...))` with no grouping
 * returns one label-less series. Colour is the formatter's palette slot, which
 * no sparkline reads.
 */
function perRowResult(values: Sample[] | null): FormattedMetricData {
  const formatted = formatForChart(matrix(values ? [{ labels: {}, values }] : []), RANGE);
  return {
    ...formatted,
    series: formatted.series.map(({ color: _color, ...series }) => series),
  };
}

describe('albRpsByProxyQuery', () => {
  it('is the per-ALB query without the name matcher, grouped by name', () => {
    const perRow = albRpsQuery(
      { projectId: 'project-a', proxyId: 'alb-a', requireRegion: false },
      '1m'
    );
    expect(perRow).toBe(
      'sum(rate(envoy_vhost_vcluster_upstream_rq{resourcemanager_datumapis_com_project_name="project-a",gateway_name="alb-a",gateway_namespace="default"}[1m]))'
    );
    expect(albRpsByProxyQuery('project-a', '1m')).toBe(
      `${perRow.replace('gateway_name="alb-a",', '')} by (gateway_name)`
    );
  });
});

describe('selectProxyRequestRate', () => {
  it('gives an ALB row the series its own query returned', () => {
    expect(selectProxyRequestRate(BATCHED, ['alb-a'])).toEqual(
      perRowResult([
        [T1, '1.5'],
        [T2, '2.5'],
        [T3, '0.25'],
      ])
    );
    expect(selectProxyRequestRate(BATCHED, ['alb-b'])).toEqual(
      perRowResult([
        [T2, '4'],
        [T3, '8'],
      ])
    );
  });

  it('gives a connector row the sum across its ALBs, as sum() over both did', () => {
    // alb-b has no sample at T1, so Prometheus summed alb-a alone there.
    expect(selectProxyRequestRate(BATCHED, ['alb-b', 'alb-a'])).toEqual(
      perRowResult([
        [T1, '1.5'],
        [T2, '6.5'],
        [T3, '8.25'],
      ])
    );
  });

  it('ignores ALBs in a connector row that reported nothing', () => {
    expect(selectProxyRequestRate(BATCHED, ['alb-a', 'alb-idle'])).toEqual(
      selectProxyRequestRate(BATCHED, ['alb-a'])
    );
  });

  it('gives a row missing from the response the empty result its own query returned', () => {
    expect(selectProxyRequestRate(BATCHED, ['alb-idle'])).toEqual(perRowResult(null));
    expect(selectProxyRequestRate(BATCHED, ['alb-idle']).series).toHaveLength(0);
  });

  it('does not match an ALB whose name only contains the row name', () => {
    expect(selectProxyRequestRate(BATCHED, ['alb']).series).toHaveLength(0);
  });
});

function Row({ names }: { names: string[] }) {
  const { data, isLoading } = useProxyRequestRate(names);
  const values = data?.series[0]?.data.map((point) => point.value).join(',') ?? 'none';
  return <div data-row={names.join('+')}>{isLoading ? 'loading' : values}</div>;
}

describe('ProxyRequestRatesProvider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    executeMock.mockReset();
    executeMock.mockResolvedValue(BATCHED);
    // Frozen clock: the window end is part of the query key.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(RANGE.end * 1000));
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    container.remove();
    vi.useRealTimers();
  });

  async function render(enabled: boolean) {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProxyRequestRatesProvider projectId="project-a" enabled={enabled}>
            <Row names={['alb-a']} />
            <Row names={['alb-b']} />
            <Row names={['alb-a', 'alb-b']} />
            <Row names={['alb-idle']} />
            <Row names={[]} />
          </ProxyRequestRatesProvider>
        </QueryClientProvider>
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  const rowText = (key: string) => container.querySelector(`[data-row="${key}"]`)?.textContent;

  it('asks Prometheus once for the page, however many rows read it', async () => {
    await render(true);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const request = executeMock.mock.calls[0][0] as PrometheusAPIRequest;
    expect(request).toMatchObject({
      type: 'chart',
      projectId: 'project-a',
      query: albRpsByProxyQuery('project-a', '1m'),
      step: '1m',
    });

    expect(rowText('alb-a')).toBe('1.5,2.5,0.25');
    expect(rowText('alb-b')).toBe('4,8');
    expect(rowText('alb-a+alb-b')).toBe('1.5,6.5,8.25');
    expect(rowText('alb-idle')).toBe('none');
    expect(rowText('')).toBe('none');
  });

  it('asks nothing while the page has no row to chart', async () => {
    await render(false);

    expect(executeMock).not.toHaveBeenCalled();
    expect(rowText('alb-a')).toBe('none');
  });
});
