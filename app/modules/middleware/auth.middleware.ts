import { NextFunction } from './middleware'
import { isAuthenticated } from '@/modules/cookie/session.server'

/**
 * Authentication middleware that checks if a user is authenticated
 * and either proceeds to the next middleware or redirects to login
 *
 * @param request - The incoming request object
 * @param next - The next middleware function to call if authenticated
 * @returns Response from either the next middleware or a redirect
 */
export async function authMiddleware(
  request: Request,
  next: NextFunction,
): Promise<Response> {
  const result = await isAuthenticated(request)

  // If result is a Response object (redirect), return it directly
  if (result instanceof Response) {
    return result
  }

  // If result is true (user is authenticated), proceed to next middleware
  if (result === true) {
    return next()
  }

  // This should not happen if isAuthenticated is properly implemented,
  // but added as a fallback for type safety
  throw new Error('Authentication check returned an unexpected result')
}
