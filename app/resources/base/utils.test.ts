import { beforeEach, describe, expect, test, vi } from 'vitest';

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), service: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/modules/logger', () => ({ logger }));
vi.mock('@/modules/control-plane/shared/client.gen', () => ({
  client: { getConfig: () => ({}) },
}));

const { fanOutAcrossOrgs, ORG_FAN_OUT_CONCURRENCY } = await import('./utils');
const { AuthorizationError } = await import('@/utils/errors');

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));
const orgIds = Array.from({ length: 50 }, (_, i) => `org-${i}`);

/** Wraps `fn` and records the most calls that were ever in flight at once. */
function trackInFlight<T>(fn: (orgId: string) => Promise<T>) {
  const stats = { inFlight: 0, peak: 0 };
  const tracked = async (orgId: string) => {
    stats.inFlight += 1;
    stats.peak = Math.max(stats.peak, stats.inFlight);
    try {
      return await fn(orgId);
    } finally {
      stats.inFlight -= 1;
    }
  };
  return { tracked, stats };
}

describe('fanOutAcrossOrgs', () => {
  beforeEach(() => {
    logger.error.mockClear();
    logger.service.mockClear();
  });

  test('keeps at most the cap in flight across many orgs', async () => {
    const { tracked, stats } = trackInFlight(async (orgId) => {
      await tick();
      return [orgId];
    });

    await fanOutAcrossOrgs(orgIds, tracked, { service: 'Test' });

    expect(stats.peak).toBe(ORG_FAN_OUT_CONCURRENCY);
  });

  test('returns every org result in org order, same as an uncapped fan-out', async () => {
    const fn = async (orgId: string) => {
      // Later orgs finish first, so order cannot come from completion time.
      await new Promise((resolve) => setTimeout(resolve, orgId.endsWith('0') ? 5 : 1));
      return [`${orgId}-a`, `${orgId}-b`];
    };

    const items = await fanOutAcrossOrgs(orgIds, fn, { service: 'Test' });

    expect(items).toEqual(orgIds.flatMap((orgId) => [`${orgId}-a`, `${orgId}-b`]));
  });

  test('a denied org is skipped quietly and a broken one is logged, neither blanks the rest', async () => {
    const fn = async (orgId: string) => {
      await tick();
      if (orgId === 'org-3') throw new AuthorizationError('nope');
      if (orgId === 'org-7') throw new Error('boom');
      return [orgId];
    };

    const items = await fanOutAcrossOrgs(orgIds, fn, { service: 'Test' });

    expect(items).toEqual(orgIds.filter((id) => id !== 'org-3' && id !== 'org-7'));
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toBe('Test.listForOrgs[org-7] failed');
  });

  test('a failure frees its slot for the orgs still waiting', async () => {
    const { tracked, stats } = trackInFlight(async (orgId) => {
      await tick();
      throw new Error(`fail ${orgId}`);
    });

    const items = await fanOutAcrossOrgs(orgIds, tracked, { service: 'Test' });

    expect(items).toEqual([]);
    expect(stats.peak).toBe(ORG_FAN_OUT_CONCURRENCY);
    expect(logger.error).toHaveBeenCalledTimes(orgIds.length);
  });
});
