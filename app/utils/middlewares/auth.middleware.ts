import { MiddlewareContext, NextFunction } from './middleware';
import { isAuthenticated } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';

/**
 * Authentication middleware that checks if a user is authenticated
 * and either proceeds to the next middleware or redirects to login
 *
 * Uses session from load context when available (already validated by Hono
 * sessionMiddleware) to avoid redundant getSession calls and reduce redirect latency.
 *
 * @param ctx - The middleware context containing request and app context
 * @param next - The next middleware function to call if authenticated
 * @returns Response from either the next middleware or a redirect
 */
export async function authMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction
): Promise<Response> {
  const { request, context } = ctx;

  // Session already validated by Hono sessionMiddleware - skip redundant getSession
  // Verify session has an actual identity (sub), not just a truthy object
  if (context?.session?.sub) {
    return next();
  }

  const result = await isAuthenticated(request);

  // If result is a Response object (redirect), return it directly
  if (result instanceof Response) {
    return result;
  }

  // If result is true (user is authenticated), proceed to next middleware
  if (result === true) {
    return next();
  }

  // This should not happen if isAuthenticated is properly implemented,
  // but added as a fallback for type safety
  throw new AuthenticationError('User is not authenticated');
}
