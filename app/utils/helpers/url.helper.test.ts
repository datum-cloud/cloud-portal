import { toExternalHref } from './url.helper';
import { describe, expect, test } from 'bun:test';

describe('toExternalHref', () => {
  test('keeps an https registrar URL as-is', () => {
    expect(toExternalHref('https://www.namecheap.com/')).toBe('https://www.namecheap.com/');
  });

  test('keeps an http URL so we do not break registrars without TLS redirects', () => {
    expect(toExternalHref('http://www.godaddy.com')).toBe('http://www.godaddy.com/');
  });

  test('prepends https to a bare host as reported by some RDAP servers', () => {
    expect(toExternalHref('www.namecheap.com')).toBe('https://www.namecheap.com/');
  });

  test('trims surrounding whitespace before parsing', () => {
    expect(toExternalHref('  https://porkbun.com  ')).toBe('https://porkbun.com/');
  });

  test('returns null for empty or missing input', () => {
    expect(toExternalHref(undefined)).toBeNull();
    expect(toExternalHref(null)).toBeNull();
    expect(toExternalHref('')).toBeNull();
    expect(toExternalHref('   ')).toBeNull();
  });

  test('refuses non-http schemes so a bad registrar record cannot inject a script link', () => {
    expect(toExternalHref('javascript:alert(1)')).toBeNull();
    expect(toExternalHref('data:text/html,hi')).toBeNull();
    expect(toExternalHref('mailto:abuse@example.com')).toBeNull();
  });

  test('refuses values that are not a hostname', () => {
    expect(toExternalHref('Private')).toBeNull();
    expect(toExternalHref('not a url')).toBeNull();
  });
});
