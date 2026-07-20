import { type MiddlewareContext, type NextFunction } from './middleware';
import { isOrgSetupComplete } from '@/features/onboarding/legacy-setup/org-setup-status.server';
import { isUserOrgOwner } from '@/resources/members/member-owner';
import { createProjectService } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { redirect } from 'react-router';

/** `/org/{orgId}/...` — the org detail layout param. */
function orgIdFromPathname(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'org' || !segments[1]) {
    return undefined;
  }
  return segments[1];
}

/** `/project/{projectId}/...` — the project detail layout param. */
function projectIdFromPathname(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'project' || !segments[1]) {
    return undefined;
  }
  return segments[1];
}

/**
 * Shared setup gate for a resolved org. Returns a redirect Response when the
 * org still needs billing setup: owners are sent to the billing setup flow;
 * non-owners can't complete it, so they land on the setup-required page that
 * points them at the org's owners. Returns null when the org is complete (or
 * checks error) so the caller can continue.
 */
async function resolveOrgSetupRedirect(orgId: string): Promise<Response | null> {
  const complete = await isOrgSetupComplete(orgId);
  if (complete) {
    return null;
  }

  if (await isUserOrgOwner(orgId)) {
    return redirect(`${paths.onboarding.billing}?orgId=${encodeURIComponent(orgId)}`);
  }

  return redirect(getPathWithParams(paths.org.detail.setupRequired, { orgId }));
}

/**
 * Hard gate when entering an org that still needs billing setup. Applies to
 * every org regardless of type — incomplete orgs are always gated.
 */
export async function orgLegacySetupMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction
): Promise<Response> {
  const pathname = new URL(ctx.request.url).pathname;
  const orgId = orgIdFromPathname(pathname);
  if (!orgId) {
    return next();
  }

  // The setup-required page runs its own checks; letting it through avoids a
  // redirect loop.
  const setupRequiredPath = getPathWithParams(paths.org.detail.setupRequired, { orgId });
  if (pathname === setupRequiredPath) {
    return next();
  }

  // Org general settings stays reachable for incomplete orgs so owners who
  // don't want to add a payment method can still delete the organization
  // (linked from the billing setup resume notice).
  const settingsGeneralPath = getPathWithParams(paths.org.detail.settings.general, { orgId });
  if (pathname === settingsGeneralPath) {
    return next();
  }

  try {
    const response = await resolveOrgSetupRedirect(orgId);
    return response ?? (await next());
  } catch {
    // Fail-open — do not block the org if setup checks error unexpectedly.
    return next();
  }
}

/**
 * Same gate as {@link orgLegacySetupMiddleware}, applied to project routes so
 * that landing directly on a project URL (e.g. a bookmarked deep link) still
 * enforces the owning org's billing setup. The project is fetched to resolve
 * its owning org id; this only runs on project entry/switch (the layout's
 * shouldRevalidate short-circuits intra-project navigation).
 */
export async function projectLegacySetupMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction
): Promise<Response> {
  const pathname = new URL(ctx.request.url).pathname;
  const projectId = projectIdFromPathname(pathname);
  if (!projectId) {
    return next();
  }

  try {
    const project = await createProjectService().get(projectId);
    const orgId = project.organizationId;
    if (!orgId) {
      return next();
    }

    const response = await resolveOrgSetupRedirect(orgId);
    return response ?? (await next());
  } catch {
    // Fail-open — the project loader owns not-found / access errors. Never
    // block a project because the setup pre-check errored.
    return next();
  }
}
