// sessions.server.tsx
import { isProduction } from './misc'
import { createCookieSessionStorage } from 'react-router'
import { createThemeSessionResolver } from 'remix-themes'

export const THEME_SESSION_KEY = '__remix-themes'
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: THEME_SESSION_KEY,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
    secure: isProduction(),
  },
})

export const themeSessionResolver = createThemeSessionResolver(sessionStorage)
