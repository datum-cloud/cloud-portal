import { FieldLabel } from '@/components/field/field-label';
import { buildStripeAppearance, getStripeFontFaces } from '@/modules/stripe/appearance';
import {
  addressSignature,
  type StripeBillingAddressPrefill,
} from '@/modules/stripe/billing-address';
import { getStripe } from '@/modules/stripe/load';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
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
import type { StripeAddressElementChangeEvent, StripeElementsOptions } from '@stripe/stripe-js';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
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

export type { StripeBillingAddressPrefill };

/** Billing fields omitted from PaymentElement (`fields.billingDetails.* = never`). */
export interface StripeBillingDetailsPrefill {
  email?: string;
  name?: string;
  /**
   * A billing address the user can opt to copy into the AddressElement
   * (e.g. the org contact address). When present, the form offers a
   * "Same as contact address" toggle that seeds the address fields.
   */
  address?: StripeBillingAddressPrefill;
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

  // Optional "copy from contact address" support. `defaultValues` is only read
  // by the AddressElement at mount, so toggling remounts it via a changed
  // `key` (below) to (re)seed or clear the fields.
  const contactAddressDefaults = useMemo(() => {
    const addr = billingDetailsPrefill?.address;
    if (!addr) return undefined;
    // Only worth offering when there's a real address to copy, not just a country.
    if (!addr.line1?.trim() && !addr.city?.trim() && !addr.postalCode?.trim()) return undefined;
    return {
      name: billingDetailsPrefill?.name ?? '',
      address: {
        line1: addr.line1 ?? '',
        line2: addr.line2 ?? '',
        city: addr.city ?? '',
        state: addr.state ?? '',
        postal_code: addr.postalCode ?? '',
        country: addr.country ?? '',
      },
    };
  }, [billingDetailsPrefill]);

  const canCopyContactAddress = Boolean(contactAddressDefaults);
  const [sameAsContact, setSameAsContact] = useState(canCopyContactAddress);
  // Bumped only on an explicit checkbox click, so the AddressElement remounts
  // and (re)reads `defaultValues`. Auto-unticking after a manual edit must NOT
  // bump this — a remount would wipe whatever the user just typed.
  const [addressSeed, setAddressSeed] = useState(0);
  // Hidden during a checkbox-driven remount to prevent the Stripe iframe
  // flicker. Cleared by onReady (or a safety timeout) once Stripe renders.
  const [addressVisible, setAddressVisible] = useState(true);
  const addressVisibleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Holds the wrapper's pixel height during a remount so the iframe collapse
  // doesn't cause a layout shift that makes the whole dialog flicker.
  const [addressHeldHeight, setAddressHeldHeight] = useState<number | undefined>();
  const addressWrapperRef = useRef<HTMLDivElement>(null);

  // After each (re)seed we snapshot Stripe's own normalized value (from the
  // first change event) and treat any later divergence as a manual edit. This
  // is country-aware for free: the baseline only contains the fields the
  // selected country actually renders, so seeding a UK address (no state) or a
  // US address (state + ZIP) never trips a false "edited" detection.
  const awaitingBaselineRef = useRef(canCopyContactAddress);
  const seededBaselineRef = useRef('');

  const addressOptions = useMemo(() => {
    if (sameAsContact && contactAddressDefaults) {
      return { ...ADDRESS_ELEMENT_OPTIONS, defaultValues: contactAddressDefaults };
    }
    if (contactAddressDefaults) {
      // When the user unchecks, preserve the name but explicitly clear the
      // address fields. Without defaultValues the remounted AddressElement
      // would drop the name too; with an empty address object Stripe starts
      // the fields blank while keeping the name the user may have edited.
      return {
        ...ADDRESS_ELEMENT_OPTIONS,
        defaultValues: {
          name: contactAddressDefaults.name,
          address: { line1: '', line2: '', city: '', state: '', postal_code: '', country: '' },
        },
      };
    }
    return ADDRESS_ELEMENT_OPTIONS;
  }, [sameAsContact, contactAddressDefaults]);

  const handleAddressReady = useCallback(() => {
    clearTimeout(addressVisibleTimerRef.current);
    setAddressHeldHeight(undefined);
    setAddressVisible(true);
  }, []);

  const handleSameAsContactChange = useCallback((checked: boolean) => {
    // Snapshot the current rendered height so the wrapper keeps its size
    // while the Stripe iframe collapses and re-renders. Without this the
    // dialog shrinks and jumps, making the whole dialog appear to flicker.
    setAddressHeldHeight(addressWrapperRef.current?.offsetHeight);
    // Hide content before remounting so the iframe re-render is invisible.
    // onReady (or the safety timeout) fades it back in once Stripe is ready.
    setAddressVisible(false);
    clearTimeout(addressVisibleTimerRef.current);
    addressVisibleTimerRef.current = setTimeout(() => {
      setAddressHeldHeight(undefined);
      setAddressVisible(true);
    }, 800);

    // Explicit toggle: reseed (checked) or clear (unchecked) by remounting.
    setSameAsContact(checked);
    setAddressSeed((seed) => seed + 1);
    // Recapture the baseline after a checkbox-driven reseed; nothing to track
    // once the user opts out.
    awaitingBaselineRef.current = checked;
  }, []);

  const handleAddressChange = useCallback(
    (event: StripeAddressElementChangeEvent) => {
      const signature = addressSignature(event.value);

      if (awaitingBaselineRef.current) {
        // Ignore any transient empty event before Stripe applies defaultValues;
        // the seeded address always carries at least a country.
        if (signature.replace(/\|/g, '') === '') return;
        seededBaselineRef.current = signature;
        awaitingBaselineRef.current = false;
        return;
      }

      // The user changed a field away from the copied contact values — untick
      // the box, but don't remount, so their edit is preserved.
      if (sameAsContact && signature !== seededBaselineRef.current) {
        setSameAsContact(false);
      }
    },
    [sameAsContact]
  );

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

  useEffect(() => {
    return () => clearTimeout(addressVisibleTimerRef.current);
  }, []);

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
      <div className="flex items-center justify-between gap-3">
        <FieldLabel label="Billing address" isRequired />
        {canCopyContactAddress ? (
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs select-none">
            <Checkbox
              checked={sameAsContact}
              onCheckedChange={(checked) => handleSameAsContactChange(checked === true)}
              data-e2e="billing-address-same-as-contact"
            />
            Same as contact address
          </label>
        ) : null}
      </div>
      <div
        ref={addressWrapperRef}
        style={{
          opacity: addressVisible ? 1 : 0,
          transition: 'opacity 200ms ease',
          minHeight: addressHeldHeight,
        }}>
        <AddressElement
          key={`address-seed-${addressSeed}`}
          options={addressOptions}
          onChange={handleAddressChange}
          onReady={handleAddressReady}
        />
      </div>
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
            <Form.Input
              placeholder="e.g. Primary card"
              autoFocus
              data-e2e="payment-method-display-name"
            />
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
          <Form.Submit loadingText="Adding…" disabled={!isReady} data-e2e="payment-method-submit">
            Add payment method
          </Form.Submit>
        </Dialog.Footer>
      )}
    </Form.Root>
  );
};
