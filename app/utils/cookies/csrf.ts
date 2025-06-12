/**
 * Learn more about CSRF protection:
 * @see https://github.com/sergiodxa/remix-utils?tab=readme-ov-file#csrf
 */
import { isProduction } from '@/utils/helpers/misc.helper';
import { createCookie } from 'react-router';

export const CSRF_COOKIE_KEY = '_csrf';
export const csrfCookie = createCookie(CSRF_COOKIE_KEY, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  secrets: [process.env.SESSION_SECRET || 'NOT_A_STRONG_SECRET'],
  secure: isProduction(),
});
