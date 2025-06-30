import { IOrganization } from '@/resources/interfaces/organization.interface';
import { isProduction } from '@/utils/misc';
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
  org?: IOrganization;
  headers: Headers;
};

/**
 * Creates a session response with the provided data and cookie header
 * @param sessionData Session data to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with session data and headers
 */
const createOrgResponse = (
  org: IOrganization | undefined,
  cookieHeader: string
): OrgSessionResponse => ({
  ...(org ? { org: org } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

/**
 * Gets the organization session from the request
 * @param request Request object
 * @returns Organization data and session headers
 */
export async function getOrgSession(request: Request): Promise<OrgSessionResponse> {
  const session = await orgSessionStorage.getSession(request.headers.get('Cookie'));
  const data = session.get(ORG_SESSION_KEY);
  const cookieHeader = await orgSessionStorage.commitSession(session);

  return createOrgResponse(data, cookieHeader);
}

/**
 * Sets the organization session in the request
 * @param request Request object
 * @param org Organization data
 * @returns Updated organization data and session headers
 */
export async function setOrgSession(
  request: Request,
  org: IOrganization
): Promise<OrgSessionResponse> {
  const session = await orgSessionStorage.getSession(request.headers.get('Cookie'));
  session.set(ORG_SESSION_KEY, org);

  const cookieHeader = await orgSessionStorage.commitSession(session);

  return createOrgResponse(org, cookieHeader);
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
