import { MiddlewareContext, NextFunction } from './middleware';
import { createUserService, RegistrationApproval } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { redirect } from 'react-router';

/**
 * Registration approval middleware that checks if a user's registration is approved
 * and redirects to waitlist if not approved
 *
 * @param ctx - The middleware context containing request and app context
 * @param next - The next middleware function to call if approved
 * @returns Response from either the next middleware or a redirect to waitlist
 */
export async function registrationApprovalMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction
): Promise<Response> {
  const { request } = ctx;
  const url = new URL(request.url);

  // Allowed paths that don't require registration approval
  const allowedPaths = [paths.waitlist, paths.auth.logOut];

  // If already on an allowed path, proceed
  if (allowedPaths.includes(url.pathname)) {
    return next();
  }

  try {
    // Get session to retrieve user ID
    const { session } = await getSession(request);

    if (!session?.sub) {
      // No session, let authMiddleware handle it
      return next();
    }

    // Use user service directly instead of internal API call
    // Services now use global axios client with AsyncLocalStorage
    const userService = createUserService();

    const user = await userService.get(session.sub);

    if (!user) {
      // If user fetch fails, proceed to next middleware
      // The private layout will handle the error
      return next();
    }

    // Check if user's registration is approved
    if (user.registrationApproval !== RegistrationApproval.Approved) {
      // Redirect to waitlist if not approved
      return redirect(paths.waitlist);
    }

    // User is approved, proceed to next middleware
    return next();
  } catch (error) {
    // If any error occurs, proceed to next middleware
    // Let the application handle errors appropriately
    console.error('Registration approval middleware error:', error);
    return next();
  }
}
