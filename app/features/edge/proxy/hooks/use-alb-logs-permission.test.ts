/// <reference types="bun-types/test" />
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

type Call = [string, string, Record<string, unknown>];
let calls: Call[] = [];
let allowed: (resource: string, verb: string, options: Record<string, unknown>) => boolean;

const actualRbac = await import('@/modules/rbac');
const realRbac = { ...actualRbac };

mock.module('@/modules/rbac', () => ({
  ...realRbac,
  usePermission: (resource: string, verb: string, options: Record<string, unknown> = {}) => {
    calls.push([resource, verb, options]);
    return {
      hasPermission: allowed(resource, verb, options),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: () => {},
    };
  },
}));

const { useAlbLogsPermission } = await import('./use-alb-logs-permission');

afterAll(() => {
  mock.module('@/modules/rbac', () => realRbac);
});

beforeEach(() => {
  calls = [];
  allowed = () => true;
});

describe('useAlbLogsPermission', () => {
  test('asks the aggregator hop exactly what the log query request is asked', () => {
    useAlbLogsPermission();
    expect(calls).toContainEqual([
      'logs',
      'get',
      expect.objectContaining({
        group: 'o11y.miloapis.com',
        subresource: 'api',
        name: 'loki',
        namespace: '',
        scope: 'project',
      }),
    ]);
  });

  test("asks queryapi's own logs.query review, with no name or subresource", () => {
    useAlbLogsPermission();
    const query = calls.find(([, verb]) => verb === 'query');
    expect(query?.[0]).toBe('logs');
    expect(query?.[2]).toMatchObject({
      group: 'o11y.miloapis.com',
      namespace: '',
      scope: 'project',
    });
    expect(query?.[2].subresource).toBeUndefined();
    expect(query?.[2].name).toBeUndefined();
  });

  test('hides the panel for a role holding only the old logs.get', () => {
    allowed = (_r, verb, options) => verb === 'get' && options.subresource === undefined;
    expect(useAlbLogsPermission().hasPermission).toBe(false);
  });

  test('hides the panel when either hop would refuse the query', () => {
    allowed = (_r, verb) => verb !== 'query';
    expect(useAlbLogsPermission().hasPermission).toBe(false);
    allowed = (_r, verb, options) => verb === 'query' || options.subresource !== 'api';
    expect(useAlbLogsPermission().hasPermission).toBe(false);
  });

  test('shows the panel when both hops allow the query', () => {
    allowed = (_r, verb, options) =>
      verb === 'query' || (options.subresource === 'api' && options.name === 'loki');
    expect(useAlbLogsPermission().hasPermission).toBe(true);
  });
});
