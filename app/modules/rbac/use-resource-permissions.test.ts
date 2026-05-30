/// <reference types="bun-types/test" />
import { buildChecks, flagNameFor } from './use-resource-permissions';
import { describe, expect, test } from 'bun:test';

describe('flagNameFor', () => {
  test('primary verbs map to canList / canCreate / canPatch / canDelete', () => {
    expect(flagNameFor({ scope: 'primary', verb: 'list' })).toBe('canList');
    expect(flagNameFor({ scope: 'primary', verb: 'create' })).toBe('canCreate');
    expect(flagNameFor({ scope: 'primary', verb: 'patch' })).toBe('canPatch');
    expect(flagNameFor({ scope: 'primary', verb: 'delete' })).toBe('canDelete');
    expect(flagNameFor({ scope: 'primary', verb: 'get' })).toBe('canGet');
  });

  test('sub-resource verbs use prefix + capitalized alias', () => {
    expect(flagNameFor({ scope: 'sub', verb: 'list', alias: 'waf' })).toBe('canViewWaf');
    expect(flagNameFor({ scope: 'sub', verb: 'get', alias: 'waf' })).toBe('canViewWaf');
    expect(flagNameFor({ scope: 'sub', verb: 'patch', alias: 'waf' })).toBe('canEditWaf');
    expect(flagNameFor({ scope: 'sub', verb: 'update', alias: 'waf' })).toBe('canEditWaf');
    expect(flagNameFor({ scope: 'sub', verb: 'create', alias: 'waf' })).toBe('canCreateWaf');
    expect(flagNameFor({ scope: 'sub', verb: 'delete', alias: 'waf' })).toBe('canDeleteWaf');
  });

  test('sub-resource alias is capitalized first letter only', () => {
    expect(flagNameFor({ scope: 'sub', verb: 'list', alias: 'fooBar' })).toBe('canViewFooBar');
  });

  test('sub-resource verbs without a mapping fall back to capitalized verb + alias', () => {
    expect(flagNameFor({ scope: 'sub', verb: 'watch', alias: 'waf' })).toBe('canWatchWaf');
  });
});

describe('buildChecks', () => {
  test('returns one check per primary verb', () => {
    const checks = buildChecks({
      resource: 'httpproxies',
      group: 'networking.datumapis.com',
      scope: 'project',
      verbs: ['list', 'create', 'delete'],
    });

    expect(checks).toHaveLength(3);
    expect(checks[0]).toMatchObject({
      resource: 'httpproxies',
      verb: 'list',
      group: 'networking.datumapis.com',
      scope: 'project',
    });
    expect(checks[1].verb).toBe('create');
    expect(checks[2].verb).toBe('delete');
  });

  test('includes sub-resource checks with their own resource and group', () => {
    const checks = buildChecks({
      resource: 'httpproxies',
      group: 'networking.datumapis.com',
      scope: 'project',
      verbs: ['list'],
      subResources: [
        {
          resource: 'trafficprotectionpolicies',
          group: 'networking.datumapis.com',
          scope: 'project',
          alias: 'waf',
          verbs: ['list', 'patch'],
        },
      ],
    });

    expect(checks).toHaveLength(3);
    expect(checks[2]).toMatchObject({ resource: 'trafficprotectionpolicies', verb: 'patch' });
  });

  test('forwards namespace and scope onto every check', () => {
    const checks = buildChecks({
      resource: 'httpproxies',
      group: 'networking.datumapis.com',
      namespace: 'default',
      scope: 'project',
      verbs: ['list'],
    });

    expect(checks[0]).toMatchObject({ namespace: 'default', scope: 'project' });
  });
});
