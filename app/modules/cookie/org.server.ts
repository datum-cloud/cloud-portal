import { isProduction } from '@/utils/environment';
import { createCookie, createCookieSessionStorage } from 'react-router';

/**
 * Session key for the organization cookie
 */
export const ORG_SESSION_KEY = '_org';

/**
 * Organization cookie configuration
 */
export const orgCookie = createCookie(ORG_SESSION_KEY, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 1, // 1 days
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
  secure: isProduction(),
});

export const orgSessionStorage = createCookieSessionStorage({ cookie: orgCookie });

/**
 * Type for the response object from auth session operations
 */
type OrgSessionResponse = {
  orgId?: string;
  headers: Headers;
};

/**
 * Creates a session response with the provided data and cookie header
 * @param sessionData Session data to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with session data and headers
 */
const createOrgResponse = (
  orgId: string | undefined,
  cookieHeader: string
): OrgSessionResponse => ({
  ...(orgId ? { orgId } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

/**
 * Clears the organization session
 * @param request Request object
 * @returns Empty response with cleared session headers
 */
export async function clearOrgSession(request: Request): Promise<OrgSessionResponse> {
  const session = await orgSessionStorage.getSession(request.headers.get('Cookie'));
  session.unset(ORG_SESSION_KEY);
  return createOrgResponse(undefined, await orgSessionStorage.commitSession(session));
}

/**
 * Gets the organization ID from the session
 * @param request Request object
 * @returns Organization ID and session headers
 */
export async function getOrgSession(request: Request): Promise<OrgSessionResponse> {
  const session = await orgSessionStorage.getSession(request.headers.get('Cookie'));
  const orgId = session.get(ORG_SESSION_KEY);
  return createOrgResponse(orgId, await orgSessionStorage.commitSession(session));
}

/**
 * Sets the organization ID in the session
 * @param request Request object
 * @param orgId Organization ID
 * @returns Updated organization ID and session headers
 */
export async function setOrgSession(request: Request, orgId: string): Promise<OrgSessionResponse> {
  const session = await orgSessionStorage.getSession(request.headers.get('Cookie'));
  session.set(ORG_SESSION_KEY, orgId);
  return createOrgResponse(orgId, await orgSessionStorage.commitSession(session));
}

/**
 * Destroys the authentication session
 * @param request Request object
 * @returns Response with headers for destroying the session
 */
export async function destroyOrgSession(request: Request): Promise<OrgSessionResponse> {
  const session = await orgSessionStorage.getSession(request.headers.get('Cookie'));
  const cookieHeader = await orgSessionStorage.destroySession(session);

  return createOrgResponse(undefined, cookieHeader);
}
