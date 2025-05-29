import { isProduction } from '@/utils/misc';
import { createCookie, createCookieSessionStorage } from 'react-router';

/**
 * Session key for the id_token cookie
 */
export const ID_TOKEN_KEY = '_id_token';

/**
 * Id token cookie configuration
 */
export const idTokenCookie = createCookie(ID_TOKEN_KEY, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 1, // 1 day
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
  secure: isProduction(),
});

/**
 * Creates a session storage based on the id_token cookie.
 */
export const idTokenSessionStorage = createCookieSessionStorage({
  cookie: idTokenCookie,
});

/**
 * Type for the response object from id_token session operations
 */
type IdTokenSessionResponse = {
  idToken?: string;
  headers: Headers;
};

/**
 * Creates a session response with the provided id_token and cookie header
 * @param idToken ID Token to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with id_token and headers
 */
const createIdTokenSessionResponse = (
  idToken: string | undefined,
  cookieHeader: string
): IdTokenSessionResponse => ({
  ...(idToken ? { idToken } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

/**
 * Sets id_token in the cookie-based session
 * @param request Request object
 * @param idToken ID Token to store
 * @returns Response with id_token and session headers
 */
export async function setIdTokenSession(
  request: Request,
  idToken: string
): Promise<IdTokenSessionResponse> {
  const session = await idTokenSessionStorage.getSession(request.headers.get('Cookie'));
  session.set(ID_TOKEN_KEY, idToken);
  const cookieHeader = await idTokenSessionStorage.commitSession(session);
  return createIdTokenSessionResponse(idToken, cookieHeader);
}

/**
 * Gets id_token from the cookie-based session
 * @param request Request object
 * @returns Response with id_token and session headers
 */
export async function getIdTokenSession(request: Request): Promise<IdTokenSessionResponse> {
  const session = await idTokenSessionStorage.getSession(request.headers.get('Cookie'));
  const idToken = session.get(ID_TOKEN_KEY);
  const cookieHeader = await idTokenSessionStorage.commitSession(session);
  return createIdTokenSessionResponse(idToken, cookieHeader);
}

/**
 * Destroys the id_token session
 * @param request Request object
 * @returns Response with headers for destroying the id_token session
 */
export async function destroyIdTokenSession(request: Request): Promise<IdTokenSessionResponse> {
  const session = await idTokenSessionStorage.getSession(request.headers.get('Cookie'));
  const cookieHeader = await idTokenSessionStorage.destroySession(session);
  return createIdTokenSessionResponse(undefined, cookieHeader);
}
