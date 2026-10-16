import { generateHtpasswd, parseHtpasswdHashes } from './http-proxy.adapter';
import { basicAuthSchema } from './http-proxy.schema';
import { describe, expect, it } from 'bun:test';

const toSecret = (htpasswd: string) => ({ data: { '.htpasswd': btoa(htpasswd) } });

// SHA-1 of "secret", base64-encoded.
const SECRET_HASH = '{SHA}5en6G6MezRroT3XKqkdPOmY/BfQ=';

describe('parseHtpasswdHashes', () => {
  it('maps each username to its stored hash', () => {
    const hashes = parseHtpasswdHashes(toSecret(`datum:${SECRET_HASH}\nkev:{SHA}abc=`));
    expect(hashes.get('datum')).toBe(SECRET_HASH);
    expect(hashes.get('kev')).toBe('{SHA}abc=');
  });

  it('returns an empty map for a missing or unreadable Secret', () => {
    expect(parseHtpasswdHashes(null).size).toBe(0);
    expect(parseHtpasswdHashes({ data: { '.htpasswd': '!!not base64!!' } }).size).toBe(0);
  });
});

describe('generateHtpasswd', () => {
  it('hashes new passwords', async () => {
    expect(await generateHtpasswd([{ username: 'datum', password: 'secret' }])).toBe(
      `datum:${SECRET_HASH}`
    );
  });

  it('keeps the stored hash when an existing user leaves the password blank', async () => {
    const existing = new Map([['kev', '{SHA}abc=']]);
    const htpasswd = await generateHtpasswd(
      [
        { username: 'kev', password: '', originalUsername: 'kev' },
        { username: 'datum', password: 'secret' },
      ],
      existing
    );
    expect(htpasswd).toBe(`kev:{SHA}abc=\ndatum:${SECRET_HASH}`);
  });

  it('keeps the stored hash across a rename', async () => {
    const existing = new Map([['kev', '{SHA}abc=']]);
    expect(
      await generateHtpasswd(
        [{ username: 'kevin', password: '', originalUsername: 'kev' }],
        existing
      )
    ).toBe('kevin:{SHA}abc=');
  });

  it('rejects a blank password with no stored hash', async () => {
    await expect(generateHtpasswd([{ username: 'new', password: '' }])).rejects.toThrow(
      'Enter a password for user "new".'
    );
  });
});

describe('basicAuthSchema', () => {
  it('lets existing users leave the password blank', () => {
    const result = basicAuthSchema.safeParse({
      enabled: true,
      users: [{ username: 'kev', password: '', originalUsername: 'kev' }],
    });
    expect(result.success).toBe(true);
  });

  it('requires a password for new users', () => {
    const result = basicAuthSchema.safeParse({
      enabled: true,
      users: [{ username: 'new', password: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('still enforces the minimum length when an existing user types a password', () => {
    const result = basicAuthSchema.safeParse({
      enabled: true,
      users: [{ username: 'kev', password: 'ab', originalUsername: 'kev' }],
    });
    expect(result.success).toBe(false);
  });
});
