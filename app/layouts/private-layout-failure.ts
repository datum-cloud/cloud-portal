import { loaderFailureRedirect } from '@/utils/auth/require-session.server';

/**
 * Where the private layout sends the user when its loader fails: re-auth back
 * to the same page on an authentication failure, sign out otherwise. See
 * {@link loaderFailureRedirect}.
 */
export function resolvePrivateLayoutFailureRedirect(error: unknown, request: Request): string {
  return loaderFailureRedirect(error, request);
}
