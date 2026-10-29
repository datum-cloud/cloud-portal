/// <reference types="bun-types/test" />
import {
  createO11yMetricsService,
  O11Y_METRICS_QUERY_PATH,
  O11Y_METRICS_QUERY_RANGE_PATH,
} from './o11y-metrics.service';
import type {
  PrometheusInstantResponse,
  PrometheusRangeResponse,
} from '@/modules/prometheus/types';
import { AppError, ValidationError } from '@/utils/errors';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const getSpy = mock();
const postSpy = mock();

// `mock.module` is process-global in bun. Keep these replacements faithful to
// the real modules (and identical to the o11y-logs suite) so other suites still
// see org/user scoped bases and a logger surface. Do not mock the shared
// control-plane client: that strips `getConfig` and breaks `getOrgScopedBase`.
mock.module('@/resources/base/utils', () => ({
  getProjectScopedBase: (id: string) =>
    `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${id}/control-plane`,
  getOrgScopedBase: (id: string) =>
    `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${id}/control-plane`,
  getUserScopedBase: () => `/apis/iam.miloapis.com/v1alpha1/users/me/control-plane`,
}));

mock.module('@/utils/errors/error-mapper', () => ({
  mapApiError: (e: unknown) => e,
}));

mock.module('@/modules/logger', () => ({
  logger: {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    request: mock(() => {}),
    api: mock(() => {}),
    service: mock(() => {}),
  },
}));

beforeEach(() => {
  getSpy.mockReset();
  postSpy.mockReset();
});

const PROJECT_BASE = '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj-a/control-plane';

const vectorResponse: PrometheusInstantResponse = {
  status: 'success',
  data: {
    resultType: 'vector',
    result: [{ metric: { region: 'us-east' }, value: [1700000000, '42'] }],
  },
};

const matrixResponse: PrometheusRangeResponse = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: { region: 'us-east' },
        values: [
          [1700000000, '1'],
          [1700000060, '2'],
        ],
      },
    ],
  },
};

interface RequestCall {
  url: string;
  baseURL: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  bodySerializer?: (body: Record<string, unknown>) => string;
  query?: Record<string, unknown>;
}

const lastCall = (spy: ReturnType<typeof mock>): RequestCall =>
  spy.mock.calls[spy.mock.calls.length - 1][0] as RequestCall;

const service = () => createO11yMetricsService({ client: { get: getSpy, post: postSpy } });

describe('O11yMetricsService.query', () => {
  it('POSTs a form-encoded instant query to the project-scoped path', async () => {
    postSpy.mockResolvedValueOnce({ data: vectorResponse });

    const result = await service().query({
      projectId: 'proj-a',
      query: 'sum(rate(envoy_requests_total[5m]))',
      time: 1700000000,
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    const call = lastCall(postSpy);
    expect(call.url).toBe(O11Y_METRICS_QUERY_PATH);
    expect(call.baseURL).toBe(PROJECT_BASE);
    expect(call.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(call.bodySerializer?.(call.body ?? {})).toBe(
      'query=sum%28rate%28envoy_requests_total%5B5m%5D%29%29&time=1700000000'
    );
    expect(result).toEqual(vectorResponse);
  });

  it('leaves time out of the body when it is not set', async () => {
    postSpy.mockResolvedValueOnce({ data: vectorResponse });

    await service().query({ projectId: 'proj-a', query: 'up' });

    const call = lastCall(postSpy);
    expect(call.bodySerializer?.(call.body ?? {})).toBe('query=up');
  });
});

describe('O11yMetricsService.queryRange', () => {
  it('POSTs a form-encoded range query to the project-scoped path', async () => {
    postSpy.mockResolvedValueOnce({ data: matrixResponse });

    const result = await service().queryRange({
      projectId: 'proj-a',
      query: 'up',
      start: 1700000000,
      end: 1700003600,
      step: '1m',
    });

    const call = lastCall(postSpy);
    expect(call.url).toBe(O11Y_METRICS_QUERY_RANGE_PATH);
    expect(call.baseURL).toBe(PROJECT_BASE);
    expect(call.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(call.bodySerializer?.(call.body ?? {})).toBe(
      'query=up&start=1700000000&end=1700003600&step=1m'
    );
    expect(result).toEqual(matrixResponse);
  });
});

describe('O11yMetricsService.labelValues', () => {
  it('GETs label values with a match[] selector', async () => {
    getSpy.mockResolvedValueOnce({ data: { status: 'success', data: ['us-east', 'eu-west'] } });

    const values = await service().labelValues({
      projectId: 'proj-a',
      label: 'region',
      match: '{job="envoy"}',
    });

    const call = lastCall(getSpy);
    expect(call.url).toBe('/apis/o11y.miloapis.com/v1alpha1/metrics/api/v1/label/region/values');
    expect(call.baseURL).toBe(PROJECT_BASE);
    expect(call.query).toEqual({ 'match[]': '{job="envoy"}' });
    expect(values).toEqual(['us-east', 'eu-west']);
  });

  it('sends no query params without a selector and defaults missing data to []', async () => {
    getSpy.mockResolvedValueOnce({ data: { status: 'success' } });

    const values = await service().labelValues({ projectId: 'proj-a', label: 'region' });

    expect(lastCall(getSpy).query).toBeUndefined();
    expect(values).toEqual([]);
  });

  it('encodes the label name into the path', async () => {
    getSpy.mockResolvedValueOnce({ data: { status: 'success', data: [] } });

    await service().labelValues({ projectId: 'proj-a', label: 'a/b' });

    expect(lastCall(getSpy).url).toBe(
      '/apis/o11y.miloapis.com/v1alpha1/metrics/api/v1/label/a%2Fb/values'
    );
  });
});

describe('O11yMetricsService errors', () => {
  it('throws ValidationError when the Prometheus envelope is an error', async () => {
    postSpy.mockResolvedValueOnce({
      data: { status: 'error', errorType: 'bad_data', error: 'parse error' },
    });

    const promise = service().query({ projectId: 'proj-a', query: 'sum(' });

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
    await expect(promise).rejects.toThrow('parse error');
  });

  it.each([401, 403, 422, 503])(
    'keeps HTTP status %d on errors from the client',
    async (status) => {
      postSpy.mockRejectedValueOnce(new AppError(`upstream ${status}`, { status }));

      const error = await service()
        .queryRange({ projectId: 'proj-a', query: 'up', start: 1, end: 2, step: '15s' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(status);
    }
  );
});
