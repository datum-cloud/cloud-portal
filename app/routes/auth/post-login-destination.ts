import { isValidRedirectTarget } from '@/utils/cookies/redirect-intent.server';

/**
 * Decides where to send the user after a successful OIDC login.
 *
 * Pure function so the decision (as opposed to the header/cookie plumbing
 * around it in `callback.tsx`) can be pinned with unit tests: a future
 * refactor that sanitizes or re-resolves the destination before `redirect()`
 * can't silently break allowlisted website return URLs or loosen validation
 * without breaking a test here.
 *
 * @param intentPath The stored redirect-intent path/URL, if any
 * @param allowedOrigins Absolute-URL origins allowed as redirect targets
 * @param fallback Destination to use when there is no valid intent
 * @returns The intent when it validates, otherwise `fallback`
 */
export function resolvePostLoginDestination(
  intentPath: string | null | undefined,
  allowedOrigins: string[],
  fallback: string
): string {
  if (!intentPath) return fallback;
  return isValidRedirectTarget(intentPath, allowedOrigins) ? intentPath : fallback;
}
