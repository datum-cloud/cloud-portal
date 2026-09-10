/// <reference types="bun-types/test" />
import { createO11yLogService, O11Y_LOGS_QUERY_RANGE_PATH } from './o11y-log.service';
import { ValidationError } from '@/utils/errors';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const getSpy = mock();

// `mock.module` is process-global in bun. Keep these replacements faithful to
// the real modules so other suites (RBAC in particular) still see org/user
// scoped bases and a logger surface. Do not mock the shared control-plane
// client: that strips `getConfig` and breaks `getOrgScopedBase`.
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
