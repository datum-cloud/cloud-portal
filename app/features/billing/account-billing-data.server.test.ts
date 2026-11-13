import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listBindings: vi.fn(),
  listPaymentMethods: vi.fn(),
  listProjects: vi.fn(),
  isFeatureEnabled: vi.fn(),
}));

vi.mock('@/resources/billing-accounts', () => ({
  createBillingAccountService: () => ({ listForOrgs: mocks.listAccounts }),
}));
vi.mock('@/resources/billing-account-bindings', () => ({
  createBillingAccountBindingService: () => ({ listForOrgs: mocks.listBindings }),
}));
vi.mock('@/resources/payment-methods', () => ({
  createPaymentMethodService: () => ({ listForOrgs: mocks.listPaymentMethods }),
}));
vi.mock('@/resources/projects/project.service', () => ({
  createProjectService: () => ({ list: mocks.listProjects }),
}));
vi.mock('@/modules/feature-flags/evaluate.server', () => ({
  isFeatureEnabled: mocks.isFeatureEnabled,
}));
vi.mock('@/resources/base/utils', () => ({ ORG_FAN_OUT_CONCURRENCY: 6 }));

const { loadAccountBillingData, listProjectLabelsByOrg } =
  await import('./account-billing-data.server');

const ORG_COUNT = 40;
const CAP = 6;
const orgIds = Array.from({ length: ORG_COUNT }, (_, i) => `org-${i}`);
const tick = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));

const binding = (orgId: string, phase?: string) => ({
  metadata: { namespace: `organization-${orgId}` },
  status: phase ? { phase } : undefined,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('loadAccountBillingData', () => {
  let projectStats: { inFlight: number; peak: number };
  let flagStats: { inFlight: number; peak: number };

  beforeEach(() => {
    projectStats = { inFlight: 0, peak: 0 };
    flagStats = { inFlight: 0, peak: 0 };
    Object.values(mocks).forEach((mock) => mock.mockReset());

    mocks.listAccounts.mockResolvedValue([{ metadata: { name: 'acct' } }]);
    mocks.listPaymentMethods.mockResolvedValue([{ metadata: { name: 'pm' } }]);
    mocks.listBindings.mockResolvedValue(orgIds.map((orgId) => binding(orgId, 'Active')));
    mocks.listProjects.mockImplementation(async (orgId: string) => {
      projectStats.inFlight += 1;
      projectStats.peak = Math.max(projectStats.peak, projectStats.inFlight);
      await tick();
      projectStats.inFlight -= 1;
      if (orgId === 'org-5') throw new Error('project list down');
      return { items: [{ name: `${orgId}-p1`, displayName: 'One' }, { name: `${orgId}-p2` }] };
    });
    mocks.isFeatureEnabled.mockImplementation(async (_flag: string, orgId: string) => {
      flagStats.inFlight += 1;
      flagStats.peak = Math.max(flagStats.peak, flagStats.inFlight);
      await tick();
      flagStats.inFlight -= 1;
      if (orgId === 'org-9') throw new Error('flag provider down');
      return orgId === 'org-2';
    });
  });

  test('with many orgs the project and flag fan-outs never exceed the cap', async () => {
    await loadAccountBillingData(orgIds);

    expect(mocks.listProjects).toHaveBeenCalledTimes(ORG_COUNT);
    expect(projectStats.peak).toBe(CAP);
    expect(mocks.isFeatureEnabled).toHaveBeenCalledTimes(ORG_COUNT);
    expect(flagStats.peak).toBe(CAP);
  });

  test('returns the same data an uncapped, serial loader would', async () => {
    const data = await loadAccountBillingData(orgIds);

    expect(data.accounts).toEqual([{ metadata: { name: 'acct' } }]);
    expect(data.paymentMethods).toEqual([{ metadata: { name: 'pm' } }]);
    expect(data.bindings).toHaveLength(ORG_COUNT);
    expect(Object.keys(data.projectsByOrg)).toEqual(orgIds);
    expect(data.projectsByOrg['org-1']).toEqual([
      { name: 'org-1-p1', displayName: 'One' },
      { name: 'org-1-p2', displayName: 'org-1-p2' },
    ]);
    // A failed project list or flag evaluation degrades that org only.
    expect(data.projectsByOrg['org-5']).toEqual([]);
    expect(data.multiBillingByOrg).toEqual(
      Object.fromEntries(orgIds.map((orgId) => [orgId, orgId === 'org-2']))
    );
  });

  test('lists projects only for orgs with an active binding, once each', async () => {
    mocks.listBindings.mockResolvedValue([
      binding('org-1', 'Active'),
      binding('org-1', 'Active'),
      binding('org-2'),
      binding('org-3', 'Superseded'),
      { metadata: {} },
    ]);

    const data = await loadAccountBillingData(orgIds);

    expect(mocks.listProjects.mock.calls.map(([orgId]) => orgId)).toEqual(['org-1', 'org-2']);
    expect(Object.keys(data.projectsByOrg)).toEqual(['org-1', 'org-2']);
  });

  test('starts every org-only read together and projects as soon as bindings land', async () => {
    const accounts = deferred<unknown[]>();
    const bindings = deferred<unknown[]>();
    mocks.listAccounts.mockReturnValue(accounts.promise);
    mocks.listBindings.mockReturnValue(bindings.promise);

    const pending = loadAccountBillingData(['org-1']);
    await tick(5);

    // Nothing has resolved upstream yet, but all four org-only reads are out.
    expect(mocks.listAccounts).toHaveBeenCalledTimes(1);
    expect(mocks.listBindings).toHaveBeenCalledTimes(1);
    expect(mocks.listPaymentMethods).toHaveBeenCalledTimes(1);
    expect(mocks.isFeatureEnabled).toHaveBeenCalledTimes(1);
    expect(mocks.listProjects).not.toHaveBeenCalled();

    // Projects need only the bindings, not the slower accounts list.
    bindings.resolve([binding('org-1', 'Active')]);
    await tick(5);
    expect(mocks.listProjects).toHaveBeenCalledTimes(1);

    accounts.resolve([]);
    await expect(pending).resolves.toMatchObject({ accounts: [] });
  });

  test('a failed billing list still fails the loader', async () => {
    mocks.listBindings.mockRejectedValue(new Error('bindings down'));

    await expect(loadAccountBillingData(orgIds)).rejects.toThrow('bindings down');
  });
});

describe('listProjectLabelsByOrg', () => {
  test('caps concurrency and keeps org order', async () => {
    let inFlight = 0;
    let peak = 0;
    mocks.listProjects.mockReset();
    mocks.listProjects.mockImplementation(async (orgId: string) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight -= 1;
      return { items: [{ name: orgId }] };
    });

    const labels = await listProjectLabelsByOrg(new Set(orgIds));

    expect(peak).toBe(CAP);
    expect(Object.keys(labels)).toEqual(orgIds);
  });
});
