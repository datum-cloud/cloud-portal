import { type MiddlewareContext, type NextFunction } from './middleware';
import { isOrgSetupComplete } from '@/features/onboarding/legacy-setup/org-setup-status.server';
import { paths } from '@/utils/config/paths.config';
import { redirect } from 'react-router';

/** `/org/{orgId}/...` — the org detail layout param. */
function orgIdFromPathname(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'org' || !segments[1]) {
    return undefined;
  }
  return segments[1];
}

/**
 * Hard gate when entering an org: redirect to billing setup if that org is
 * missing contact info, a billing account, or an active payment method.
 */
export async function orgLegacySetupMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction
): Promise<Response> {
  const orgId = orgIdFromPathname(new URL(ctx.request.url).pathname);
  if (!orgId) {
    return next();
  }

  try {
    const complete = await isOrgSetupComplete(orgId);
    if (complete) {
      return next();
    }

    const billingUrl = `${paths.onboarding.billing}?orgId=${encodeURIComponent(orgId)}`;
    return redirect(billingUrl);
  } catch {
    // Fail-open — do not block the org if setup checks error unexpectedly.
    return next();
  }
}
