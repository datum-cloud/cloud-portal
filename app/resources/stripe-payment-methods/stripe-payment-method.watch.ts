import { stripePaymentMethodKeys } from './stripe-payment-method.service';
import type { StripePaymentMethod } from '@/features/billing/types';
import { useResourceWatch } from '@/modules/watch';
import { waitForWatch } from '@/modules/watch/watch-wait.helper';
import { buildOrganizationNamespace } from '@/utils/common';
import { useMemo } from 'react';

const RESOURCE_TYPE = 'apis/stripe.billing.miloapis.com/v1alpha1/stripepaymentmethods';

/**
 * Watch the `StripePaymentMethod` list in one org's namespace. The
 * controller publishes one per `PaymentMethod`; the watch keeps the
 * detail page reactive to lifecycle events (setup intent ready,
 * card confirmed) without re-listing.
 */
export function useStripePaymentMethodsWatch(
  orgId: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryKey = useMemo(() => stripePaymentMethodKeys.list(orgId ?? ''), [orgId]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);
  return useResourceWatch<StripePaymentMethod>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    queryKey,
    transform: (item) => item as StripePaymentMethod,
    enabled: (options?.enabled ?? true) && !!orgId,
    getItemKey: (spm) => spm.metadata?.name ?? '',
    updateListCache: (oldData, newItem) => {
      if (!Array.isArray(oldData)) return oldData;
      const name = newItem.metadata?.name;
      if (!name) return oldData;
      const list = oldData as StripePaymentMethod[];
      const exists = list.some((s) => s.metadata?.name === name);
      return exists
        ? list.map((s) => (s.metadata?.name === name ? newItem : s))
        : [...list, newItem];
    },
  });
}

/**
 * The matching child resource for a `PaymentMethod` we just created.
 * The stripe-provider controller picks the new PM up off the watch
 * stream, calls Stripe to create a SetupIntent, then publishes the
 * resulting `StripePaymentMethod` with `status.setupIntent.clientSecret`
 * — that's the value the dialog needs to mount the card form.
 *
 * Replaces the server-side polling loop that used to live in
 * `app/server/routes/billing.ts`. The watch transport already
 * multiplexes one upstream connection per (org, namespace, kind)
 * across every browser tab, so we get a single HTTP fetch on the
 * server regardless of how many dialogs are in flight.
 */
export interface WaitForStripePaymentMethodSetupOptions {
  orgId: string;
  /** Namespace the parent `PaymentMethod` was created in. */
  namespace: string;
  /** `PaymentMethod.metadata.name` we're waiting on a child for. */
  paymentMethodName: string;
}

export interface StripePaymentMethodSetupResult {
  clientSecret: string;
  /** The `StripePaymentMethod` that carried the client secret. */
  stripePaymentMethod: StripePaymentMethod;
}

export function waitForStripePaymentMethodSetup(options: WaitForStripePaymentMethodSetupOptions): {
  promise: Promise<StripePaymentMethodSetupResult>;
  cancel: () => void;
} {
  return waitForWatch<StripePaymentMethodSetupResult>({
    resourceType: RESOURCE_TYPE,
    orgId: options.orgId,
    namespace: options.namespace,
    // No `name` — we don't know the child's name in advance; the
    // controller picks it. Filter inside `onEvent` instead.
    onEvent: (event) => {
      if (event.type !== 'ADDED' && event.type !== 'MODIFIED') {
        return 'continue';
      }
      const spm = event.object as StripePaymentMethod;
      // Only look at the StripePaymentMethod that backs our PM.
      if (spm.spec?.paymentMethodRef?.name !== options.paymentMethodName) {
        return 'continue';
      }
      const clientSecret = spm.status?.setupIntent?.clientSecret;
      if (clientSecret) {
        return { resolve: { clientSecret, stripePaymentMethod: spm } };
      }
      // The controller may surface a failure on `status.phase` even
      // without a clientSecret — bail rather than wait the timeout.
      if (spm.status?.phase === 'Failed') {
        const reason = spm.status.failureMessage ?? spm.status.failureReason ?? 'unknown failure';
        return { reject: new Error(`Card setup failed: ${reason}`) };
      }
      return 'continue';
    },
  });
}
