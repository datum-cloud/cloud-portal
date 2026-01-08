/**
 * Learn more about CSRF protection:
 * @see https://github.com/sergiodxa/remix-utils?tab=readme-ov-file#csrf
 */
import { env } from '@/utils/env/env.server';
import { HttpError } from '@/utils/errors';
import { createCookie } from 'react-router';
import { CSRF, CSRFError } from 'remix-utils/csrf/server';

export const CSRF_COOKIE_KEY = '_csrf';

const cookie = createCookie(CSRF_COOKIE_KEY, {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  secrets: [env.server.sessionSecret],
  secure: env.isProd,
});

export const csrf = new CSRF({ cookie });

export async function validateCSRF(formData: FormData, headers: Headers) {
  try {
    await csrf.validate(formData, headers);
  } catch (err: unknown) {
    if (err instanceof CSRFError) {
      throw new HttpError('Invalid CSRF token - please refresh the page and try again', 403);
    }
    throw err;
  }
}
