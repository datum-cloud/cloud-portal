import { withRequestContext } from '@/modules/axios/request-context';
import { beforeEach, describe, expect, test, vi } from 'vitest';

let orgName: string | null = null;
const organizationGet = vi.fn(async (name: string) => {
  orgName = name;
  return { name, displayName: `Org ${name}` };
});

function membership(org: string, role: string) {
  return {
    metadata: { uid: `m-${org}`, namespace: `organization-${org}`, resourceVersion: '1' },
    spec: { organizationRef: { name: org }, roles: [{ name: role }] },
    status: { organization: { displayName: org, type: 'Standard' } },
  };
}

const fetchMembershipPage = vi.fn(async () => ({
  items: [membership('acme', 'owner'), membership('globex', 'viewer')],
  continue: null,
}));

vi.mock('./organization.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./organization.service')>()),
  createOrganizationService: () => ({ get: organizationGet, fetchMembershipPage }),
}));

const { getOrganizationForRequest, hasOrganizationsForRequest, listOrganizationsForRequest } =
  await import('./organization-request-cache.server');
const { isUserOrgOwner, listOwnedOrgIds } = await import('@/resources/members/member-owner');

beforeEach(() => {
  orgName = null;
  organizationGet.mockClear();
  fetchMembershipPage.mockClear();
});

describe('getOrganizationForRequest', () => {
  test('fetches once per request and serves the rest from the context', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const first = await getOrganizationForRequest('acme');
      const second = await getOrganizationForRequest('acme');

      expect(first).toBe(second);
      expect(organizationGet).toHaveBeenCalledTimes(1);
      expect(orgName).toBe('acme');
    });
  });

  test('never serves a different organization from the cache', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      await getOrganizationForRequest('acme');
      const other = await getOrganizationForRequest('globex');

      expect(other.name).toBe('globex');
      expect(organizationGet).toHaveBeenCalledTimes(2);
    });
  });

  test('separate requests do not share a cache', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, () =>
      getOrganizationForRequest('acme')
    );
    await withRequestContext({ requestId: 'r2', token: 't' }, () =>
      getOrganizationForRequest('acme')
    );

    expect(organizationGet).toHaveBeenCalledTimes(2);
  });

  test('degrades to a plain fetch outside a request context', async () => {
    const org = await getOrganizationForRequest('acme');

    expect(org.name).toBe('acme');
    expect(organizationGet).toHaveBeenCalledTimes(1);
  });
});

describe('listOrganizationsForRequest', () => {
  test('concurrent callers on one request share a single list call', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const [layout, page] = await Promise.all([
        listOrganizationsForRequest(),
        listOrganizationsForRequest(),
      ]);

      expect(layout).toBe(page);
      expect(layout.items.map((org) => org.name)).toEqual(['acme', 'globex']);
      expect(fetchMembershipPage).toHaveBeenCalledTimes(1);
    });
  });

  test('separate requests each list', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, () => listOrganizationsForRequest());
    await withRequestContext({ requestId: 'r2', token: 't' }, () => listOrganizationsForRequest());

    expect(fetchMembershipPage).toHaveBeenCalledTimes(2);
  });
});

describe('shared membership list', () => {
  test('the org list, any-org probe and owner checks share one call', async () => {
    // One page load used to list the same memberships up to four times: the
    // auth middleware's probe, the private layout, its owner check and the
    // project layout's owner check.
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const [orgs, hasOrgs, owned, ownsAcme, ownsGlobex] = await Promise.all([
        listOrganizationsForRequest(),
        hasOrganizationsForRequest(),
        listOwnedOrgIds(),
        isUserOrgOwner('acme'),
        isUserOrgOwner('globex'),
      ]);

      expect(orgs.items).toHaveLength(2);
      expect(hasOrgs).toBe(true);
      expect(owned).toEqual(['acme']);
      expect(ownsAcme).toBe(true);
      expect(ownsGlobex).toBe(false);
      expect(fetchMembershipPage).toHaveBeenCalledTimes(1);
    });
  });

  test('a user with no memberships has no organizations', async () => {
    fetchMembershipPage.mockResolvedValueOnce({ items: [], continue: null });

    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      expect(await hasOrganizationsForRequest()).toBe(false);
    });
  });
});
