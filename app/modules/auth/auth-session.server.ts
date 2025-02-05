import { createCookieSessionStorage } from '@remix-run/node'

export const AUTH_SESSION_KEY = '_auth'
export const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: AUTH_SESSION_KEY,
    path: '/',
    domain: process.env.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 1, // 1 days
    secrets: [process.env.SESSION_SECRET || 'NOT_A_STRONG_SECRET'],
    secure: process.env.NODE_ENV === 'production',
  },
})

export const { getSession, commitSession, destroySession } = authSessionStorage
