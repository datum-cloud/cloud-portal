import { buildStripeAppearance } from '@/modules/stripe/appearance';
import { getStripe } from '@/modules/stripe/load';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { useTheme } from '@datum-cloud/datum-ui/theme';
import {
  AddressElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';
import { z } from 'zod';

/**
 * Stripe implementation of the "add a payment method" form.
 *
 * This file owns everything that's Stripe-specific about collecting a new
 * card: the `<Elements>` provider, `<PaymentElement>` + `<AddressElement>`
 * mounts, appearance tokens, and the `elements.submit()` →
 * `stripe.confirmSetup()` dance.
 *
 * The provider-agnostic dialog at
 * `app/features/billing/dialogs/add-payment-method-dialog.tsx` is in
 * charge of:
 *   - the `<Dialog>` chrome
 *   - choosing which provider component to render
 *   - the "card payments aren't ready yet" fallback when no provider is
 *     configured
 *
 * To add a second provider, create a sibling module (e.g.
 * `app/modules/braintree/payment-method-form.tsx`) that exports a component
 * with the same `BasePaymentMethodFormProps` shape. The dialog can then
 * dispatch on whichever provider config the tenant has.
 */

// ─── Shared types ───────────────────────────────────────────────────────────
//
// These are deliberately small and provider-agnostic: a name we control and a
// "set as default" flag. Anything provider-specific (Stripe SetupIntent
// secrets, Braintree nonces) lives behind `CreatePaymentMethodResult`.

// Passing `error` on the constructor covers the `invalid_type` case (the
// field arriving as `undefined` because nothing has been typed yet) so the
// user sees the same friendly message they'd get for an empty string, not
// Zod's default "expected string, received undefined".
export const addPaymentMethodSchema = z.object({
  displayName: z
    .string({ error: 'Give this card a name so you can recognise it later' })
    .min(1, 'Give this card a name so you can recognise it later')
    .max(128, 'Display name is too long (128 characters max)'),
  setAsDefault: z.boolean().optional(),
});

export type AddPaymentMethodValues = z.infer<typeof addPaymentMethodSchema>;

/**
 * Returned from `onCreatePaymentMethod` after the billing API has created a
 * PaymentMethod resource and the stripe-provider controller has produced a
 * SetupIntent. The clientSecret is fed into `stripe.confirmSetup()` to
 * finish the flow.
 *
 * If another provider lands this should become a discriminated union (or
 * each provider's form can declare its own result type).
 */
export interface CreatePaymentMethodResult {
  clientSecret: string;
}

/**
 * The minimum prop surface any payment-method form needs. Used directly by
 * `StripePaymentMethodForm`; future providers should accept (a superset of)
 * the same props so the dialog can swap them out without other changes.
 */
export interface BasePaymentMethodFormProps {
  /** Closes the dialog (e.g. clicking Cancel, or after a successful add). */
  onClose: () => void;
  /**
   * Whether this card should be offered as the default. When `true` the
   * checkbox is locked on — useful for the first card on an account where
   * the billing API will force the default anyway.
   */
  forceDefault?: boolean;
  /**
   * Creates the `PaymentMethod` CRD via the billing API. The
   * stripe-provider controller publishes a SetupIntent and exposes its
   * `clientSecret` for the second confirmation step.
   *
   * Return `null` (or throw) to keep the dialog open — surface
   * user-actionable errors via your toast layer.
   */
  onCreatePaymentMethod?: (
    values: AddPaymentMethodValues
  ) => Promise<CreatePaymentMethodResult | null | undefined>;
  /**
   * Fired once the SetupIntent has been confirmed end-to-end. The parent
   * should refetch the payment-method list — the resource transitions to
   * `phase=Active` asynchronously via the provider's webhook handler.
   */
  onConfirmed?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface StripePaymentMethodFormProps extends BasePaymentMethodFormProps {
  /**
   * Stripe publishable key for the tenant's Stripe account, fetched from
   * the `StripeProviderConfig` resource. Required: the dialog should pick
   * its unconfigured fallback when this isn't available rather than
   * rendering this component with an empty key.
   */
  publishableKey: string;
}

/**
 * Stable Stripe Elements option references. Stripe re-creates Elements when
 * the `options` prop's identity changes, so anything we don't *need* to
 * recompute lives at module scope.
 */
const PAYMENT_ELEMENT_OPTIONS = {
  // `tabs` lays the card form out the way Vercel's billing dialog does:
  // Card Number on its own row with the brand strip on the right, and
  // Expiry / CVC paired below it. `accordion` (Stripe's default) cramps
  // all three into a single row, which reads poorly in a constrained
  // dialog. When only one payment method is enabled the tab strip itself
  // is hidden — we still get the spaced form layout below it.
  layout: { type: 'tabs' as const },
  // We collect the full billing address from `AddressElement` below. Telling
  // PaymentElement to never collect address fields keeps the UI from
  // duplicating them. Address values are still attached to the resulting
  // PaymentMethod automatically when both elements live under the same
  // `<Elements>` provider and `stripe.confirmSetup({ elements })` runs.
  fields: { billingDetails: { address: 'never' as const } },
};

const ADDRESS_ELEMENT_OPTIONS = {
  mode: 'billing' as const,
  // Disable Stripe's built-in Google Places autocomplete. The
  // suggestions dropdown is rendered through a portal that escapes the
  // dialog body's overflow but sits *under* our sticky `Dialog.Footer`,
  // which interleaves the buttons through the middle of the list (see
  // https://github.com/stripe/stripe-js issues around AddressElement +
  // modal containers — Stripe can't z-index above an arbitrary parent).
  //
  // Users can still type the address manually; the AddressElement
  // continues to validate and attach the entered fields to the
  // resulting PaymentMethod. If we want autocomplete back, the fix is
  // to drop the sticky footer (let the dialog scroll the buttons too)
  // or move the AddressElement into its own non-modal step.
  autocomplete: { mode: 'disabled' as const },
};

export const StripePaymentMethodForm = ({
  publishableKey,
  forceDefault = false,
  onClose,
  onCreatePaymentMethod,
  onConfirmed,
}: StripePaymentMethodFormProps) => {
  const stripePromise = useMemo(() => getStripe(publishableKey), [publishableKey]);
  const { resolvedTheme } = useTheme();

  // Stripe Elements can't read the portal's CSS variables (it lives in
  // cross-origin iframes), so we hand it a resolved appearance config built
  // from datum-ui's design tokens — colours, border radius, focus shadow,
  // font stack. Keyed by theme so the wrapper remounts on light/dark toggle
  // and the iframes pick up the new look.
  const elementsOptions = useMemo<StripeElementsOptions>(
    () => ({
      mode: 'setup',
      currency: 'usd',
      paymentMethodTypes: ['card'],
      appearance: buildStripeAppearance(resolvedTheme === 'dark' ? 'dark' : 'light'),
    }),
    [resolvedTheme]
  );

  // `getStripe` only returns null when no key is provided. We require a key
  // via the prop, so this should never fall through to null in practice —
  // but guard regardless so we don't render a broken `<Elements>`.
  if (!stripePromise) return null;

  return (
    <Elements key={resolvedTheme} stripe={stripePromise} options={elementsOptions}>
      <StripePaymentMethodFormBody
        forceDefault={forceDefault}
        onClose={onClose}
        onCreatePaymentMethod={onCreatePaymentMethod}
        onConfirmed={onConfirmed}
      />
    </Elements>
  );
};

const StripePaymentMethodFormBody = ({
  forceDefault,
  onClose,
  onCreatePaymentMethod,
  onConfirmed,
}: BasePaymentMethodFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // `useStripe` / `useElements` return null until Stripe.js has loaded and
  // the Elements have registered, so the submit button stays disabled until
  // both are ready.
  const isReady = !!stripe && !!elements;

  const handleSubmit = async (values: AddPaymentMethodValues) => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Validate Stripe-owned fields. Field-level errors render inline
      //    inside their Elements; we only surface the top-level message.
      const { error: validationError } = await elements.submit();
      if (validationError) {
        setSubmitError(
          validationError.message ?? 'Please check the card and billing address fields.'
        );
        return;
      }

      // 2. Create the PaymentMethod resource on our side. The
      //    stripe-provider controller mints a SetupIntent and exposes its
      //    `clientSecret` on `StripePaymentMethod.status.setupIntent`.
      //
      //    The callback contract allows either a `null` return or a thrown
      //    error — both keep the dialog open. We catch here so thrown
      //    errors land on the inline alert with their own message instead
      //    of bubbling out as an unhandled rejection.
      let result: CreatePaymentMethodResult | null | undefined;
      try {
        result = await onCreatePaymentMethod?.(values);
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "We couldn't create a payment method just now. Please try again in a moment."
        );
        return;
      }
      if (!result?.clientSecret) {
        setSubmitError(
          "We couldn't create a payment method just now. Please try again in a moment."
        );
        return;
      }

      // 3. Hand the clientSecret to Stripe. AddressElement values are
      //    automatically attached to the PaymentMethod's `billing_details`
      //    because both elements share this `<Elements>` provider.
      //    `redirect: 'if_required'` keeps card-only flows in the dialog —
      //    3-D Secure still shows as Stripe's modal overlay.
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        clientSecret: result.clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (confirmError) {
        setSubmitError(confirmError.message ?? "We couldn't confirm those card details.");
        return;
      }

      onConfirmed?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form.Root
      name="add-payment-method"
      id="add-payment-method-form"
      schema={addPaymentMethodSchema}
      mode="onBlur"
      defaultValues={{
        displayName: '',
        setAsDefault: forceDefault,
      }}
      isSubmitting={submitting}
      onSubmit={handleSubmit}
      className="flex flex-col">
      <Dialog.Header className="mb-0 border-b" title="Add a payment method" onClose={onClose} />
      <Dialog.Body className="mb-0 flex flex-col gap-5 px-5">
        <Form.Field
          name="displayName"
          label="Display name"
          description="A label so you can tell this card apart from others on your account."
          required>
          <Form.Input placeholder="e.g. Primary card" autoFocus />
        </Form.Field>

        {/*
          Section headings reuse datum-ui's `FieldLabel` typography so
          they sit consistently with the `<Form.Field>` labels elsewhere
          in the form (text-xs font-semibold @ 80% foreground). Keeps a
          single visual rhythm for every label-style element in the
          dialog.
        */}
        <section className="flex flex-col gap-3">
          <h3 className="text-foreground/80 text-xs font-semibold">Card details</h3>
          <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-foreground/80 text-xs font-semibold">Billing address</h3>
          <AddressElement options={ADDRESS_ELEMENT_OPTIONS} />
        </section>

        <Form.Field name="setAsDefault">
          <label className="flex items-start gap-3">
            <Form.Checkbox disabled={forceDefault} className="mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-sm font-medium">
                Set as default payment method
              </span>
              <span className="text-muted-foreground text-xs">
                {forceDefault
                  ? "This card will be used for upcoming charges because it's the first one on this account."
                  : 'This card will be charged for upcoming invoices.'}
              </span>
            </div>
          </label>
        </Form.Field>

        {submitError && (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        )}
      </Dialog.Body>
      <Dialog.Footer className="border-t">
        <Button
          htmlType="button"
          type="quaternary"
          theme="outline"
          disabled={submitting}
          onClick={onClose}>
          Cancel
        </Button>
        <Form.Submit loadingText="Adding…" disabled={!isReady}>
          Add payment method
        </Form.Submit>
      </Dialog.Footer>
    </Form.Root>
  );
};
