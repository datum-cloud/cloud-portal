/// <reference types="bun-types/test" />
import { BulkPermissionCheckSchema, PermissionCheckSchema } from './types';
import { describe, expect, test } from 'bun:test';

describe('PermissionCheckSchema', () => {
  const logsApi = {
    organizationId: 'acme',
    resource: 'logs',
    subresource: 'api',
    name: 'loki',
    verb: 'get',
    group: 'o11y.miloapis.com',
    namespace: '',
    scope: 'project',
    projectId: 'proj-1',
  };

  test('keeps the subresource instead of stripping it at the BFF boundary', () => {
    expect(PermissionCheckSchema.parse(logsApi)).toMatchObject({ subresource: 'api' });
  });

  test('keeps the subresource on bulk checks', () => {
    const { organizationId, ...check } = logsApi;
    const parsed = BulkPermissionCheckSchema.parse({ organizationId, checks: [check] });
    expect(parsed.checks[0]).toMatchObject({ subresource: 'api' });
  });

  test("accepts a service-defined verb such as queryapi's logs.query", () => {
    const parsed = PermissionCheckSchema.safeParse({
      ...logsApi,
      subresource: undefined,
      name: undefined,
      verb: 'query',
    });
    expect(parsed.success).toBe(true);
  });
});
