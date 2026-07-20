import { membershipHasOwnerRole, selectOrgOwners } from './member-owner';
import type { Member } from './member.schema';
import { describe, expect, it } from 'bun:test';

describe('membershipHasOwnerRole', () => {
  it('returns true for the owner role', () => {
    expect(membershipHasOwnerRole({ spec: { roles: [{ name: 'owner' }] } } as never)).toBe(true);
  });

  it('returns true for the datum-cloud-owner role (case-insensitive)', () => {
    expect(
      membershipHasOwnerRole({ spec: { roles: [{ name: 'Datum-Cloud-Owner' }] } } as never)
    ).toBe(true);
  });

  it('returns false for a non-owner role', () => {
    expect(membershipHasOwnerRole({ spec: { roles: [{ name: 'editor' }] } } as never)).toBe(false);
  });

  it('returns false when there are no roles or no membership', () => {
    expect(membershipHasOwnerRole({ spec: { roles: [] } } as never)).toBe(false);
    expect(membershipHasOwnerRole(undefined)).toBe(false);
  });
});

describe('selectOrgOwners', () => {
  const member = (overrides: Partial<Member>): Member =>
    ({
      uid: 'u',
      name: 'membership',
      resourceVersion: '1',
      createdAt: new Date(),
      organization: { id: 'acme' },
      roles: [],
      user: { id: 'user' },
      ...overrides,
    }) as Member;

  it('keeps only owners and maps them to contact details', () => {
    const members = [
      member({
        roles: [{ name: 'owner' }],
        user: {
          id: 'a',
          email: 'ada@acme.com',
          givenName: 'Ada',
          familyName: 'Lovelace',
          avatarUrl: 'https://img/ada.png',
        },
      }),
      member({ roles: [{ name: 'editor' }], user: { id: 'b', email: 'bob@acme.com' } }),
      member({ roles: [{ name: 'datum-cloud-owner' }], user: { id: 'c', email: 'cleo@acme.com' } }),
    ];

    expect(selectOrgOwners(members)).toEqual([
      { name: 'Ada Lovelace', email: 'ada@acme.com', avatarUrl: 'https://img/ada.png' },
      { name: 'cleo@acme.com', email: 'cleo@acme.com', avatarUrl: undefined },
    ]);
  });

  it('returns an empty list when there are no owners', () => {
    expect(selectOrgOwners([member({ roles: [{ name: 'viewer' }] })])).toEqual([]);
  });
});
