import { NextFunction, setAuthHeaders } from './middleware';
import { isAuthenticated, isAuthenticatedResult } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers/path.helper';

/**
 * Authentication middleware that checks if a user is authenticated
 * and either proceeds to the next middleware or redirects to login
 *
 * @param request - The incoming request object
 * @param next - The next middleware function to call if authenticated
 * @returns Response from either the next middleware or a redirect
 */
export async function authMiddleware(request: Request, next: NextFunction): Promise<Response> {
  const result = await isAuthenticated(request);

  // If result is a Response object (redirect), return it directly
  if (result instanceof Response) {
    return result;
  }

  // If result is AuthenticatedResult (user is authenticated), proceed to next middleware
  // and merge the auth headers (including refreshed token) with the response headers
  if (isAuthenticatedResult(result)) {
    // Store auth headers in context so withMiddleware can merge them with data() returns
    setAuthHeaders(request, result.headers);

    const response = await next();

    // If response is a Response, merge the auth headers with it
    if (response instanceof Response) {
      const mergedHeaders = combineHeaders(result.headers, response.headers);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: mergedHeaders,
      });
    }

    // If response is not a Response (e.g., data object), withMiddleware will handle merging
    return response;
  }

  // This should not happen if isAuthenticated is properly implemented,
  // but added as a fallback for type safety
  throw new AuthenticationError('User is not authenticated');
}
