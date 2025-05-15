import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { createCookie, createCookieSessionStorage } from 'react-router'

export const AUTH_SESSION_KEY = '_auth'
export const authCookie = createCookie(AUTH_SESSION_KEY, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 1, // 1 days
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
})

export const authSessionStorage = createCookieSessionStorage({
  cookie: authCookie,
})

/**
 * Type for the response object from auth session operations
 */
type AuthSessionResponse<T = unknown> = {
  session?: T
  headers: Headers
}

/**
 * Creates a session response with the provided data and cookie header
 * @param sessionData Session data to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with session data and headers
 */
const createSessionResponse = <T>(
  sessionData: T | undefined,
  cookieHeader: string,
): AuthSessionResponse<T> => ({
  ...(sessionData ? { session: sessionData } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
})

/**
 * Sets authentication session data
 * @param request Request object
 * @param sessionData Session data to store
 * @returns Response with session data and headers
 */
export async function setAuthSession(
  request: Request,
  sessionData: Omit<IAuthSession, 'user'>,
): Promise<AuthSessionResponse<Omit<IAuthSession, 'user'>>> {
  const session = await authSessionStorage.getSession(request.headers.get('Cookie'))
  session.set(AUTH_SESSION_KEY, sessionData)
  const cookieHeader = await authSessionStorage.commitSession(session)

  return createSessionResponse(sessionData, cookieHeader)
}

/**
 * Gets authentication session data
 * @param request Request object
 * @returns Response with session data and headers
 */
export async function getAuthSession(request: Request) {
  const session = await authSessionStorage.getSession(request.headers.get('Cookie'))
  const sessionData = session.get(AUTH_SESSION_KEY)
  const cookieHeader = await authSessionStorage.commitSession(session)

  return createSessionResponse(sessionData, cookieHeader)
}

/**
 * Destroys the authentication session
 * @param request Request object
 * @returns Response with headers for destroying the session
 */
export async function destroyAuthSession(request: Request): Promise<AuthSessionResponse> {
  const session = await authSessionStorage.getSession(request.headers.get('Cookie'))
  const cookieHeader = await authSessionStorage.destroySession(session)

  return createSessionResponse(undefined, cookieHeader)
}
