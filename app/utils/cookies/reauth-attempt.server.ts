import { env } from '@/utils/env/env.server';
import { createCookie } from 'react-router';

/** How long a re-auth counts as recent: one silent login round trip, with margin. */
export const REAUTH_ATTEMPT_MAX_AGE_SECONDS = 60;

/**
 * Marks that this browser started a re-auth within the last minute. A second
 * re-auth inside that window means the fresh token was rejected again, so the
 * caller signs out instead of looping through silent logins. Holds only a flag.
 */
const reauthAttemptCookie = createCookie('_reauth_attempt', {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  secure: env.isProd,
  maxAge: REAUTH_ATTEMPT_MAX_AGE_SECONDS,
});

/** True when this browser started a re-auth within the last minute. */
export async function hasRecentReauthAttempt(request: Request): Promise<boolean> {
  return (await reauthAttemptCookie.parse(request.headers.get('Cookie'))) === true;
}

/** Set-Cookie value that records a re-auth starting now. */
export function markReauthAttempt(): Promise<string> {
  return reauthAttemptCookie.serialize(true);
}

/** Set-Cookie value that drops the re-auth marker. */
export function clearReauthAttempt(): Promise<string> {
  return reauthAttemptCookie.serialize('', { maxAge: 0 });
}
