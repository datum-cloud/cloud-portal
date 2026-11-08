// @vitest-environment jsdom
import { ProxySparkline } from './proxy-sparkline';
import type { PrometheusAPIRequest } from '@/modules/metrics/utils/prometheus-request';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { calls, mockQuery } = vi.hoisted(() => {
  const calls: Array<{ queryKey: readonly unknown[]; request: PrometheusAPIRequest }> = [];
  const mockQuery = vi.fn((queryKey: readonly unknown[], request: PrometheusAPIRequest) => {
    calls.push({ queryKey, request });
    return { data: undefined, isLoading: false, error: null };
  });
  return { calls, mockQuery };
});

vi.mock('@/modules/metrics/hooks', () => ({ usePrometheusAPIQuery: mockQuery }));

const T0 = Date.parse('2026-01-01T12:00:00Z');
const ONE_HOUR_MS = 60 * 60 * 1000;
const POLL_MS = 30_000;

describe('ProxySparkline', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    calls.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(T0));
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<ProxySparkline projectId="project-a" proxyId="alb-a" />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('advances the one-hour window and query key on each poll', () => {
    const first = calls.at(-1)!;
    const firstRange = first.request.timeRange as { start: Date; end: Date };
    expect(firstRange.end.getTime()).toBe(T0);
    expect(firstRange.start.getTime()).toBe(T0 - ONE_HOUR_MS);

    act(() => {
      vi.advanceTimersByTime(POLL_MS);
    });

    const second = calls.at(-1)!;
    const secondRange = second.request.timeRange as { start: Date; end: Date };
    expect(secondRange.end.getTime()).toBe(T0 + POLL_MS);
    expect(secondRange.start.getTime()).toBe(T0 + POLL_MS - ONE_HOUR_MS);
    expect(second.queryKey).not.toEqual(first.queryKey);
    expect(second.queryKey.at(-1)).toBe(T0 + POLL_MS);
  });
});
