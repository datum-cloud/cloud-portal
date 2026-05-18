/**
 * Domain types for the billing.miloapis.com CRDs the portal needs at signup.
 *
 * BillingAccount fields here are a sanitized subset of the full CR. The
 * portal never sees raw card data; everything in `paymentMethod` has
 * already been redacted to BIN / last4 / verification results by the
 * milo-billing Stripe provider.
 */

export const BillingAccountPhase = {
  Provisioning: 'Provisioning',
  Ready: 'Ready',
  Suspended: 'Suspended',
  Archived: 'Archived',
} as const;
export type BillingAccountPhaseValue =
  (typeof BillingAccountPhase)[keyof typeof BillingAccountPhase];

/** Owner-user label on BillingAccount — must match the milo / fraud constant. */
export const OWNER_USER_LABEL = 'iam.miloapis.com/owner-user';

export interface BillingAccountPaymentMethod {
  providerCustomerId?: string;
  paymentMethodId?: string;
  setupIntentId?: string;
  brand?: string;
  last4?: string;
  bin?: string;
  country?: string;
  expMonth?: number;
  expYear?: number;
  avsResult?: string;
  cvcResult?: string;
  attachedAt?: string;
}

export interface BillingAccount {
  name: string;
  namespace: string;
  phase: BillingAccountPhaseValue;
  paymentMethodAttached: boolean;
  paymentMethod?: BillingAccountPaymentMethod;
}

export const PaymentMethodSetupPhase = {
  Pending: 'Pending',
  ClientSecretReady: 'ClientSecretReady',
  Succeeded: 'Succeeded',
  Failed: 'Failed',
} as const;
export type PaymentMethodSetupPhaseValue =
  (typeof PaymentMethodSetupPhase)[keyof typeof PaymentMethodSetupPhase];

export interface PaymentMethodSetup {
  name: string;
  namespace: string;
  phase: PaymentMethodSetupPhaseValue;
  clientSecret?: string;
  publishableKey?: string;
  providerName?: string;
  setupIntentId?: string;
  setupIntentStatus?: string;
  failureReason?: string;
  failureMessage?: string;
}
