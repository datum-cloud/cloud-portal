import type { Variables } from '../types';
import { createBillingService } from '@/resources/billing';
import { Hono } from 'hono';

const billingStatus = new Hono<{ Variables: Variables }>();

/**
 * GET /api/billing-status
 *
 * Lightweight polling endpoint used by /verifying to detect a webhook-driven
 * BillingAccount state change without waiting for the page to be re-loaded.
 *
 * Returns:
 * - 200 { status: 'not-found' }                 — no BillingAccount yet
 *                                                 (auto-billing-account
 *                                                 controller still racing)
 * - 200 { status: 'needs-payment-method' }      — BA exists but no card
 *                                                 attached; client should
 *                                                 redirect to /billing-setup
 * - 200 { status: 'attached', phase: '…' }      — payment method attached
 */
billingStatus.get('/', async (c) => {
  const session = c.get('session')!;

  try {
    const billing = await createBillingService().getBillingAccountForUser(session.sub!);
    if (!billing) {
      return c.json({ status: 'not-found' });
    }
    if (!billing.paymentMethodAttached) {
      return c.json({ status: 'needs-payment-method' });
    }
    return c.json({ status: 'attached', phase: billing.phase });
  } catch {
    return c.json({ status: 'not-found' });
  }
});

export { billingStatus as billingStatusRoutes };
