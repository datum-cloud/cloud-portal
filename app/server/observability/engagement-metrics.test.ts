import {
  createMemoryEngagementStore,
  createRedisEngagementStore,
  extractActivityScope,
  extractMutationLabels,
  mutationOutcome,
  recordActivity,
  recordOnboardingStep,
  recordResourceMutation,
  setEngagementStore,
  trailingDays,
  type EngagementStore,
} from './engagement-metrics';
import { afterEach, describe, expect, test } from 'bun:test';
import { register } from 'prom-client';

async function valueOf(name: string, labels: Record<string, string> = {}): Promise<number> {
  const metric = await register.getSingleMetric(name)?.get();
  const entry = metric?.values.find((v) =>
    Object.entries(labels).every(([k, val]) => v.labels[k] === val)
  );
  return entry?.value ?? 0;
}

/** Lets fire-and-forget store writes settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const PROJECT_CP = '/apis/resourcemanager.miloapis.com/v1alpha1/projects/p-1/control-plane';

afterEach(() => setEngagementStore(null));

describe('active users/orgs/projects', () => {
  test('extracts org and project scope from page routes and proxy paths', () => {
    expect(extractActivityScope('/org/acme/projects')).toEqual({ orgId: 'acme' });
    expect(extractActivityScope('/org/acme.data')).toEqual({ orgId: 'acme' });
    expect(extractActivityScope('/project/p-1/domains')).toEqual({ projectId: 'p-1' });
    expect(extractActivityScope(`/api/proxy${PROJECT_CP}/apis/x/v1/domains`)).toEqual({
      projectId: 'p-1',
    });
    expect(
      extractActivityScope(
        '/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/organizations/acme/control-plane/apis/x'
      )
    ).toEqual({ orgId: 'acme' });
    expect(extractActivityScope('/account/settings')).toEqual({});
  });

  test('trailing days are UTC calendar days, newest first', () => {
    expect(trailingDays(new Date('2026-03-02T23:30:00Z'), 3)).toEqual([
      '2026-03-02',
      '2026-03-01',
      '2026-02-28',
    ]);
  });

  test('gauges report distinct ids per window', async () => {
    setEngagementStore(createMemoryEngagementStore());
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    recordActivity('u-1', '/org/acme', now);
    recordActivity('u-1', '/project/p-1', now); // same user again: still one
    recordActivity('u-2', '/org/acme', yesterday);
    await flush();

    expect(await valueOf('portal_active_users', { window: '1d' })).toBe(1);
    expect(await valueOf('portal_active_users', { window: '7d' })).toBe(2);
    expect(await valueOf('portal_active_orgs', { window: '30d' })).toBe(1);
    expect(await valueOf('portal_active_projects', { window: '1d' })).toBe(1);
  });

  test('reports nothing rather than a wrong number when the count is unavailable', async () => {
    const unavailable: EngagementStore = {
      ...createMemoryEngagementStore(),
      countActive: async () => null,
    };
    setEngagementStore(unavailable);
    const metric = await register.getSingleMetric('portal_active_users')?.get();
    expect(metric?.values).toEqual([]);
  });

  test('dedupes per pod so repeat requests do not hit the store', async () => {
    const calls: string[] = [];
    setEngagementStore({
      ...createMemoryEngagementStore(),
      addActive: async (kind, _day, id) => void calls.push(`${kind}:${id}`),
    });
    recordActivity('u-1', '/org/acme');
    recordActivity('u-1', '/org/acme');
    recordActivity('u-1', '/org/other');
    expect(calls).toEqual(['users:u-1', 'orgs:acme', 'orgs:other']);
  });
});

describe('redis engagement store', () => {
  function fakeRedis(status = 'ready') {
    const calls: (string | number)[][] = [];
    return {
      calls,
      redis: {
        status,
        async call(command: string, ...args: (string | number)[]) {
          calls.push([command, ...args]);
          if (command === 'PFCOUNT') return 7;
          if (command === 'SET') return 'OK';
          return 1;
        },
      },
    };
  }

  test('uses HyperLogLogs with an expiry and counts the union of days', async () => {
    const { redis, calls } = fakeRedis();
    const store = createRedisEngagementStore(redis);
    await store.addActive('users', '2026-03-02', 'u-1');
    expect(await store.countActive('users', ['2026-03-02', '2026-03-01'])).toBe(7);
    expect(calls).toEqual([
      ['PFADD', 'engagement:active:users:2026-03-02', 'u-1'],
      ['EXPIRE', 'engagement:active:users:2026-03-02', 31 * 24 * 60 * 60],
      ['PFCOUNT', 'engagement:active:users:2026-03-02', 'engagement:active:users:2026-03-01'],
    ]);
  });

  test('counts are unavailable while Redis is down; markers fall back to memory', async () => {
    const { redis, calls } = fakeRedis('reconnecting');
    const store = createRedisEngagementStore(redis);
    expect(await store.countActive('users', ['2026-03-02'])).toBeNull();
    expect(await store.markOnce('k', 60)).toBe(true);
    expect(await store.markOnce('k', 60)).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('portal_resource_mutations_total', () => {
  const domains = `${PROJECT_CP}/apis/networking.datumapis.com/v1alpha/namespaces/default/domains`;

  test('maps methods to actions and keeps resource identifiers out of labels', () => {
    expect(extractMutationLabels({ method: 'post', url: domains, status: 201 })).toEqual({
      api_group: 'networking.datumapis.com',
      resource_type: 'domains',
      action: 'create',
      outcome: 'success',
    });
    expect(
      extractMutationLabels({ method: 'PATCH', url: `${domains}/example-com`, status: 200 })?.action
    ).toBe('update');
    expect(
      extractMutationLabels({ method: 'DELETE', url: `${domains}/example-com`, status: 200 })
        ?.action
    ).toBe('delete');
  });

  test('ignores reads, dry runs, access reviews and non-K8s paths', () => {
    expect(extractMutationLabels({ method: 'GET', url: domains, status: 200 })).toBeNull();
    expect(
      extractMutationLabels({ method: 'POST', url: `${domains}?dryRun=All`, status: 201 })
    ).toBeNull();
    expect(
      extractMutationLabels({
        method: 'POST',
        url: '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
        status: 201,
      })
    ).toBeNull();
    expect(extractMutationLabels({ method: 'POST', url: '/graphql', status: 200 })).toBeNull();
  });

  test('classifies outcomes', () => {
    expect(mutationOutcome(201)).toBe('success');
    expect(mutationOutcome(403)).toBe('rejected');
    expect(mutationOutcome(503)).toBe('failed');
    expect(mutationOutcome('network')).toBe('failed');
  });

  test('increments the counter', async () => {
    const labels = {
      api_group: 'networking.datumapis.com',
      resource_type: 'domains',
      action: 'create',
      outcome: 'rejected',
    };
    const before = await valueOf('portal_resource_mutations_total', labels);
    recordResourceMutation({ method: 'POST', url: domains, status: 422 });
    expect(await valueOf('portal_resource_mutations_total', labels)).toBe(before + 1);
  });
});

describe('portal_onboarding_step_reached_total', () => {
  test('counts each user once per step', async () => {
    setEngagementStore(createMemoryEngagementStore());
    const before = await valueOf('portal_onboarding_step_reached_total', { step: 'billing' });

    recordOnboardingStep('billing', 'u-1');
    recordOnboardingStep('billing', 'u-1'); // reload
    recordOnboardingStep('billing', 'u-2');
    await flush();

    expect(await valueOf('portal_onboarding_step_reached_total', { step: 'billing' })).toBe(
      before + 2
    );
  });
});
