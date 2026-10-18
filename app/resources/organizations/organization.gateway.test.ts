/// <reference types="bun-types/test" />
import { toMemberAvatarsByOrg } from './organization.gateway';
import { describe, expect, test } from 'bun:test';

describe('toMemberAvatarsByOrg', () => {
  test('keys avatars by org name and drops pending invitations', () => {
    const membersByOrg = new Map([
      [
        'acme',
        [
          { name: 'u1', givenName: 'Ada', familyName: 'Lovelace', avatarUrl: 'https://a/1' },
          { name: 'inv', email: 'new@example.com', type: 'invitation' },
        ],
      ],
      ['globex', [{ name: 'u2', email: 'grace@example.com' }]],
    ]);

    expect(toMemberAvatarsByOrg(['acme', 'globex'], membersByOrg)).toEqual({
      acme: [{ name: 'Ada Lovelace', avatarUrl: 'https://a/1' }],
      globex: [{ name: 'grace@example.com', avatarUrl: undefined }],
    });
  });

  test('gives an org missing from the response an empty stack', () => {
    expect(toMemberAvatarsByOrg(['acme'], new Map())).toEqual({ acme: [] });
  });
});
