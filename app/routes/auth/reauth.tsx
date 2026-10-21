import { startReauth } from '@/utils/auth/reauth.server';
import { LoaderFunctionArgs } from 'react-router';

/**
 * Re-auth entry point for an expired session: `/auth/reauth?returnTo=/org/acme`.
 * Works with a stale session cookie present, unlike `/login`, which would
 * treat the cookie as signed in. See {@link startReauth}.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const returnTo = new URL(request.url).searchParams.get('returnTo') ?? '';
  return startReauth(request, returnTo);
}
