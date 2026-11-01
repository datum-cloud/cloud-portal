import {
  bulkCheckResults,
  checkResult,
  denyCookieValue,
  E2E_DENY_COOKIE,
  isDenied,
  readBulkChecks,
} from './deny-permissions';
import {
  E2E_DENY_COOKIE as SERVER_COOKIE,
  parseE2eDenyCookie,
} from '@/modules/rbac/server/e2e-deny.server';
import { describe, expect, it } from 'bun:test';

describe('deny-permissions', () => {
  it('uses the cookie name the server hook reads', () => {
    expect(E2E_DENY_COOKIE).toBe(SERVER_COOKIE);
  });

  it('writes a cookie value the server hook parses back to the same list', () => {
    const value = denyCookieValue(['projects:create', 'iam.miloapis.com:groups:list']);
    expect(value).not.toContain(',');
    expect([...parseE2eDenyCookie(`_session=x; ${E2E_DENY_COOKIE}=${value}`)]).toEqual([
      'projects:create',
      'iam.miloapis.com:groups:list',
    ]);
  });

  it('matches resource:verb in any group and group:resource:verb in that group only', () => {
    const denied = new Set(['projects:create', 'iam.miloapis.com:groups:list']);
    expect(isDenied(denied, { resource: 'projects', verb: 'create', group: 'x.io' })).toBe(true);
    expect(isDenied(denied, { resource: 'groups', verb: 'list', group: 'iam.miloapis.com' })).toBe(
      true
    );
    expect(isDenied(denied, { resource: 'groups', verb: 'list', group: 'other.io' })).toBe(false);
    expect(isDenied(denied, { resource: 'projects', verb: 'list' })).toBe(false);
  });

  it('answers a single check', () => {
    const denied = new Set(['secrets:get']);
    expect(checkResult(denied, { resource: 'secrets', verb: 'get' })).toEqual({
      allowed: false,
      denied: true,
    });
    expect(checkResult(denied, { resource: 'secrets', verb: 'list' })).toEqual({
      allowed: true,
      denied: false,
    });
  });

  it('answers a bulk check in order and echoes each request', () => {
    const results = bulkCheckResults(new Set(['domains:create']), [
      { resource: 'domains', verb: 'list', namespace: 'default' },
      { resource: 'domains', verb: 'create', group: 'networking.datumapis.com' },
    ]);
    expect(results).toEqual([
      {
        allowed: true,
        denied: false,
        request: { resource: 'domains', verb: 'list', group: '', namespace: 'default' },
      },
      {
        allowed: false,
        denied: true,
        request: { resource: 'domains', verb: 'create', group: 'networking.datumapis.com' },
      },
    ]);
  });

  it('reads checks from a bulk-check body and tolerates bad bodies', () => {
    expect(readBulkChecks({ checks: [{ resource: 'a', verb: 'get' }] })).toHaveLength(1);
    expect(readBulkChecks({ checks: 'nope' })).toEqual([]);
    expect(readBulkChecks(null)).toEqual([]);
    expect(readBulkChecks('x')).toEqual([]);
  });
});
