/// <reference types="bun-types/test" />
import { MiloFeatureFlagProvider, type OrgBucketLister } from './milo-provider';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import { ErrorCode } from '@openfeature/server-sdk';
import { describe, expect, mock, test } from 'bun:test';

const FLAG = 'billing.miloapis.com/cloud-portal-usage-metering-dashboard';
const ORG = 'acme';

function bucket(resourceType: string, available: bigint | number): AllowanceBucket {
  return {
    uid: `uid-${resourceType}`,
    name: `bucket-${resourceType}`,
    namespace: `organization-${ORG}`,
    resourceType,
    status: { available, allocated: 0n, claimCount: 0 },
  } as AllowanceBucket;
}

function mockLister(impl: (org: string) => Promise<AllowanceBucket[]>): {
  service: OrgBucketLister;
  list: ReturnType<typeof mock>;
} {
  const list = mock((_ns: 'organization', org: string) => impl(org));
  return { service: { list } as OrgBucketLister, list };
}

describe('MiloFeatureFlagProvider', () => {
  test('returns true / TARGETING_MATCH when bucket has available > 0', async () => {
    const { service } = mockLister(async () => [bucket(FLAG, 1n)]);
    const provider = new MiloFeatureFlagProvider({ bucketService: service });

    const result = await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });

    expect(result.value).toBe(true);
    expect(result.reason).toBe('TARGETING_MATCH');
  });

  test('returns defaultValue / DEFAULT when no matching bucket exists', async () => {
    const { service } = mockLister(async () => []);
    const provider = new MiloFeatureFlagProvider({ bucketService: service });

    const result = await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });

    expect(result.value).toBe(false);
    expect(result.reason).toBe('DEFAULT');
  });

  test('returns false / TARGETING_MATCH when bucket exists but available is 0', async () => {
    const { service } = mockLister(async () => [bucket(FLAG, 0n)]);
    const provider = new MiloFeatureFlagProvider({ bucketService: service });

    const result = await provider.resolveBooleanEvaluation(FLAG, true, { targetingKey: ORG });

    expect(result.value).toBe(false);
    expect(result.reason).toBe('TARGETING_MATCH');
  });

  test('caches per-org bucket list across flag evaluations within TTL', async () => {
    const { service, list } = mockLister(async () => [bucket(FLAG, 1n), bucket('other/flag', 1n)]);
    const provider = new MiloFeatureFlagProvider({ bucketService: service, ttlMs: 5_000 });

    await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });
    await provider.resolveBooleanEvaluation('other/flag', false, { targetingKey: ORG });
    await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });

    expect(list).toHaveBeenCalledTimes(1);
  });

  test('refetches after TTL expires', async () => {
    let now = 1_000;
    const { service, list } = mockLister(async () => [bucket(FLAG, 1n)]);
    const provider = new MiloFeatureFlagProvider({
      bucketService: service,
      ttlMs: 5_000,
      now: () => now,
    });

    await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });
    now += 6_000;
    await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });

    expect(list).toHaveBeenCalledTimes(2);
  });

  test('returns defaultValue / ERROR on lister failure without throwing', async () => {
    const { service } = mockLister(async () => {
      throw new Error('boom');
    });
    const provider = new MiloFeatureFlagProvider({ bucketService: service });

    const result = await provider.resolveBooleanEvaluation(FLAG, true, { targetingKey: ORG });

    expect(result.value).toBe(true);
    expect(result.reason).toBe('ERROR');
    expect(result.errorMessage).toContain('boom');
  });

  test('does not cache failures — next call re-fetches', async () => {
    let calls = 0;
    const lister = mock(async () => {
      calls++;
      if (calls === 1) throw new Error('transient');
      return [bucket(FLAG, 1n)];
    });
    const provider = new MiloFeatureFlagProvider({
      bucketService: { list: lister } as unknown as OrgBucketLister,
    });

    const first = await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });
    const second = await provider.resolveBooleanEvaluation(FLAG, false, { targetingKey: ORG });

    expect(first.reason).toBe('ERROR');
    expect(second.value).toBe(true);
    expect(lister).toHaveBeenCalledTimes(2);
  });

  test('returns defaultValue with TARGETING_KEY_MISSING when targetingKey is absent', async () => {
    const { service, list } = mockLister(async () => []);
    const provider = new MiloFeatureFlagProvider({ bucketService: service });

    const result = await provider.resolveBooleanEvaluation(FLAG, false, {});

    expect(result.value).toBe(false);
    expect(result.errorCode).toBe(ErrorCode.TARGETING_KEY_MISSING);
    expect(list).not.toHaveBeenCalled();
  });

  test('non-boolean resolvers reject with TypeMismatchError', async () => {
    const { service } = mockLister(async () => []);
    const provider = new MiloFeatureFlagProvider({ bucketService: service });

    await expect(provider.resolveStringEvaluation('x')).rejects.toThrow(/boolean/);
    await expect(provider.resolveNumberEvaluation('x')).rejects.toThrow(/boolean/);
    await expect(provider.resolveObjectEvaluation('x')).rejects.toThrow(/boolean/);
  });
});
