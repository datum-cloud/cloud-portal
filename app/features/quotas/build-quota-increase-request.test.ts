import { buildQuotaIncreaseRequest, isBucketExhausted } from './build-quota-increase-request';
import { describe, expect, test } from 'bun:test';

describe('buildQuotaIncreaseRequest', () => {
  test('builds the HelpScout prefill', () => {
    const r = buildQuotaIncreaseRequest('dns.networking.miloapis.com/dnszones', {
      scope: 'project',
      name: 'proj-1',
      displayName: 'My Project',
    });
    expect(r.subject).toBe('Quota increase request: dns.networking.miloapis.com/dnszones');
    expect(r.text).toContain('- Project: My Project (proj-1)');
    expect(r.text).toContain('Requested new limit');
  });
  test('organization scope labels the org line', () => {
    expect(
      buildQuotaIncreaseRequest('resourcemanager.miloapis.com/projects', {
        scope: 'organization',
        name: 'org-1',
      }).text
    ).toContain('- Organization:');
  });
});

describe('isBucketExhausted', () => {
  test('available <= 0 with a status present → exhausted (covers limit 0)', () => {
    expect(isBucketExhausted({ limit: 0, allocated: 0, available: 0 })).toBe(true);
    expect(isBucketExhausted({ limit: 25, allocated: 25, available: 0 })).toBe(true);
  });
  test('headroom or missing status → not exhausted', () => {
    expect(isBucketExhausted({ limit: 25, allocated: 10, available: 15 })).toBe(false);
    expect(isBucketExhausted(undefined)).toBe(false);
  });
});
