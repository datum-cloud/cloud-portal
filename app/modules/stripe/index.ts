// Public surface of the Stripe module. Internal helpers (`getStripe`,
// `buildStripeAppearance`) are kept out — consumers should only need the
// form component and its shared types.
export {
  StripePaymentMethodForm,
  addPaymentMethodSchema,
  type AddPaymentMethodValues,
  type BasePaymentMethodFormProps,
  type CreatePaymentMethodResult,
  type StripeBillingAddressPrefill,
  type StripeBillingDetailsPrefill,
  type StripePaymentMethodConfirmedDetails,
  type StripePaymentMethodFormProps,
  type StripePaymentMethodSubmitHandle,
} from './payment-method-form';
export {
  addressSignature,
  buildContactAddressPrefill,
  type ContactAddressInput,
} from './billing-address';
