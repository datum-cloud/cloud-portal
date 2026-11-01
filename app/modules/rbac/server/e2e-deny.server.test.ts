/// <reference types="bun-types/test" />
import {
  E2E_DENY_REASON,
  isE2eDenyActive,
  isForcedE2eDeny,
  matchesE2eDeny,
  parseE2eDenyCookie,
} from './e2e-deny.server';
import { RbacService } from './rbac.service';
import { withRequestContext } from '@/modules/axios/request-context';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const TEST_ENV = { CYPRESS: 'true', NODE_ENV: 'test' };

describe('isE2eDenyActive', () => {
  test('is active in a Cypress run outside production', () => {
    expect(isE2eDenyActive(TEST_ENV)).toBe(true);
    expect(isE2eDenyActive({ CYPRESS: 'true', NODE_ENV: undefined })).toBe(true);
  });

  test('is inactive in production even when CYPRESS is set', () => {
    expect(isE2eDenyActive({ CYPRESS: 'true', NODE_ENV: 'production' })).toBe(false);
  });

  test('is inactive without CYPRESS=true', () => {
    expect(isE2eDenyActive({ NODE_ENV: 'test' })).toBe(false);
    expect(isE2eDenyActive({ CYPRESS: '1', NODE_ENV: 'test' })).toBe(false);
    expect(isE2eDenyActive({ CYPRESS: 'TRUE', NODE_ENV: 'development' })).toBe(false);
  });
});

describe('parseE2eDenyCookie', () => {
  test('reads a URI-encoded list among other cookies', () => {
    const header = `_session=abc; e2e-deny=${encodeURIComponent('projects:create, groups:list')}; x=1`;
    expect([...parseE2eDenyCookie(header)]).toEqual(['projects:create', 'groups:list']);
  });

  test('reads an unencoded list', () => {
    expect([...parseE2eDenyCookie('e2e-deny=secrets:get')]).toEqual(['secrets:get']);
  });

  test('returns an empty list when the cookie is absent, empty or malformed', () => {
    expect(parseE2eDenyCookie(null).size).toBe(0);
    expect(parseE2eDenyCookie('_session=abc').size).toBe(0);
    expect(parseE2eDenyCookie('e2e-deny=').size).toBe(0);
    expect(parseE2eDenyCookie('e2e-deny=%E0%A4%A').size).toBe(0);
    expect(parseE2eDenyCookie('not-e2e-deny=projects:get').size).toBe(0);
  });
});

describe('matchesE2eDeny', () => {
  const denied = new Set(['projects:create', 'iam.miloapis.com:groups:list']);

  test('matches resource:verb regardless of group', () => {
    expect(matchesE2eDeny(denied, { resource: 'projects', verb: 'create' })).toBe(true);
    expect(
      matchesE2eDeny(denied, {
        resource: 'projects',
        verb: 'create',
        group: 'resourcemanager.miloapis.com',
      })
    ).toBe(true);
  });

  test('matches group:resource:verb only for that group', () => {
    expect(
      matchesE2eDeny(denied, { resource: 'groups', verb: 'list', group: 'iam.miloapis.com' })
    ).toBe(true);
    expect(matchesE2eDeny(denied, { resource: 'groups', verb: 'list', group: 'other.io' })).toBe(
      false
    );
    expect(matchesE2eDeny(denied, { resource: 'groups', verb: 'list' })).toBe(false);
  });

  test('does not match another verb or resource', () => {
    expect(matchesE2eDeny(denied, { resource: 'projects', verb: 'get' })).toBe(false);
    expect(matchesE2eDeny(denied, { resource: 'secrets', verb: 'create' })).toBe(false);
  });
});

describe('isForcedE2eDeny', () => {
  const check = { resource: 'projects', verb: 'create' };
  const cookie = 'e2e-deny=projects:create';

  test('forces a deny for a listed pair in a test run', () => {
    expect(isForcedE2eDeny(check, cookie, TEST_ENV)).toBe(true);
  });

  test('ignores the cookie in production', () => {
    expect(isForcedE2eDeny(check, cookie, { CYPRESS: 'true', NODE_ENV: 'production' })).toBe(false);
  });

  test('ignores the cookie outside Cypress', () => {
    expect(isForcedE2eDeny(check, cookie, { NODE_ENV: 'test' })).toBe(false);
  });
});

describe('RbacService with the e2e-deny hook', () => {
  const saved = { CYPRESS: process.env.CYPRESS, NODE_ENV: process.env.NODE_ENV };

  function restore(key: 'CYPRESS' | 'NODE_ENV'): void {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }

  beforeEach(() => {
    process.env.CYPRESS = 'true';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    restore('CYPRESS');
    restore('NODE_ENV');
  });

  function inRequest<T>(cookieHeader: string | null, fn: () => T): T {
    return withRequestContext({ requestId: 'req-1', token: 't', cookieHeader }, fn);
  }

  test('checkPermission short-circuits a listed pair without calling upstream', async () => {
    const create = mock(async () => ({ allowed: true, denied: false }));
    const svc = new RbacService(() => ({ create }) as never);

    const result = await inRequest('e2e-deny=secrets:get', () =>
      svc.checkPermission('acme', { resource: 'secrets', verb: 'get' })
    );

    expect(result).toEqual({ allowed: false, denied: true, reason: E2E_DENY_REASON });
    expect(create).not.toHaveBeenCalled();
  });

  test('checkPermission leaves an unlisted pair to the real decision', async () => {
    const create = mock(async () => ({ allowed: true, denied: false }));
    const svc = new RbacService(() => ({ create }) as never);

    const result = await inRequest('e2e-deny=secrets:get', () =>
      svc.checkPermission('acme', { resource: 'secrets', verb: 'list' })
    );

    expect(result).toEqual({ allowed: true, denied: false, reason: undefined });
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('checkPermissions denies only the listed items', async () => {
    const create = mock(async () => ({ allowed: true, denied: false }));
    const svc = new RbacService(() => ({ create }) as never);

    const results = await inRequest('e2e-deny=projects:create', () =>
      svc.checkPermissions('acme', [
        { resource: 'projects', verb: 'create' },
        { resource: 'projects', verb: 'list' },
      ])
    );

    expect(results.map((r) => r.allowed)).toEqual([false, true]);
    expect(results[0].reason).toBe(E2E_DENY_REASON);
    expect(results[0].request.resource).toBe('projects');
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('a production build ignores the cookie', async () => {
    process.env.NODE_ENV = 'production';
    const create = mock(async () => ({ allowed: true, denied: false }));
    const svc = new RbacService(() => ({ create }) as never);

    const result = await inRequest('e2e-deny=secrets:get', () =>
      svc.checkPermission('acme', { resource: 'secrets', verb: 'get' })
    );

    expect(result.allowed).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
