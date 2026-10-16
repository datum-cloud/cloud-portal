import { buildReauthUrl, returnToForRequest } from './reauth';
import { sessionContext } from '@/server/context';
import { paths } from '@/utils/config/paths.config';
import { AppError } from '@/utils/errors/app-error';
import { redirect, type LoaderFunctionArgs } from 'react-router';

/**
 * Where a loader sends the user when its upstream reads fail.
 *
 * An authentication failure (an expired session or any upstream 401) goes
 * through re-auth so the user lands back on the same page. Every other
 * failure signs out: those errors are not about the session, and restoring the
 * same page would likely fail again.
 *
 * @param error What the loader caught
 * @param request Incoming loader request
 * @returns Redirect target
 */
export function loaderFailureRedirect(error: unknown, request: Request): string {
  if (error instanceof AppError && error.status === 401) {
    return buildReauthUrl(returnToForRequest(request));
  }
  return paths.auth.logOut;
}

/**
 * Returns the signed-in user's id for a loader that needs a session, or throws
 * a redirect that re-authenticates and comes back to the same page.
 *
 * Reads the session the Hono session middleware validated (and refreshed when
 * it could), not the raw cookie: after an expired token that cannot be
 * refreshed, the stale `_session` cookie is still on the request, but the
 * validated session is null. Re-auth keeps the Zitadel session, so the login
 * is usually silent; the Sign out button is the only path that logs out.
 *
 * @param request Incoming loader request
 * @param context Loader context carrying {@link sessionContext}
 * @returns The session's user id (`sub`)
 * @throws Response redirect to `/auth/reauth?returnTo=<this page>`
 */
export async function requireSessionSub(
  request: Request,
  context: LoaderFunctionArgs['context'] | undefined
): Promise<string> {
  const sub = context?.get(sessionContext)?.sub;
  if (sub) return sub;

  throw redirect(buildReauthUrl(returnToForRequest(request)));
}
