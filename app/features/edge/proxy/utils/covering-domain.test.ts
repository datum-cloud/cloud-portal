import { findCoveringDomain } from './covering-domain';
import { describe, expect, test } from 'bun:test';

const domains = [
  { name: 'mdj', domainName: 'mdj-test.online' },
  { name: 'app', domainName: 'app.mdj-test.online' },
];

describe('findCoveringDomain', () => {
  test('picks the most specific domain covering a wildcard base', () => {
    expect(findCoveringDomain(domains, '*.app.mdj-test.online')?.name).toBe('app');
    expect(findCoveringDomain(domains, '*.mdj-test.online')?.name).toBe('mdj');
    expect(findCoveringDomain(domains, 'www.mdj-test.online')?.name).toBe('mdj');
  });

  test('returns undefined when nothing covers the hostname', () => {
    expect(findCoveringDomain(domains, '*.example.com')).toBeUndefined();
  });
});

describe('trailing dots and wildcards', () => {
  test('a trailing dot on either side still matches', () => {
    expect(findCoveringDomain(domains, '*.app.mdj-test.online.')?.name).toBe('app');
    expect(
      findCoveringDomain([{ name: 'z', domainName: 'mdj-test.online.' }], 'www.mdj-test.online')
        ?.name
    ).toBe('z');
  });
});
