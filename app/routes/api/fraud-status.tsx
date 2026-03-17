import { createUserService } from '@/resources/users';
import { RegistrationApproval } from '@/resources/users/user.schema';
import { getSession } from '@/utils/cookies';
import { data, type LoaderFunctionArgs } from 'react-router';

/**
 * Lightweight JSON polling endpoint for the /verifying page.
 *
 * This route is intentionally outside the private layout to avoid an infinite
 * redirect loop: the private layout runs fraudStatusMiddleware which can redirect
 * to /verifying, which polls this endpoint. If this route were inside the private
 * layout, the layout loader would run fraudStatusMiddleware again on every poll,
 * causing infinite redirects.
 *
 * Returns:
 * - 401 { status: 'unauthenticated' } — no valid session
 * - 200 { status: 'pending' } — user not yet in system or registrationApproval is Pending
 * - 200 { status: 'completed', decision: 'NONE' } — registrationApproval is Approved
 * - 200 { status: 'completed', decision: 'REVIEW' } — registrationApproval is Rejected
 * - 200 { status: 'completed', decision: 'DEACTIVATE' } — user state is Inactive
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return data({ status: 'unauthenticated' }, { status: 401 });
  }

  try {
    const user = await createUserService().get(session.sub);

    if (user.state === 'Inactive') {
      return data({ status: 'completed', decision: 'DEACTIVATE' });
    }

    if (user.registrationApproval === RegistrationApproval.Approved) {
      return data({ status: 'completed', decision: 'NONE' });
    }

    if (user.registrationApproval === RegistrationApproval.Rejected) {
      return data({ status: 'completed', decision: 'REVIEW' });
    }

    // Pending or undefined
    return data({ status: 'pending' });
  } catch {
    // Fail-open: user not yet provisioned or API unavailable — continue polling
    return data({ status: 'pending' });
  }
}
