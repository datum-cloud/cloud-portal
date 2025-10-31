import { NextFunction } from './middleware';
import { getSession } from '@/modules/cookie/session.server';
import { IUser, RegistrationApproval } from '@/resources/interfaces/user.interface';
import { ROUTE_PATH as USER_API } from '@/routes/api/user/index';
import { paths } from '@/utils/config/paths.config';
import { redirect } from 'react-router';

/**
 * Registration approval middleware that checks if a user's registration is approved
 * and redirects to waitlist if not approved
 *
 * @param request - The incoming request object
 * @param next - The next middleware function to call if approved
 * @returns Response from either the next middleware or a redirect to waitlist
 */
export async function registrationApprovalMiddleware(
  request: Request,
  next: NextFunction
): Promise<Response> {
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

    // Fetch user details using internal API
    const userResponse = await fetch(`${process.env.APP_URL}${USER_API}`, {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('Cookie') || '',
      },
    });

    if (!userResponse.ok) {
      // If user fetch fails, proceed to next middleware
      // The private layout will handle the error
      return next();
    }

    const userResult = await userResponse.json();

    if (!userResult.success) {
      // If user fetch is not successful, proceed to next middleware
      return next();
    }

    const user: IUser = userResult.data as IUser;

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
