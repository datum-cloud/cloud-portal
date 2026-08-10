/// <reference types="bun-types/test" />
import { BulkPermissionCheckSchema, PermissionCheckSchema } from './types';
import { describe, expect, test } from 'bun:test';

describe('PermissionCheckSchema', () => {
  test('rejects a project-scoped check without projectId', () => {
    // Regression: this payload used to pass validation, reach RbacService,
    // and trip the server-side projectId invariant (error-logged to Sentry).
    const parsed = PermissionCheckSchema.safeParse({
      organizationId: 'acme',
      resource: 'dnsrecordsets',
      verb: 'list',
      scope: 'project',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'projectId is required when scope is "project"'
      );
    }
  });

  test('accepts a project-scoped check with projectId', () => {
    const parsed = PermissionCheckSchema.safeParse({
      organizationId: 'acme',
      resource: 'dnsrecordsets',
      verb: 'list',
      scope: 'project',
      projectId: 'proj-1',
    });
    expect(parsed.success).toBe(true);
  });

  test('accepts org/user/unscoped checks without projectId', () => {
    for (const scope of ['org', 'user', undefined] as const) {
      const parsed = PermissionCheckSchema.safeParse({
        organizationId: 'acme',
        resource: 'secrets',
        verb: 'get',
        ...(scope ? { scope } : {}),
      });
      expect(parsed.success).toBe(true);
    }
  });
});

describe('BulkPermissionCheckSchema', () => {
  test('rejects a batch containing a project-scoped check without projectId', () => {
    const parsed = BulkPermissionCheckSchema.safeParse({
      organizationId: 'acme',
      checks: [
        { resource: 'secrets', verb: 'get', scope: 'org' },
        { resource: 'dnsrecordsets', verb: 'list', scope: 'project' },
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'projectId is required when scope is "project"'
      );
    }
  });

  test('accepts a batch where every project-scoped check carries projectId', () => {
    const parsed = BulkPermissionCheckSchema.safeParse({
      organizationId: 'acme',
      checks: [
        { resource: 'secrets', verb: 'get', scope: 'org' },
        { resource: 'dnsrecordsets', verb: 'list', scope: 'project', projectId: 'proj-1' },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
