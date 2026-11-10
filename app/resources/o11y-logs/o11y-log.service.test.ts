import { createO11yLogService, O11Y_LOGS_QUERY_RANGE_PATH } from './o11y-log.service';
import { ValidationError } from '@/utils/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSpy = vi.fn();

// Keep these replacements faithful to the real modules. Do not mock the shared
// control-plane client: that strips `getConfig` and breaks `getOrgScopedBase`.
vi.mock('@/resources/base/utils', () => ({
  getProjectScopedBase: (id: string) =>
    `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${id}/control-plane`,
  getOrgScopedBase: (id: string) =>
    `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${id}/control-plane`,
  getUserScopedBase: () => `/apis/iam.miloapis.com/v1alpha1/users/me/control-plane`,
}));

vi.mock('@/utils/errors/error-mapper', () => ({
  mapApiError: (e: unknown) => e,
}));

vi.mock('@/modules/logger', () => ({
  logger: {
    debug: vi.fn(() => {}),
    info: vi.fn(() => {}),
    warn: vi.fn(() => {}),
    error: vi.fn(() => {}),
    request: vi.fn(() => {}),
    api: vi.fn(() => {}),
    service: vi.fn(() => {}),
  },
}));

beforeEach(() => {
  getSpy.mockReset();
});

const streamResponse = {
  status: 'success' as const,
  data: {
    resultType: 'streams' as const,
    result: [
      {
        stream: { resource_name: 'gw-1', service_name: 'envoy-gateway', severity: 'INFO' },
        values: [['1700000000000000000', 'GET /healthz 200 12ms upstream=gw-1']],
      },
    ],
  },
};

describe('O11yLogService.queryRange', () => {
  const service = () => createO11yLogService({ client: { get: getSpy } });

  it('GETs the project-scoped Loki query_range path', async () => {
    getSpy.mockResolvedValueOnce({ data: streamResponse });

    const entries = await service().queryRange({
      projectId: 'proj-a',
      query: '{resource_name="gw-1"}',
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-01T00:30:00.000Z',
      limit: 50,
    });

    expect(getSpy).toHaveBeenCalledTimes(1);
    const call = getSpy.mock.calls[0][0] as {
      url: string;
      baseURL: string;
      query: Record<string, unknown>;
    };
    expect(call.url).toBe(O11Y_LOGS_QUERY_RANGE_PATH);
    expect(call.baseURL).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj-a/control-plane'
    );
    expect(call.query).toEqual({
      query: '{resource_name="gw-1"}',
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-01T00:30:00.000Z',
      limit: 50,
      direction: 'backward',
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.line).toBe('GET /healthz 200 12ms upstream=gw-1');
    expect(entries[0]?.labels).toEqual({});
  });

  it('throws ValidationError when the Loki envelope is an error', async () => {
    getSpy.mockResolvedValueOnce({
      data: { status: 'error', error: 'logql: empty query' },
    });

    await expect(
      service().queryRange({
        projectId: 'proj-a',
        query: '{}',
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-01T00:30:00.000Z',
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('O11yLogService.labelValues', () => {
  const service = () => createO11yLogService({ client: { get: getSpy } });

  it('GETs the label values path scoped by the selector and window', async () => {
    getSpy.mockResolvedValueOnce({ data: { status: 'success', data: ['GET', 'POST', ''] } });

    const values = await service().labelValues({
      projectId: 'proj-a',
      name: 'method',
      query: '{route_name=~"httproute/[^/]+/alb-1/.*"}',
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-01T00:30:00.000Z',
    });

    expect(values).toEqual(['GET', 'POST']);
    expect(getSpy).toHaveBeenCalledWith({
      url: '/apis/o11y.miloapis.com/v1alpha1/logs/loki/api/v1/label/method/values',
      baseURL: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj-a/control-plane',
      query: {
        query: '{route_name=~"httproute/[^/]+/alb-1/.*"}',
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-01T00:30:00.000Z',
      },
    });
  });

  it('throws a ValidationError for an error envelope', async () => {
    getSpy.mockResolvedValueOnce({ data: { status: 'error', error: 'bad selector' } });
    await expect(
      service().labelValues({ projectId: 'p', name: 'method', start: 'a', end: 'b' })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('O11yLogService.countByLabels', () => {
  const service = () => createO11yLogService({ client: { get: getSpy } });

  it('GETs the instant query path and reads the vector', async () => {
    getSpy.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            { metric: { method: 'GET' }, value: [1704069000, '12'] },
            { metric: {}, value: [1704069000, '3'] },
            { metric: { method: 'PUT' }, value: [1704069000, '0'] },
          ],
        },
      },
    });

    const query =
      'sum by (method) (count_over_time({route_name=~"httproute/[^/]+/alb-1/.*"} [1800s]))';
    const groups = await service().countByLabels({
      projectId: 'proj-a',
      query,
      time: '2024-01-01T00:30:00.000Z',
    });

    expect(groups).toEqual([
      { labels: { method: 'GET' }, count: 12 },
      { labels: {}, count: 3 },
    ]);
    expect(getSpy).toHaveBeenCalledWith({
      url: '/apis/o11y.miloapis.com/v1alpha1/logs/loki/api/v1/query',
      baseURL: '/apis/resourcemanager.miloapis.com/v1alpha1/projects/proj-a/control-plane',
      query: { query, time: '2024-01-01T00:30:00.000Z' },
    });
  });

  it('throws a ValidationError for an error envelope', async () => {
    getSpy.mockResolvedValueOnce({ data: { status: 'error', error: 'only sum(count_over_time' } });
    await expect(
      service().countByLabels({ projectId: 'p', query: 'x', time: 't' })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
