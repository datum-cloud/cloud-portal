import { getDocumentPathname } from './path.helper';
import { describe, expect, it } from 'bun:test';

describe('getDocumentPathname', () => {
  it('strips the single-fetch .data suffix', () => {
    expect(
      getDocumentPathname(new Request('http://localhost/onboarding/billing.data?orgId=acme'))
    ).toBe('/onboarding/billing');
  });

  it('strips nested route .data suffixes', () => {
    expect(getDocumentPathname(new Request('http://localhost/org/acme/projects.data'))).toBe(
      '/org/acme/projects'
    );
    expect(getDocumentPathname(new Request('http://localhost/org/acme/setup-required.data'))).toBe(
      '/org/acme/setup-required'
    );
  });

  it('strips the root /_.data single-fetch path', () => {
    expect(getDocumentPathname(new Request('http://localhost/_.data'))).toBe('/');
  });

  it('leaves document pathnames unchanged', () => {
    expect(getDocumentPathname(new Request('http://localhost/onboarding/billing?orgId=acme'))).toBe(
      '/onboarding/billing'
    );
    expect(getDocumentPathname(new Request('http://localhost/account/organizations'))).toBe(
      '/account/organizations'
    );
  });
});
