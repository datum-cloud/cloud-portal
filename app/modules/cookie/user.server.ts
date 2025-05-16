import { IUser } from '@/resources/interfaces/user.interface'
import { createCookie, createCookieSessionStorage } from 'react-router'

export const USER_SESSION_KEY = '_user'
export const userCookie = createCookie(USER_SESSION_KEY, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 1, // 1 days
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
})

export const userSessionStorage = createCookieSessionStorage({ cookie: userCookie })

/**
 * Type for the response object from user session operations
 */
type UserSessionResponse = {
  user?: IUser
  headers: Headers
}

/**
 * Creates a session response with the provided data and cookie header
 * @param user User data to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with session data and headers
 */
const createUserResponse = (
  user: IUser | undefined,
  cookieHeader: string,
): UserSessionResponse => ({
  ...(user ? { user } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
})

/**
 * Gets the user data from the session
 * @param request Request object
 * @returns User data and session headers
 */
export async function getUserSession(request: Request): Promise<UserSessionResponse> {
  const session = await userSessionStorage.getSession(request.headers.get('Cookie'))
  const user = session.get(USER_SESSION_KEY)
  const cookieHeader = await userSessionStorage.commitSession(session)

  return createUserResponse(user, cookieHeader)
}

/**
 * Sets user data in the session
 * @param request Request object
 * @param user User data
 * @returns Updated user data and session headers
 */
export async function setUserSession(
  request: Request,
  user: IUser,
): Promise<UserSessionResponse> {
  const session = await userSessionStorage.getSession(request.headers.get('Cookie'))
  session.set(USER_SESSION_KEY, user)
  const cookieHeader = await userSessionStorage.commitSession(session)

  return createUserResponse(user, cookieHeader)
}

/**
 * Destroys the user session
 * @param request Request object
 * @returns Response with headers for destroying the session
 */
export async function destroyUserSession(request: Request): Promise<UserSessionResponse> {
  const session = await userSessionStorage.getSession(request.headers.get('Cookie'))
  const cookieHeader = await userSessionStorage.destroySession(session)

  return createUserResponse(undefined, cookieHeader)
}
