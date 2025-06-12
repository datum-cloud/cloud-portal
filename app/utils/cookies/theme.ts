import { env } from '@/utils/config/env.server';
import { createCookieSessionStorage } from 'react-router';
import { createThemeSessionResolver } from 'remix-themes';

export const THEME_COOKIE_KEY = '_theme';
export const themeCookie = createCookieSessionStorage({
  cookie: {
    name: THEME_COOKIE_KEY,
    path: '/',
    domain: new URL(env.APP_URL).hostname,
    httpOnly: true,
    sameSite: 'lax',
    secrets: [env.SESSION_SECRET],
  },
});
export const themeSessionResolver = createThemeSessionResolver(themeCookie);
