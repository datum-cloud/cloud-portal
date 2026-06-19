import { destroyAllAuthCookies } from '@/utils/auth/auth.utils';
import { describe, test, expect } from 'bun:test';

describe('destroyAllAuthCookies', () => {
  test('returns combined Set-Cookie headers clearing all auth cookies', async () => {
    const request = new Request('http://localhost:3001/logout', { headers: { Cookie: '' } });
    const headers = await destroyAllAuthCookies(request);
    const setCookies = headers.getSetCookie();
    // one Set-Cookie per destroyed cookie (session, refresh, org, project, id_token, alert)
    expect(setCookies.length).toBeGreaterThanOrEqual(6);
    // each is an expiry/clear (Max-Age=0 or Expires in the past)
    expect(setCookies.every((c) => /Max-Age=0|Expires=/i.test(c))).toBe(true);
  });
});
