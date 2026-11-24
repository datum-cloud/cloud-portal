import { buildPluginQuotaIncreaseRequest, toPluginQuotaVerdict } from './plugin-quota';
import { deriveQuotaVerdict } from '@/modules/quota/derive-quota-verdict';
import { describe, expect, test } from 'vitest';

const RT = 'ipam.miloapis.com/public-ipv4claims';
const bucket = (limit: number, allocated: number) => ({
  uid: 'u',
  name: 'bucket-ipv4',
  namespace: 'milo-system',
  resourceType: RT,
  status: { limit, allocated, available: limit - allocated },
});
const reg = { name: 'r', resourceType: RT, type: 'Entity', displayName: 'Public IPv4 addresses' };

const verdictFor = (buckets: ReturnType<typeof bucket>[], isError = false) =>
  toPluginQuotaVerdict(
    deriveQuotaVerdict({
      resourceType: RT,
      buckets: buckets,
      registrations: [reg],
      isError,
    }),
    { resourceType: RT, isLoading: false }
  );

describe('toPluginQuotaVerdict', () => {
  test('exposes only the SDK fields when there is headroom', () => {
    expect(verdictFor([bucket(2, 1)])).toEqual({
      isLoading: false,
      isUnknown: false,
      denied: false,
      deniedReason: undefined,
      limit: 2,
      allocated: 1,
      available: 1,
    });
  });

  test('a zero-limit bucket is denied, without the Settings → Quotas pointer', () => {
    const v = verdictFor([bucket(0, 0)]);
    expect(v.denied).toBe(true);
    expect(v.deniedReason).toBe("You've reached your Public IPv4 addresses quota (0/0).");
  });

  test('a missing bucket or read error is unknown and not denied (fail-open)', () => {
    for (const v of [verdictFor([]), verdictFor([bucket(0, 0)], true)]) {
      expect(v).toMatchObject({ isUnknown: true, denied: false, deniedReason: undefined });
      expect(v.limit).toBeUndefined();
    }
  });

  test('passes isLoading through from the host query', () => {
    const v = toPluginQuotaVerdict(deriveQuotaVerdict({ resourceType: RT, isError: false }), {
      resourceType: RT,
      isLoading: true,
    });
    expect(v.isLoading).toBe(true);
    expect(v.denied).toBe(false);
  });
});

describe('buildPluginQuotaIncreaseRequest', () => {
  const current = {
    project: { name: 'proj-1', displayName: 'My Project' },
    org: { name: 'org-1', displayName: 'My Org' },
  };

  test('targets the project and includes the plugin context', () => {
    const r = buildPluginQuotaIncreaseRequest(
      { resourceType: RT, scope: 'project', context: 'Public IPv4 for a network load balancer.' },
      current
    );
    expect(r.subject).toBe(`Quota increase request: ${RT}`);
    expect(r.text).toContain('- Project: My Project (proj-1)');
    expect(r.text).toContain('- Context: Public IPv4 for a network load balancer.');
  });

  test('targets the organization for organization scope', () => {
    const r = buildPluginQuotaIncreaseRequest({ resourceType: RT, scope: 'organization' }, current);
    expect(r.text).toContain('- Organization: My Org (org-1)');
    expect(r.text).not.toContain('Context:');
  });
});
