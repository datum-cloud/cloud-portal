# Stripe module

Stripe-specific implementations for portal billing UI.

## What's in here

- `load.ts` — `getStripe()`: memoised `loadStripe` wrapper, keyed by
  publishable key.
- `appearance.ts` — `buildStripeAppearance()`: builds a Stripe Elements
  `Appearance` config from resolved datum-ui design tokens (light + dark).
- `payment-method-form.tsx` — `StripePaymentMethodForm`: the React component
  that mounts `<Elements>` + `<PaymentElement>` + `<AddressElement>` and
  drives the `elements.submit()` → `stripe.confirmSetup()` flow used by the
  "Add a payment method" dialog.
- `index.ts` — the module's public API.

## How it fits in

The provider-agnostic dialog at
`app/features/billing/dialogs/add-payment-method-dialog.tsx` owns the
`<Dialog>` chrome and the fallback shown when Stripe isn't configured. When
a publishable key is available the dialog renders
`<StripePaymentMethodForm publishableKey={...} ... />` from this module.

## Adding another provider

1. Create a sibling module (e.g. `app/modules/braintree/`).
2. Export a component (e.g. `BraintreePaymentMethodForm`) whose props are a
   superset of `BasePaymentMethodFormProps`.
3. Have the dialog dispatch on the provider available for the tenant — for
   example, by checking which `*ProviderConfig` resource exists, or via a
   feature flag.

The dialog's outer shape (`AddPaymentMethodDialogProps`) and the
`CreatePaymentMethodResult` returned by `onCreatePaymentMethod` may need
broadening when the second provider lands — at that point, lift
`CreatePaymentMethodResult` into a discriminated union or move it out of
this module.

## Design token alignment

Stripe Elements live in cross-origin iframes and can't read the portal's
CSS variables. `appearance.ts` resolves the relevant datum-ui tokens
(`--input-background`, `--input-border`, `--input-focus-shadow`, etc.) to
hex values for both themes. If those tokens change meaningfully, update the
`LIGHT` / `DARK` constants in that file.
