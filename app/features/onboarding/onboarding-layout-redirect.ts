import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Steps that finish setting up an org: billing, applying for payment terms
 * instead of adding a card, and provisioning the first project. Users who
 * already have orgs can still reach these.
 */
export function isFinishingOnboardingPath(pathname: string): boolean {
  return (
    pathname === paths.onboarding.billing ||
    pathname === paths.onboarding.paymentTerms ||
    pathname === paths.onboarding.provisioning
  );
}

export type OnboardingLayoutRedirectInput = {
  /** Document pathname (use {@link getDocumentPathname} — not the raw `*.data` URL). */
  pathname: string;
  hasExistingOrgs: boolean;
  nameReviewRequired: boolean;
  requestedOrgId?: string;
  /**
   * Ownership of `requestedOrgId`. Only consulted when finishing billing/provisioning
   * for a specific org; pass `true` when no owner check applies.
   */
  isOwnerOfRequestedOrg?: boolean;
};

/**
 * Where the onboarding layout should send the user, or `null` to render the
 * requested onboarding step.
 *
 * Existing-org users resuming billing setup must stay on billing when
 * `pathname` is the document path (`/onboarding/billing`). Comparing a
 * single-fetch `*.data` path here incorrectly returns home — that was the
 * soft-nav bounce in #1415.
 */
export function resolveOnboardingLayoutRedirect(
  input: OnboardingLayoutRedirectInput
): string | null {
  const {
    pathname,
    hasExistingOrgs,
    nameReviewRequired,
    requestedOrgId,
    isOwnerOfRequestedOrg = true,
  } = input;

  const finishingOnboarding = isFinishingOnboardingPath(pathname);

  if (!hasExistingOrgs) {
    if (nameReviewRequired) {
      if (pathname !== paths.onboarding.profile) {
        return paths.onboarding.profile;
      }
    } else if (pathname === paths.onboarding.profile) {
      return paths.onboarding.account;
    }
    return null;
  }

  if (nameReviewRequired) {
    if (pathname !== paths.onboarding.profile) {
      return paths.onboarding.profile;
    }
    return null;
  }

  if (finishingOnboarding) {
    if (requestedOrgId) {
      if (!isOwnerOfRequestedOrg) {
        return getPathWithParams(paths.org.detail.setupRequired, { orgId: requestedOrgId });
      }
      return null;
    }
    if (pathname === paths.onboarding.billing) {
      return paths.home;
    }
    return null;
  }

  return paths.home;
}
