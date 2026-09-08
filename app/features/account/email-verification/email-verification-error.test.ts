import { EMAIL_NOT_VERIFIED_CAUSE, isEmailNotVerifiedDenial } from './email-verification-error';
import { describe, expect, it } from 'bun:test';

const denial = JSON.stringify({
  kind: 'Status',
  status: 'Failure',
  code: 403,
  message: 'email address for "a@b.com" is not verified',
  details: { causes: [{ type: EMAIL_NOT_VERIFIED_CAUSE, message: 'not verified' }] },
});

describe('isEmailNotVerifiedDenial', () => {
  it("matches milo's verification denial", () => {
    expect(isEmailNotVerifiedDenial(denial)).toBe(true);
  });

  it('ignores a suspension denial', () => {
    const suspended = JSON.stringify({
      code: 403,
      details: { causes: [{ type: 'ProjectSuspended' }] },
    });
    expect(isEmailNotVerifiedDenial(suspended)).toBe(false);
  });

  it('does not match on message text alone', () => {
    // The whole point of the typed channel: a 403 that merely mentions
    // verification must not trigger a refresh-and-retry.
    const lookalike = JSON.stringify({
      code: 403,
      message: 'email address is not verified',
      details: { causes: [] },
    });
    expect(isEmailNotVerifiedDenial(lookalike)).toBe(false);
  });

  it('returns false for a non-JSON body rather than throwing', () => {
    // Upstream can return HTML from a gateway; the proxy must still forward
    // the original 403 instead of 500ing on a parse error.
    expect(isEmailNotVerifiedDenial('<html>502</html>')).toBe(false);
  });

  it('returns false when details are absent', () => {
    expect(isEmailNotVerifiedDenial(JSON.stringify({ code: 403 }))).toBe(false);
  });
});
