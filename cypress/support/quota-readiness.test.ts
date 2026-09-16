import {
  NETWORKING_HTTPPROXIES_RESOURCE_TYPE,
  QUOTA_ISSUE_URL,
  QUOTA_POLL_INTERVAL_MS,
  QUOTA_READY_TIMEOUT_MS,
  allowanceBucketsUrl,
  buildQuotaTimeoutMessage,
  classifyQuotaPoll,
  hasNetworkingBucket,
} from './quota-readiness';
import { describe, expect, it } from 'bun:test';

const bucket = (resourceType: string) => ({
  metadata: { uid: 'u1', name: `bucket-${resourceType}`, namespace: 'milo-system' },
  spec: { consumerRef: { kind: 'Project', name: 'project-abc' }, resourceType },
  status: { limit: 10, allocated: 0, available: 10 },
});

describe('hasNetworkingBucket', () => {
  it('returns true when an httpproxies allowance bucket is present', () => {
    const body = {
      items: [
        bucket('dns.networking.miloapis.com/dnszones'),
        bucket(NETWORKING_HTTPPROXIES_RESOURCE_TYPE),
      ],
    };

    expect(hasNetworkingBucket(body)).toBe(true);
  });

  it('returns false when only other resource types are present', () => {
    const body = { items: [bucket('dns.networking.miloapis.com/dnszones')] };

    expect(hasNetworkingBucket(body)).toBe(false);
  });

  it('returns false for an empty list', () => {
    expect(hasNetworkingBucket({ kind: 'AllowanceBucketList', items: [] })).toBe(false);
  });

  it('returns false for malformed or missing bodies', () => {
    expect(hasNetworkingBucket(undefined)).toBe(false);
    expect(hasNetworkingBucket(null)).toBe(false);
    expect(hasNetworkingBucket('<html>login</html>')).toBe(false);
    expect(hasNetworkingBucket({ items: 'nope' })).toBe(false);
    expect(hasNetworkingBucket({ items: [{ spec: null }, { metadata: {} }] })).toBe(false);
  });
});

describe('classifyQuotaPoll', () => {
  it('is ready on a 2xx that contains the bucket', () => {
    expect(classifyQuotaPoll(200, { items: [bucket(NETWORKING_HTTPPROXIES_RESOURCE_TYPE)] })).toBe(
      'ready'
    );
  });

  it('keeps waiting on a 2xx without the bucket', () => {
    expect(classifyQuotaPoll(200, { items: [] })).toBe('not-provisioned');
  });

  it('treats 401 and 403 as RBAC propagation lag', () => {
    expect(classifyQuotaPoll(401, {})).toBe('auth-pending');
    expect(classifyQuotaPoll(403, {})).toBe('auth-pending');
  });

  it('flags any other non-2xx as a request failure', () => {
    expect(classifyQuotaPoll(404, {})).toBe('request-failed');
    expect(classifyQuotaPoll(500, {})).toBe('request-failed');
    expect(classifyQuotaPoll(502, '')).toBe('request-failed');
  });
});

describe('buildQuotaTimeoutMessage', () => {
  it('matches the exact provisioning-stalled wording when the bucket never appeared', () => {
    expect(buildQuotaTimeoutMessage('project-r49xz', 'not-provisioned', 200)).toBe(
      'ensureSharedResources: quota never provisioned for project project-r49xz after 90s (no networking.datumapis.com/httpproxies allowance bucket). Staging grant provisioning is stalled; see https://github.com/datum-cloud/cloud-portal/issues/1553'
    );
  });

  it('uses the same provisioning-stalled wording when RBAC never caught up', () => {
    expect(buildQuotaTimeoutMessage('project-r49xz', 'auth-pending', 403)).toContain(
      'quota never provisioned for project project-r49xz after 90s'
    );
  });

  it('includes the last HTTP status when the list request kept failing', () => {
    const message = buildQuotaTimeoutMessage('project-r49xz', 'request-failed', 502);

    expect(message).toContain('project project-r49xz');
    expect(message).toContain('HTTP 502');
    expect(message).toContain('after 90s');
    expect(message).toContain(QUOTA_ISSUE_URL);
  });
});

describe('constants and url', () => {
  it('polls every 5s for up to 90s', () => {
    expect(QUOTA_POLL_INTERVAL_MS).toBe(5_000);
    expect(QUOTA_READY_TIMEOUT_MS).toBe(90_000);
  });

  it('builds the project control-plane allowance bucket list url', () => {
    expect(allowanceBucketsUrl('project-abc')).toBe(
      '/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/project-abc/control-plane/apis/quota.miloapis.com/v1alpha1/namespaces/milo-system/allowancebuckets?limit=500'
    );
  });
});
