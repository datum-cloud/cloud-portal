import { paymentMethodKeys } from './payment-method.service';
import type { PaymentMethod } from '@/features/billing/types';
import { useResourceWatch } from '@/modules/watch';
import { waitForWatch } from '@/modules/watch/watch-wait.helper';
import { buildOrganizationNamespace } from '@/utils/common';
import { useMemo } from 'react';

const RESOURCE_TYPE = 'apis/billing.miloapis.com/v1alpha1/paymentmethods';

/**
 * Watch the payment-method list for one org's namespace. Keeps the
 * card list responsive to controller updates without refetching —
 * the badge flip from `Pending` → `Active` happens via MODIFIED
 * events in-place.
 */
export function usePaymentMethodsWatch(orgId: string | undefined, options?: { enabled?: boolean }) {
  const queryKey = useMemo(() => paymentMethodKeys.list(orgId ?? ''), [orgId]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<PaymentMethod>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    queryKey,
    transform: (item) => item as PaymentMethod,
    enabled: (options?.enabled ?? true) && !!orgId,
    getItemKey: (pm) => pm.metadata?.name ?? '',
    updateListCache: (oldData, newItem) => {
      if (!Array.isArray(oldData)) return oldData;
      const name = newItem.metadata?.name;
      if (!name) return oldData;
      const list = oldData as PaymentMethod[];
      // A MODIFIED event that gains a `deletionTimestamp` is the
      // controller acknowledging a delete — evict the row now rather
      // than re-inserting it and waiting for the trailing DELETED
      // event, which otherwise flashes the card back after an
      // optimistic removal. Mirrors the billing-account watch.
      if (newItem.metadata?.deletionTimestamp) {
        return list.filter((p) => p.metadata?.name !== name);
      }
      const exists = list.some((p) => p.metadata?.name === name);
      return exists
        ? list.map((p) => (p.metadata?.name === name ? newItem : p))
        : [...list, newItem];
    },
  });
}

export interface WaitForPaymentMethodCardOptions {
  orgId: string;
  /** Namespace the `PaymentMethod` lives in. */
  namespace: string;
  /** `PaymentMethod.metadata.name` we're waiting on card details for. */
  paymentMethodName: string;
}

export interface PaymentMethodCardResult {
  brand?: string;
  last4: string;
}

/**
 * Resolve the card brand + last4 for a `PaymentMethod` once the provider
 * has published them to `status.details.card`.
 *
 * Stripe's client-side `confirmSetup` returns a SetupIntent whose
 * `payment_method` is an unexpanded id string, so the confirm response
 * can't be trusted for card details. The authoritative brand/last4 land on
 * the `PaymentMethod` resource status after the provider processes
 * `payment_method.attached` — watch for that instead. The card row already
 * reads the same `status.details.card` fields.
 *
 * Caller owns the timeout (mirrors `waitForStripePaymentMethodSetup`): wrap
 * the returned `promise` in a `Promise.race` with a timer and call `cancel`
 * to unsubscribe.
 */
export function waitForPaymentMethodCard(options: WaitForPaymentMethodCardOptions): {
  promise: Promise<PaymentMethodCardResult>;
  cancel: () => void;
} {
  return waitForWatch<PaymentMethodCardResult>({
    resourceType: RESOURCE_TYPE,
    orgId: options.orgId,
    namespace: options.namespace,
    name: options.paymentMethodName,
    onEvent: (event) => {
      if (event.type !== 'ADDED' && event.type !== 'MODIFIED') {
        return 'continue';
      }
      const pm = event.object as PaymentMethod;
      if (pm.metadata?.name !== options.paymentMethodName) {
        return 'continue';
      }
      const card = pm.status?.details?.card;
      if (card?.last4) {
        return { resolve: { brand: card.brand, last4: card.last4 } };
      }
      return 'continue';
    },
  });
}

/**
 * Resolve once a `PaymentMethod` reaches `status.phase === 'Active'`.
 *
 * Setting an account's default (`BillingAccount.spec.defaultPaymentMethodRef`)
 * is only accepted by the billing API once the referenced card is Active — a
 * card that's still provisioning is rejected. The card's brand/last4 usually
 * land a beat *before* the phase flips to Active, so this is a distinct signal
 * from `waitForPaymentMethodCard` (which resolves as soon as the card details
 * exist, often while still `Pending`). Returned card details may be empty if
 * the provider promotes the phase before publishing them.
 *
 * Caller owns the timeout (mirrors `waitForPaymentMethodCard`): wrap the
 * returned `promise` in a `Promise.race` with a timer and call `cancel` to
 * unsubscribe.
 */
export function waitForPaymentMethodActive(options: WaitForPaymentMethodCardOptions): {
  promise: Promise<PaymentMethodCardResult>;
  cancel: () => void;
} {
  return waitForWatch<PaymentMethodCardResult>({
    resourceType: RESOURCE_TYPE,
    orgId: options.orgId,
    namespace: options.namespace,
    name: options.paymentMethodName,
    onEvent: (event) => {
      if (event.type !== 'ADDED' && event.type !== 'MODIFIED') {
        return 'continue';
      }
      const pm = event.object as PaymentMethod;
      if (pm.metadata?.name !== options.paymentMethodName) {
        return 'continue';
      }
      if (pm.status?.phase !== 'Active') {
        return 'continue';
      }
      const card = pm.status?.details?.card;
      return { resolve: { brand: card?.brand, last4: card?.last4 ?? '' } };
    },
  });
}
