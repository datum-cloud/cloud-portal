import { requireBillingOwner, requireOwnedBillingOrgs } from './billing-access.server';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const isOwnerMock = mock(async (_orgId: string): Promise<boolean> => false);
const ownedMock = mock(async (): Promise<string[]> => []);

mock.module('@/resources/members/member-owner', () => ({
  isUserOrgOwner: isOwnerMock,
  listOwnedOrgIds: ownedMock,
}));

function locationOf(response: unknown): string | null {
  return (response as Response).headers.get('Location');
}

describe('requireBillingOwner', () => {
  beforeEach(() => isOwnerMock.mockReset());

  it('redirects to the account when there is no org', async () => {
    const thrown = await requireBillingOwner(undefined).catch((e) => e);
    expect(locationOf(thrown)).toBe('/account');
  });

  it('sends a non-owner back to the org overview', async () => {
    isOwnerMock.mockResolvedValue(false);
    const thrown = await requireBillingOwner('org-acme').catch((e) => e);
    expect(locationOf(thrown)).toBe('/org/org-acme');
    expect(isOwnerMock).toHaveBeenCalledWith('org-acme');
  });

  it('treats a failed lookup as not an owner', async () => {
    isOwnerMock.mockRejectedValue(new Error('boom'));
    const thrown = await requireBillingOwner('org-acme').catch((e) => e);
    expect(locationOf(thrown)).toBe('/org/org-acme');
  });

  it('lets an owner through', async () => {
    isOwnerMock.mockResolvedValue(true);
    await expect(requireBillingOwner('org-acme')).resolves.toBeUndefined();
  });
});

describe('requireOwnedBillingOrgs', () => {
  beforeEach(() => ownedMock.mockReset());

  it('keeps only the orgs the user owns, in the given order', async () => {
    ownedMock.mockResolvedValue(['org-c', 'org-a']);
    await expect(requireOwnedBillingOrgs(['org-a', 'org-b', 'org-c'])).resolves.toEqual([
      'org-a',
      'org-c',
    ]);
  });

  it('redirects a user who owns none of their orgs', async () => {
    ownedMock.mockResolvedValue([]);
    const thrown = await requireOwnedBillingOrgs(['org-a']).catch((e) => e);
    expect(locationOf(thrown)).toBe('/account');
  });

  it('redirects when the ownership lookup fails', async () => {
    ownedMock.mockRejectedValue(new Error('boom'));
    const thrown = await requireOwnedBillingOrgs(['org-a']).catch((e) => e);
    expect(locationOf(thrown)).toBe('/account');
  });
});
