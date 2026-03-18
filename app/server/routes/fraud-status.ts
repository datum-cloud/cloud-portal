import type { Variables } from '../types';
import { createUserService } from '@/resources/users';
import { RegistrationApproval } from '@/resources/users/user.schema';
import { Hono } from 'hono';

const fraudStatus = new Hono<{ Variables: Variables }>();

/**
 * GET /api/fraud-status
 *
 * Lightweight polling endpoint used by the /verifying page to check whether
 * the fraud evaluation has completed and what decision was made.
 *
 * Returns:
 * - 200 { status: 'pending' }                           — not yet in system or approval is Pending
 * - 200 { status: 'completed', decision: 'ACCEPTED' }   — registrationApproval is Approved
 * - 200 { status: 'completed', decision: 'REVIEW' }     — registrationApproval is Rejected
 * - 200 { status: 'completed', decision: 'DEACTIVATE' } — user state is Inactive
 */
fraudStatus.get('/', async (c) => {
  const session = c.get('session')!;

  try {
    const user = await createUserService().get(session.sub!);

    if (user.state === 'Inactive') {
      return c.json({ status: 'completed', decision: 'DEACTIVATE' });
    }

    if (user.registrationApproval === RegistrationApproval.Approved) {
      return c.json({ status: 'completed', decision: 'ACCEPTED' });
    }

    if (user.registrationApproval === RegistrationApproval.Rejected) {
      return c.json({ status: 'completed', decision: 'REVIEW' });
    }

    // Pending or undefined — evaluation still in progress
    return c.json({ status: 'pending' });
  } catch {
    // Fail-open: user not yet provisioned or API unavailable — continue polling
    return c.json({ status: 'pending' });
  }
});

export { fraudStatus as fraudStatusRoutes };
