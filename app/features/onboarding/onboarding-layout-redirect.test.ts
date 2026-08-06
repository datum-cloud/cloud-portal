import { resolveOnboardingLayoutRedirect } from './onboarding-layout-redirect';
import { paths } from '@/utils/config/paths.config';
import { getDocumentPathname, getPathWithParams } from '@/utils/helpers/path.helper';
import { describe, expect, it } from 'bun:test';

describe('resolveOnboardingLayoutRedirect (legacy resume / #1415)', () => {
  it('keeps owners on billing after soft-nav when pathname is normalized', () => {
    const request = new Request(
      'http://localhost/onboarding/billing.data?orgId=personal-org-02f2388c&_routes=routes/onboarding/layout,routes/onboarding/billing'
    );
    const pathname = getDocumentPathname(request);

    expect(pathname).toBe(paths.onboarding.billing);
    expect(
      resolveOnboardingLayoutRedirect({
        pathname,
        hasExistingOrgs: true,
        nameReviewRequired: false,
        requestedOrgId: 'personal-org-02f2388c',
        isOwnerOfRequestedOrg: true,
      })
    ).toBeNull();
  });

  it('bounces to home if a raw *.data pathname is compared (the pre-fix bug)', () => {
    expect(
      resolveOnboardingLayoutRedirect({
        pathname: '/onboarding/billing.data',
        hasExistingOrgs: true,
        nameReviewRequired: false,
        requestedOrgId: 'personal-org-02f2388c',
        isOwnerOfRequestedOrg: true,
      })
    ).toBe(paths.home);
  });

  it('sends non-owners to setup-required when resuming a specific org', () => {
    const pathname = getDocumentPathname(
      new Request('http://localhost/onboarding/billing.data?orgId=acme')
    );

    expect(
      resolveOnboardingLayoutRedirect({
        pathname,
        hasExistingOrgs: true,
        nameReviewRequired: false,
        requestedOrgId: 'acme',
        isOwnerOfRequestedOrg: false,
      })
    ).toBe(getPathWithParams(paths.org.detail.setupRequired, { orgId: 'acme' }));
  });

  it('sends existing-org users home when they hit billing with no orgId', () => {
    expect(
      resolveOnboardingLayoutRedirect({
        pathname: paths.onboarding.billing,
        hasExistingOrgs: true,
        nameReviewRequired: false,
      })
    ).toBe(paths.home);
  });
});
