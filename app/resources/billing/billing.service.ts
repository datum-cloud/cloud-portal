import {
  BillingAccount,
  BillingAccountPhaseValue,
  OWNER_USER_LABEL,
  PaymentMethodSetup,
  PaymentMethodSetupPhaseValue,
} from './billing.schema';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { mapApiError, NotFoundError } from '@/utils/errors';

const SERVICE_NAME = 'BillingService';

const BILLING_GROUP = 'billing.miloapis.com';
const BILLING_VERSION = 'v1alpha1';

interface RawBillingAccount {
  metadata: { name: string; namespace: string };
  status?: {
    phase?: BillingAccountPhaseValue;
    paymentMethod?: BillingAccount['paymentMethod'];
    conditions?: Array<{ type: string; status: 'True' | 'False' | 'Unknown' }>;
  };
}

interface RawBillingAccountList {
  items: RawBillingAccount[];
}

interface RawPaymentMethodSetup {
  metadata: { name: string; namespace: string };
  spec: { billingAccountRef: { name: string }; returnURL?: string };
  status?: {
    phase?: PaymentMethodSetupPhaseValue;
    clientSecret?: string;
    publishableKey?: string;
    providerName?: string;
    setupIntentId?: string;
    setupIntentStatus?: string;
    failureReason?: string;
    failureMessage?: string;
  };
}

function toBillingAccount(raw: RawBillingAccount): BillingAccount {
  const conditions = raw.status?.conditions ?? [];
  const paymentMethodAttached = conditions.some(
    (c) => c.type === 'PaymentMethodAttached' && c.status === 'True'
  );
  return {
    name: raw.metadata.name,
    namespace: raw.metadata.namespace,
    phase: raw.status?.phase ?? 'Provisioning',
    paymentMethodAttached,
    paymentMethod: raw.status?.paymentMethod,
  };
}

function toPaymentMethodSetup(raw: RawPaymentMethodSetup): PaymentMethodSetup {
  return {
    name: raw.metadata.name,
    namespace: raw.metadata.namespace,
    phase: raw.status?.phase ?? 'Pending',
    clientSecret: raw.status?.clientSecret,
    publishableKey: raw.status?.publishableKey,
    providerName: raw.status?.providerName,
    setupIntentId: raw.status?.setupIntentId,
    setupIntentStatus: raw.status?.setupIntentStatus,
    failureReason: raw.status?.failureReason,
    failureMessage: raw.status?.failureMessage,
  };
}

/**
 * BillingService is a thin wrapper around the milo K8s API for the
 * billing.miloapis.com CRDs the signup flow needs. Everything goes through
 * the existing apiserver connection — no service-specific HTTP client.
 *
 * The PaymentMethodSetup CRD is brand new and not yet present in the
 * generated billing SDK (`@/modules/control-plane/billing`). Once the SDK
 * is regenerated those calls should be migrated; for now we hit the API
 * paths directly to unblock the signup flow.
 */
export function createBillingService() {
  return {
    /**
     * Return the BillingAccount owned by the given user, or null if none
     * exists yet (signup race — the auto-billing-account controller may
     * not have created it before the first /verifying poll).
     */
    async getBillingAccountForUser(userId: string): Promise<BillingAccount | null> {
      const startTime = Date.now();
      try {
        const response = await client.get({
          url: `/apis/${BILLING_GROUP}/${BILLING_VERSION}/billingaccounts`,
          query: {
            labelSelector: `${OWNER_USER_LABEL}=${userId}`,
          },
          responseType: 'json',
        });

        const list = response.data as RawBillingAccountList;
        const accounts = (list.items ?? []).map(toBillingAccount);

        logger.service(SERVICE_NAME, 'getBillingAccountForUser', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        if (accounts.length === 0) return null;
        // Prefer an account with payment-method-attached if multiple
        // exist; otherwise return the first.
        return accounts.find((a) => a.paymentMethodAttached) ?? accounts[0];
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getBillingAccountForUser failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Look up a specific BillingAccount by namespace/name.
     */
    async getBillingAccount(namespace: string, name: string): Promise<BillingAccount> {
      try {
        const response = await client.get({
          url: `/apis/${BILLING_GROUP}/${BILLING_VERSION}/namespaces/${namespace}/billingaccounts/${name}`,
          responseType: 'json',
        });
        return toBillingAccount(response.data as RawBillingAccount);
      } catch (error) {
        throw mapApiError(error);
      }
    },

    /**
     * Create a PaymentMethodSetup for the given BillingAccount. The
     * milo-billing controller will fill in `.status.clientSecret` once
     * it has minted a Stripe SetupIntent.
     */
    async createPaymentMethodSetup(
      billingAccount: Pick<BillingAccount, 'name' | 'namespace'>,
      opts: { returnURL?: string } = {}
    ): Promise<PaymentMethodSetup> {
      const startTime = Date.now();
      try {
        const body = {
          apiVersion: `${BILLING_GROUP}/${BILLING_VERSION}`,
          kind: 'PaymentMethodSetup',
          metadata: { generateName: 'pms-' },
          spec: {
            billingAccountRef: { name: billingAccount.name },
            ...(opts.returnURL ? { returnURL: opts.returnURL } : {}),
          },
        };
        const response = await client.post({
          url: `/apis/${BILLING_GROUP}/${BILLING_VERSION}/namespaces/${billingAccount.namespace}/paymentmethodsetups`,
          body,
          responseType: 'json',
        });

        logger.service(SERVICE_NAME, 'createPaymentMethodSetup', {
          input: { billingAccount: billingAccount.name },
          duration: Date.now() - startTime,
        });

        return toPaymentMethodSetup(response.data as RawPaymentMethodSetup);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.createPaymentMethodSetup failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Read a PaymentMethodSetup by namespace/name.
     */
    async getPaymentMethodSetup(namespace: string, name: string): Promise<PaymentMethodSetup> {
      try {
        const response = await client.get({
          url: `/apis/${BILLING_GROUP}/${BILLING_VERSION}/namespaces/${namespace}/paymentmethodsetups/${name}`,
          responseType: 'json',
        });
        return toPaymentMethodSetup(response.data as RawPaymentMethodSetup);
      } catch (error) {
        if (error instanceof NotFoundError) throw error;
        throw mapApiError(error);
      }
    },
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
