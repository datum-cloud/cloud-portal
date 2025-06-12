import { ForbiddenError } from '../errors';
import { csrfCookie } from '@/utils/cookies/csrf';
import { CSRF, CSRFError } from 'remix-utils/csrf/server';

export const csrf = new CSRF({ cookie: csrfCookie });

export async function validateCSRF(formData: FormData, headers: Headers) {
  try {
    await csrf.validate(formData, headers);
  } catch (err: unknown) {
    if (err instanceof CSRFError) {
      throw new ForbiddenError('CSRF token validation failed', 'CSRF_VALIDATION_ERROR');
    }
    throw err;
  }
}
