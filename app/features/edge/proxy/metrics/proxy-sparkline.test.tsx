// @vitest-environment jsdom
import { ProxyRequestRatesProvider } from './proxy-request-rates';
import { ProxySparkline } from './proxy-sparkline';
import type { PrometheusAPIRequest } from '@/modules/metrics/utils/prometheus-request';
import type { FormattedMetricData } from '@/modules/prometheus';
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

vi.mock('@datum-cloud/datum-ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart">{children}</div>
  ),
  ChartTooltip: () => null,
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
}));

vi.mock('@datum-cloud/datum-ui/icons', () => ({
  SpinnerIcon: () => <div data-testid="spinner" />,
}));

const T0 = Date.parse('2026-01-01T12:00:00Z');
const ONE_HOUR_MS = 60 * 60 * 1000;
const POLL_MS = 30_000;

function chartDataFor(request: PrometheusAPIRequest): FormattedMetricData {
  const range = request.timeRange as { start: Date; end: Date };
  return {
    series: [
      {
        name: 'alb-a',
        labels: { gateway_name: 'alb-a' },
        data: [
          {
            timestamp: range.end.getTime(),
            value: 1,
            formattedTime: range.end.toISOString(),
            labels: { gateway_name: 'alb-a' },
          },
        ],
      },
    ],
    timeRange: { start: range.start.getTime(), end: range.end.getTime() },
  };
}

describe('ProxySparkline', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let requests: PrometheusAPIRequest[];
  let resolvePending: Array<() => void>;

  beforeEach(async () => {
    requests = [];
    resolvePending = [];
    executeMock.mockReset();
    executeMock.mockImplementation((request: PrometheusAPIRequest) => {
      requests.push(request);
      if (requests.length === 1) {
        return Promise.resolve(chartDataFor(request));
      }
      return new Promise<FormattedMetricData>((resolve) => {
        resolvePending.push(() => resolve(chartDataFor(request)));
      });
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(T0));
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProxyRequestRatesProvider projectId="project-a">
            <ProxySparkline proxyId="alb-a" />
            <ProxySparkline proxyId="alb-idle" />
          </ProxyRequestRatesProvider>
        </QueryClientProvider>
      );
      await Promise.resolve();
    });
    // Let the first window's query resolve and render.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
    vi.useRealTimers();
  });

  it('advances the one-hour window and keeps the chart while the next window loads', async () => {
    // Two rows, one request: the page asks once and each row reads its series.
    expect(requests).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="chart"]')).toHaveLength(1);
    expect(container.textContent).toContain('No data');

    const first = requests[0];
    const firstRange = first.timeRange as { start: Date; end: Date };
    expect(firstRange.end.getTime()).toBe(T0);
    expect(firstRange.start.getTime()).toBe(T0 - ONE_HOUR_MS);
    expect(container.querySelector('[data-testid="chart"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="spinner"]')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(POLL_MS);
      await Promise.resolve();
    });

    // The tick moved the window forward and started fetching it.
    const latest = requests.at(-1)!;
    const latestRange = latest.timeRange as { start: Date; end: Date };
    expect(latestRange.end.getTime()).toBe(T0 + POLL_MS);
    expect(latestRange.start.getTime()).toBe(T0 + POLL_MS - ONE_HOUR_MS);
    expect(queryClient.isFetching()).toBeGreaterThan(0);

    // The previous window stays on screen instead of the loading state.
    expect(container.querySelector('[data-testid="chart"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="spinner"]')).toBeNull();

    await act(async () => {
      resolvePending.splice(0).forEach((resolve) => resolve());
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="chart"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="spinner"]')).toBeNull();
  });
});
