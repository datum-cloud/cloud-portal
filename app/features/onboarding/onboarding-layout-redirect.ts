import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

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

  const finishingOnboarding =
    pathname === paths.onboarding.billing || pathname === paths.onboarding.provisioning;

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
