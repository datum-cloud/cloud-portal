/**
 * Learn more about CSRF protection:
 * @see https://github.com/sergiodxa/remix-utils?tab=readme-ov-file#csrf
 */
import { CustomError } from './errorHandle'
import { createCookie } from 'react-router'
import { CSRF, CSRFError } from 'remix-utils/csrf/server'

export const CSRF_COOKIE_KEY = '_csrf'

const cookie = createCookie(CSRF_COOKIE_KEY, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  secrets: [process.env.SESSION_SECRET || 'NOT_A_STRONG_SECRET'],
  secure: process.env.NODE_ENV === 'production',
})

export const csrf = new CSRF({ cookie })

export async function validateCSRF(formData: FormData, headers: Headers) {
  try {
    await csrf.validate(formData, headers)
  } catch (err: unknown) {
    if (err instanceof CSRFError) {
      throw new CustomError(
        'Invalid CSRF token - please refresh the page and try again',
        403,
      )
    }
    throw err
  }
}
