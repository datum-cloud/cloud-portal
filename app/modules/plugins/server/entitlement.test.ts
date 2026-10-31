/// <reference types="bun-types/test" />
import { EXTENSION_NAV_PROJECT, type PluginManifest, type PluginRegistryEntry } from '../types';
import {
  ENTITLEMENT_CACHE_TTL_MS,
  assertPluginEntitled,
  createEntitlementChecker,
  pluginEntitlementIds,
  type ListEntitlements,
} from './entitlement';
import { logger } from '@/modules/logger';
import { AppError, AuthorizationError, NotFoundError } from '@/utils/errors/app-error';
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

const PROJECT = 'acme-web';

function entry(
  overrides: {
    entitlement?: 'Required' | 'None';
    devMode?: boolean;
    serviceName?: string;
    serviceRefName?: string;
    navServiceRef?: string;
  } = {}
): PluginRegistryEntry {
  const manifest = {
    name: 'compute.miloapis.com',
    version: '1.4.0',
    remoteEntry: 'remote-entry.js',
    exposedModules: {},
    extensions: overrides.navServiceRef
      ? [
          {
            type: EXTENSION_NAV_PROJECT,
            properties: {
              id: 'instances',
              title: 'Instances',
              icon: 'server',
              path: 'instances',
              serviceRef: overrides.navServiceRef,
            },
          },
        ]
      : [],
  } as unknown as PluginManifest;

  return {
    spec: {
      slug: 'compute',
      displayName: 'Compute',
      deprecated: false,
      suspend: false,
      serviceName: overrides.serviceName,
      serviceRefName: overrides.serviceRefName,
      assets: { baseURL: 'https://plugin.example.com', manifestPath: '/plugin-manifest.json' },
      visibility: { entitlement: overrides.entitlement ?? 'Required' },
    },
    devMode: overrides.devMode ?? false,
    source: 'platform',
    manifest,
    status: { conditions: [] },
  } as unknown as PluginRegistryEntry;
}

const active = (serviceName: string, ref?: string) => ({
  spec: { serviceRef: { name: ref ?? serviceName } },
  status: { phase: 'Active', serviceName },
});

const COMPUTE = 'compute.miloapis.com';

let warnSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});
  errorSpy = spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('pluginEntitlementIds', () => {
  test('orders serviceName, serviceRefName, slug, then nav serviceRefs, without duplicates', () => {
    const ids = pluginEntitlementIds(
      entry({
        serviceName: COMPUTE,
        serviceRefName: 'compute',
        navServiceRef: 'compute.datumapis.com',
      })
    );
    expect(ids).toEqual([COMPUTE, 'compute', 'compute.datumapis.com']);
  });

  test('falls back to the slug when the spec carries no service identity', () => {
    expect(pluginEntitlementIds(entry())).toEqual(['compute']);
  });
});

describe('assertPluginEntitled', () => {
  test('mounts a Required plugin when the project holds a matching Active entitlement', async () => {
    const list = mock<ListEntitlements>(async () => [active(COMPUTE)]);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    await expect(
      assertPluginEntitled(PROJECT, entry({ serviceName: COMPUTE }), checker)
    ).resolves.toBeUndefined();
    expect(list).toHaveBeenCalledWith(PROJECT);
  });

  test('matches an entitlement written with the Service object name in spec.serviceRef', async () => {
    const list = mock<ListEntitlements>(async () => [
      { spec: { serviceRef: { name: 'compute' } }, status: { phase: 'Active' } },
    ]);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    await expect(
      assertPluginEntitled(
        PROJECT,
        entry({ serviceName: COMPUTE, serviceRefName: 'compute' }),
        checker
      )
    ).resolves.toBeUndefined();
  });

  test('matches on the canonical id when the slug differs from it', async () => {
    // The slug-only trap: slug `compute` never equals `compute.miloapis.com`.
    const list = mock<ListEntitlements>(async () => [active(COMPUTE, 'compute-svc')]);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    expect(await checker.isEntitled(PROJECT, entry({ serviceName: COMPUTE }))).toBe(true);
    expect(await checker.isEntitled(PROJECT, entry())).toBe(false);
  });

  test('matches a serviceRef declared by a manifest nav item', async () => {
    const list = mock<ListEntitlements>(async () => [active('compute.datumapis.com')]);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    expect(
      await checker.isEntitled(PROJECT, entry({ navServiceRef: 'compute.datumapis.com' }))
    ).toBe(true);
  });

  test('refuses a Required plugin with a 404 when no Active entitlement matches', async () => {
    const list = mock<ListEntitlements>(async () => [
      active('networking.datumapis.com'),
      {
        spec: { serviceRef: { name: COMPUTE } },
        status: { phase: 'Pending', serviceName: COMPUTE },
      },
    ]);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    const result = assertPluginEntitled(PROJECT, entry({ serviceName: COMPUTE }), checker);
    await expect(result).rejects.toBeInstanceOf(NotFoundError);
    await expect(result).rejects.toMatchObject({ status: 404 });
  });

  test('mounts an entitlement-free plugin without any lookup', async () => {
    const list = mock<ListEntitlements>(async () => []);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    await expect(
      assertPluginEntitled(PROJECT, entry({ entitlement: 'None' }), checker)
    ).resolves.toBeUndefined();
    expect(list).not.toHaveBeenCalled();
  });

  test('skips the gate for dev-sourced plugins', async () => {
    const list = mock<ListEntitlements>(async () => []);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    await expect(
      assertPluginEntitled(PROJECT, entry({ devMode: true }), checker)
    ).resolves.toBeUndefined();
    expect(list).not.toHaveBeenCalled();
  });

  test('fails closed with a 503 and a server log line when the lookup errors', async () => {
    const list = mock<ListEntitlements>(async () => {
      throw new Error('upstream timeout');
    });
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    const result = assertPluginEntitled(PROJECT, entry({ serviceName: COMPUTE }), checker);
    await expect(result).rejects.toBeInstanceOf(AppError);
    await expect(result).rejects.toMatchObject({ status: 503, code: 'ENTITLEMENT_LOOKUP_FAILED' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('entitlement lookup failed');
    // logger.error would report a second Sentry event on top of the 503's own.
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('passes an upstream 403 through unchanged instead of mounting', async () => {
    const denied = new AuthorizationError('forbidden');
    const list = mock<ListEntitlements>(async () => {
      throw denied;
    });
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    await expect(
      assertPluginEntitled(PROJECT, entry({ serviceName: COMPUTE }), checker)
    ).rejects.toBe(denied);
  });

  test('does not cache a failed lookup', async () => {
    let calls = 0;
    const list = mock<ListEntitlements>(async () => {
      calls += 1;
      if (calls === 1) throw new Error('blip');
      return [active(COMPUTE)];
    });
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });
    const plugin = entry({ serviceName: COMPUTE });

    await expect(checker.isEntitled(PROJECT, plugin)).rejects.toBeInstanceOf(AppError);
    expect(await checker.isEntitled(PROJECT, plugin)).toBe(true);
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('entitlement cache', () => {
  test('reuses the list within the window and refreshes after it', async () => {
    let clock = 1_000;
    let items = [active(COMPUTE)];
    const list = mock<ListEntitlements>(async () => items);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1', now: () => clock });
    const plugin = entry({ serviceName: COMPUTE });

    expect(await checker.isEntitled(PROJECT, plugin)).toBe(true);
    clock += ENTITLEMENT_CACHE_TTL_MS - 1;
    items = [];
    expect(await checker.isEntitled(PROJECT, plugin)).toBe(true);
    expect(list).toHaveBeenCalledTimes(1);

    clock += 1;
    expect(await checker.isEntitled(PROJECT, plugin)).toBe(false);
    expect(list).toHaveBeenCalledTimes(2);
  });

  test('re-reads a cached set that lacks the plugin before refusing', async () => {
    // The set was cached while the user was on another plugin; the service
    // was activated afterwards.
    let items = [active('networking.datumapis.com')];
    const list = mock<ListEntitlements>(async () => items);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });

    expect(
      await checker.isEntitled(PROJECT, entry({ serviceName: 'networking.datumapis.com' }))
    ).toBe(true);
    items = [active('networking.datumapis.com'), active(COMPUTE)];
    expect(await checker.isEntitled(PROJECT, entry({ serviceName: COMPUTE }))).toBe(true);
    expect(list).toHaveBeenCalledTimes(2);

    // The refreshed set is cached again, so the next hit costs nothing.
    expect(await checker.isEntitled(PROJECT, entry({ serviceName: COMPUTE }))).toBe(true);
    expect(list).toHaveBeenCalledTimes(2);
  });

  test('a refusal costs one lookup, never two', async () => {
    const list = mock<ListEntitlements>(async () => [active('networking.datumapis.com')]);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1' });
    const plugin = entry({ serviceName: COMPUTE });

    expect(await checker.isEntitled(PROJECT, plugin)).toBe(false);
    expect(list).toHaveBeenCalledTimes(1);
    expect(await checker.isEntitled(PROJECT, plugin)).toBe(false);
    expect(list).toHaveBeenCalledTimes(2);
  });

  test('keeps separate entries per caller and per project', async () => {
    let caller = 'user-1';
    const list = mock<ListEntitlements>(async () => [active(COMPUTE)]);
    const checker = createEntitlementChecker({ list, callerId: () => caller });
    const plugin = entry({ serviceName: COMPUTE });

    await checker.isEntitled(PROJECT, plugin);
    await checker.isEntitled('other-project', plugin);
    caller = 'user-2';
    await checker.isEntitled(PROJECT, plugin);
    expect(list).toHaveBeenCalledTimes(3);
  });

  test('does not cache when the caller is unknown', async () => {
    const list = mock<ListEntitlements>(async () => [active(COMPUTE)]);
    const checker = createEntitlementChecker({ list, callerId: () => undefined });
    const plugin = entry({ serviceName: COMPUTE });

    await checker.isEntitled(PROJECT, plugin);
    await checker.isEntitled(PROJECT, plugin);
    expect(list).toHaveBeenCalledTimes(2);
  });

  test('evicts the oldest entry once the cap is reached', async () => {
    const list = mock<ListEntitlements>(async () => [active(COMPUTE)]);
    const checker = createEntitlementChecker({ list, callerId: () => 'user-1', maxEntries: 2 });
    const plugin = entry({ serviceName: COMPUTE });

    await checker.isEntitled('p1', plugin);
    await checker.isEntitled('p2', plugin);
    await checker.isEntitled('p3', plugin); // evicts p1
    await checker.isEntitled('p2', plugin); // still cached
    expect(list).toHaveBeenCalledTimes(3);
    await checker.isEntitled('p1', plugin); // refetched
    expect(list).toHaveBeenCalledTimes(4);
  });
});
