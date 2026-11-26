import { getDnssecAlertCopy, isDnssecAlertRisk } from './dnssec-alert-copy';
import { describe, expect, it } from 'vitest';

const BEFORE_SWITCH_BODY =
  "example.com has a DNSSEC (DS) record, and Datum doesn't sign DNS answers. Remove it at Namecheap before you switch nameservers, or most visitors won't reach your domain.";
const BROKEN_BODY =
  "Its registry still has a DNSSEC (DS) record, and Datum doesn't sign DNS answers. Remove the record at Namecheap. Visitors get back in once resolvers drop the cached record.";

const body = (copy: ReturnType<typeof getDnssecAlertCopy>) =>
  `${copy?.bodyBefore}${copy?.registrarLabel}${copy?.bodyAfter}`;

describe('getDnssecAlertCopy', () => {
  it('builds the destructive alert for on-broken', () => {
    const copy = getDnssecAlertCopy('on-broken', 'example.com', 'Namecheap');
    expect(copy?.variant).toBe('destructive');
    expect(copy?.title).toBe("Most visitors can't reach example.com");
    expect(body(copy)).toBe(BROKEN_BODY);
  });

  it('builds the warning alert for on-before-switch', () => {
    const copy = getDnssecAlertCopy('on-before-switch', 'example.com', 'Namecheap');
    expect(copy?.variant).toBe('warning');
    expect(copy?.title).toBe('Remove DNSSEC before you switch to Datum');
    expect(body(copy)).toBe(BEFORE_SWITCH_BODY);
  });

  it('falls back to "your registrar" without a registrar name', () => {
    expect(getDnssecAlertCopy('on-broken', 'example.com')?.registrarLabel).toBe('your registrar');
    expect(getDnssecAlertCopy('on-before-switch', 'example.com', '')?.registrarLabel).toBe(
      'your registrar'
    );
  });

  it.each(['off', 'unknown', 'parent', 'on-not-hosted'] as const)('returns null for %s', (risk) => {
    expect(getDnssecAlertCopy(risk, 'example.com', 'Namecheap')).toBeNull();
  });

  it.each(['on-broken', 'on-before-switch'] as const)(
    'has no dashes or undefined in %s',
    (risk) => {
      const copy = getDnssecAlertCopy(risk, 'example.com');
      const text = Object.values(copy ?? {}).join(' ');
      expect(text).not.toMatch(/[—–]/);
      expect(text).not.toContain('undefined');
    }
  );
});

describe('isDnssecAlertRisk', () => {
  it('is true only for on-broken and on-before-switch', () => {
    expect(isDnssecAlertRisk('on-broken')).toBe(true);
    expect(isDnssecAlertRisk('on-before-switch')).toBe(true);
    expect(isDnssecAlertRisk('off')).toBe(false);
    expect(isDnssecAlertRisk('unknown')).toBe(false);
    expect(isDnssecAlertRisk('parent')).toBe(false);
    expect(isDnssecAlertRisk('on-not-hosted')).toBe(false);
  });
});
