import { NextFunction } from './middleware';
import { authenticator } from '@/modules/auth/auth.server';
import { AuthorizationError } from '@/utils/errors';

/**
 * Authentication middleware that checks if a user is authenticated
 * and either proceeds to the next middleware or redirects to login
 *
 * @param request - The incoming request object
 * @param next - The next middleware function to call if authenticated
 * @returns Response from either the next middleware or a redirect
 */
export async function authMiddleware(request: Request, next: NextFunction): Promise<Response> {
  const result = await authenticator.isAuthenticated(request);

  // If result is true (user is authenticated), proceed to next middleware
  if (result) {
    return next();
  }

  // This should not happen if isAuthenticated is properly implemented,
  // but added as a fallback for type safety
  throw new AuthorizationError('Authentication check returned an unexpected result');
}
