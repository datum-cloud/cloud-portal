import { FieldLabel } from '@/components/field/field-label';
import { buildStripeAppearance, getStripeFontFaces } from '@/modules/stripe/appearance';
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
import { useCallback, useEffect, useImperativeHandle, useMemo, useState, type Ref } from 'react';
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

/** Billing fields omitted from PaymentElement (`fields.billingDetails.* = never`). */
export interface StripeBillingDetailsPrefill {
  email?: string;
  name?: string;
}

/** Card details returned immediately after Stripe confirms a SetupIntent. */
export interface StripePaymentMethodConfirmedDetails {
  brand?: string | null;
  last4?: string | null;
}

/**
 * The minimum prop surface any payment-method form needs. Used directly by
 * `StripePaymentMethodForm`; future providers should accept (a superset of)
 * the same props so the dialog can swap them out without other changes.
 */
export interface BasePaymentMethodFormProps {
  /** Closes the dialog (e.g. clicking Cancel, or after a successful add). */
  onClose?: () => void;
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
  onConfirmed?: (details?: StripePaymentMethodConfirmedDetails) => void;
}

export interface StripePaymentMethodSubmitHandle {
  /** Runs Stripe validation, create, and confirm. Returns true on success. */
  submit: (values: AddPaymentMethodValues) => Promise<boolean>;
  isReady: () => boolean;
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
  /** Dialog chrome (default) or inline card-only fields for onboarding pages. */
  layout?: 'dialog' | 'embedded';
  /** When embedded, omit AddressElement unless explicitly hidden. */
  hideAddress?: boolean;
  /** When embedded, parent collects displayName and passes it via submit ref. */
  hideDisplayName?: boolean;
  /** When embedded, parent renders the primary submit button. */
  hideSubmit?: boolean;
  /** Override the display-name field label (e.g. "Name on card"). */
  displayNameLabel?: string;
  /** Imperative submit for embedded layouts with an external button. */
  submitRef?: Ref<StripePaymentMethodSubmitHandle>;
  /** Notifies parent when Stripe readiness changes (embedded layouts). */
  onReadyChange?: (ready: boolean) => void;
  /** Notifies parent when submit-in-flight state changes. */
  onSubmittingChange?: (submitting: boolean) => void;
  /**
   * Email/name are hidden on PaymentElement — Stripe requires them in
   * `confirmSetup` when opted out via `fields.billingDetails`.
   */
  billingDetailsPrefill?: StripeBillingDetailsPrefill;
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
  // We collect billing address from `AddressElement` below. Telling
  // PaymentElement to never collect those fields keeps the UI from
  // duplicating them or showing mismatched Stripe labels.
  fields: {
    billingDetails: {
      name: 'never' as const,
      email: 'never' as const,
      phone: 'never' as const,
      address: 'never' as const,
    },
  },
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
  layout = 'dialog',
  hideAddress = false,
  hideDisplayName = false,
  hideSubmit = false,
  displayNameLabel,
  submitRef,
  onReadyChange,
  onSubmittingChange,
  billingDetailsPrefill,
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
  const elementsOptions = useMemo<StripeElementsOptions>(() => {
    const fonts = getStripeFontFaces();
    return {
      mode: 'setup',
      currency: 'usd',
      paymentMethodTypes: ['card'],
      appearance: buildStripeAppearance(resolvedTheme === 'dark' ? 'dark' : 'light'),
      ...(fonts.length > 0 ? { fonts } : {}),
    };
  }, [resolvedTheme]);

  // `getStripe` only returns null when no key is provided. We require a key
  // via the prop, so this should never fall through to null in practice —
  // but guard regardless so we don't render a broken `<Elements>`.
  if (!stripePromise) return null;

  return (
    <Elements key={resolvedTheme} stripe={stripePromise} options={elementsOptions}>
      <StripePaymentMethodFormBody
        layout={layout}
        hideAddress={hideAddress}
        hideDisplayName={hideDisplayName}
        hideSubmit={hideSubmit}
        displayNameLabel={displayNameLabel}
        submitRef={submitRef}
        onReadyChange={onReadyChange}
        onSubmittingChange={onSubmittingChange}
        billingDetailsPrefill={billingDetailsPrefill}
        forceDefault={forceDefault}
        onClose={onClose}
        onCreatePaymentMethod={onCreatePaymentMethod}
        onConfirmed={onConfirmed}
      />
    </Elements>
  );
};

interface StripePaymentMethodFormBodyProps extends BasePaymentMethodFormProps {
  layout: 'dialog' | 'embedded';
  hideAddress: boolean;
  hideDisplayName: boolean;
  hideSubmit: boolean;
  displayNameLabel?: string;
  submitRef?: Ref<StripePaymentMethodSubmitHandle>;
  onReadyChange?: (ready: boolean) => void;
  onSubmittingChange?: (submitting: boolean) => void;
  billingDetailsPrefill?: StripeBillingDetailsPrefill;
}

const StripePaymentMethodFormBody = ({
  layout,
  hideAddress,
  hideDisplayName,
  hideSubmit,
  displayNameLabel,
  submitRef,
  onReadyChange,
  onSubmittingChange,
  billingDetailsPrefill,
  forceDefault,
  onClose,
  onCreatePaymentMethod,
  onConfirmed,
}: StripePaymentMethodFormBodyProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // `useStripe` / `useElements` return null until Stripe.js has loaded and
  // the Elements have registered, so the submit button stays disabled until
  // both are ready.
  const isReady = !!stripe && !!elements;

  const runSubmit = useCallback(
    async (values: AddPaymentMethodValues): Promise<boolean> => {
      if (!stripe || !elements) return false;
      setSubmitting(true);
      onSubmittingChange?.(true);
      setSubmitError(null);
      try {
        // 1. Validate Stripe-owned fields. Field-level errors render inline
        //    inside their Elements; we only surface the top-level message.
        const { error: validationError } = await elements.submit();
        if (validationError) {
          setSubmitError(
            validationError.message ?? 'Please check the card and billing address fields.'
          );
          return false;
        }

        // 2. Create the PaymentMethod resource on our side.
        let result: CreatePaymentMethodResult | null | undefined;
        try {
          result = await onCreatePaymentMethod?.(values);
        } catch (err) {
          setSubmitError(
            err instanceof Error
              ? err.message
              : "We couldn't create a payment method just now. Please try again in a moment."
          );
          return false;
        }
        if (!result?.clientSecret) {
          setSubmitError(
            "We couldn't create a payment method just now. Please try again in a moment."
          );
          return false;
        }

        const billingEmail = billingDetailsPrefill?.email?.trim();
        if (!billingEmail) {
          setSubmitError(
            'An email address is required before we can save this card. Add contact email on the account and try again.'
          );
          return false;
        }

        const billingName =
          billingDetailsPrefill?.name?.trim() || values.displayName?.trim() || undefined;

        // 3. Hand the clientSecret to Stripe.
        const { error: confirmError, setupIntent } = await stripe.confirmSetup({
          elements,
          clientSecret: result.clientSecret,
          confirmParams: {
            return_url: window.location.href,
            payment_method_data: {
              billing_details: {
                email: billingEmail,
                ...(billingName ? { name: billingName } : {}),
              },
            },
          },
          redirect: 'if_required',
        });
        if (confirmError) {
          setSubmitError(confirmError.message ?? "We couldn't confirm those card details.");
          return false;
        }

        const confirmedPaymentMethod =
          setupIntent?.payment_method &&
          typeof setupIntent.payment_method === 'object' &&
          'card' in setupIntent.payment_method
            ? setupIntent.payment_method
            : null;
        const confirmedCard = confirmedPaymentMethod?.card;

        onConfirmed?.(
          confirmedCard?.last4
            ? { brand: confirmedCard.brand, last4: confirmedCard.last4 }
            : undefined
        );
        return true;
      } finally {
        setSubmitting(false);
        onSubmittingChange?.(false);
      }
    },
    [
      stripe,
      elements,
      onCreatePaymentMethod,
      onConfirmed,
      onSubmittingChange,
      billingDetailsPrefill,
    ]
  );

  useImperativeHandle(
    submitRef,
    () => ({
      submit: runSubmit,
      isReady: () => isReady,
    }),
    [runSubmit, isReady]
  );

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  const handleSubmit = async (values: AddPaymentMethodValues) => {
    const success = await runSubmit(values);
    if (success && layout === 'dialog') {
      onClose?.();
    }
  };

  const cardSection = (
    <section className="flex flex-col space-y-2">
      {layout === 'dialog' && <FieldLabel label="Card details" isRequired />}
      <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} />
    </section>
  );

  const addressSection = !hideAddress ? (
    <section className="flex flex-col space-y-2">
      <FieldLabel label="Billing address" isRequired />
      <AddressElement options={ADDRESS_ELEMENT_OPTIONS} />
    </section>
  ) : null;

  const setAsDefaultField =
    !hideSubmit && !forceDefault ? (
      <Form.Field name="setAsDefault">
        <label className="flex items-start gap-3">
          <Form.Checkbox disabled={forceDefault} className="mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-sm font-medium">
              Set as default payment method
            </span>
            <span className="text-muted-foreground text-xs">
              This card will be charged for upcoming invoices.
            </span>
          </div>
        </label>
      </Form.Field>
    ) : null;

  const errorAlert = submitError ? (
    <p className="text-destructive text-sm" role="alert">
      {submitError}
    </p>
  ) : null;

  if (layout === 'embedded') {
    return (
      <div className="flex flex-col gap-6">
        {cardSection}
        {addressSection}
        {errorAlert}
      </div>
    );
  }

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
        {!hideDisplayName && (
          <Form.Field
            name="displayName"
            label={displayNameLabel ?? 'Display name'}
            description="A label so you can tell this card apart from others on your account."
            required>
            <Form.Input placeholder="e.g. Primary card" autoFocus />
          </Form.Field>
        )}

        {cardSection}
        {addressSection}
        {setAsDefaultField}
        {errorAlert}
      </Dialog.Body>
      {!hideSubmit && (
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
      )}
    </Form.Root>
  );
};
