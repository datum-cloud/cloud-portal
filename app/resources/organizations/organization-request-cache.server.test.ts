import { withRequestContext } from '@/modules/axios/request-context';
import { beforeEach, describe, expect, test, vi } from 'vitest';

let orgName: string | null = null;
const organizationGet = vi.fn(async (name: string) => {
  orgName = name;
  return { name, displayName: `Org ${name}` };
});

const organizationList = vi.fn(async () => ({
  items: [{ name: 'acme' }],
  nextCursor: null,
  hasMore: false,
}));

vi.mock('./organization.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./organization.service')>()),
  createOrganizationService: () => ({ get: organizationGet, list: organizationList }),
}));

const { getOrganizationForRequest, listOrganizationsForRequest } =
  await import('./organization-request-cache.server');

beforeEach(() => {
  orgName = null;
  organizationGet.mockClear();
  organizationList.mockClear();
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
      expect(organizationList).toHaveBeenCalledTimes(1);
    });
  });

  test('separate requests each list', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, () => listOrganizationsForRequest());
    await withRequestContext({ requestId: 'r2', token: 't' }, () => listOrganizationsForRequest());

    expect(organizationList).toHaveBeenCalledTimes(2);
  });
});
