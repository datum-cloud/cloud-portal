/**
 * Thin UI-facing surface over the generated billing + stripe SDK types.
 *
 * The generated types in `@/modules/control-plane/billing` and `…/stripe`
 * are the source of truth — everything here is a re-export under a
 * friendlier name plus a small set of projection helpers the UI calls
 * directly (display name, default-payment-method lookup, lifecycle
 * bucketing, card-brand normalization).
 *
 * If the generated shape changes, update the alias here once instead
 * of touching every card / route.
 */
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingAccountBinding,
  ComMiloapisBillingV1Alpha1BillingAccountList,
  ComMiloapisBillingV1Alpha1PaymentMethod,
  ComMiloapisBillingV1Alpha1PaymentMethodClass,
  ComMiloapisBillingV1Alpha1PaymentMethodList,
} from '@/modules/control-plane/billing';
import type {
  ComMiloapisBillingStripeV1Alpha1StripePaymentMethod,
  ComMiloapisBillingStripeV1Alpha1StripeProviderConfig,
} from '@/modules/control-plane/stripe';

export type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;
export type BillingAccountList = ComMiloapisBillingV1Alpha1BillingAccountList;
export type BillingAccountBinding = ComMiloapisBillingV1Alpha1BillingAccountBinding;
export type PaymentMethod = ComMiloapisBillingV1Alpha1PaymentMethod;
export type PaymentMethodList = ComMiloapisBillingV1Alpha1PaymentMethodList;
export type PaymentMethodClass = ComMiloapisBillingV1Alpha1PaymentMethodClass;
export type StripePaymentMethod = ComMiloapisBillingStripeV1Alpha1StripePaymentMethod;
export type StripeProviderConfig = ComMiloapisBillingStripeV1Alpha1StripeProviderConfig;

/**
 * Pulled out of the inline generated shape so callers can write
 * `PaymentMethodPhase` rather than the full nested status union.
 */
export type PaymentMethodPhase = NonNullable<NonNullable<PaymentMethod['status']>['phase']>;

/**
 * Account lifecycle bucket exposed to the UI. Mirrors the generated
 * `BillingAccount.status.phase` directly — the listing surface
 * collapses everything that isn't `Ready` into a "pending"-style
 * indicator, but the type stays exhaustive so detail-page badges can
 * spell out the actual state.
 */
export type BillingAccountPhase = NonNullable<NonNullable<BillingAccount['status']>['phase']>;

/**
 * Card details (status.details.card) the way UI components consume it.
 * Extracted from the generated nested type so the cards don't need to
 * spell out `NonNullable<…>` chains every time.
 */
export type PaymentMethodCardDetails = NonNullable<
  NonNullable<NonNullable<PaymentMethod['status']>['details']>['card']
>;

/**
 * Normalized card brand the icon set knows how to render. The API
 * returns a free-form `brand: string` (Stripe's vocabulary today, who
 * knows what tomorrow's provider will hand back), so we always pass
 * card brands through `normalizeCardBrand` before rendering.
 */
export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'unknown';

/** Annotation key the API uses to carry the user-facing display name. */
export const BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION = 'kubernetes.io/display-name';

/**
 * Convenience: best human-readable label for a billing account.
 *
 * Resolution order:
 *   1. `metadata.annotations['kubernetes.io/display-name']` — the
 *      canonical display name the user types in the create dialog and
 *      can later edit from the detail page.
 *   2. `spec.contactInfo.businessName` — legal entity, kept as a
 *      fallback for B2B accounts created before the annotation rolled
 *      out (the create form no longer collects it).
 *   3. `spec.contactInfo.name` — individual contact, last-resort
 *      humanish label for accounts created before this annotation
 *      shipped at all.
 *   4. `metadata.name` — the resource id, so the table never renders
 *      an empty cell.
 */
export const getBillingAccountDisplayName = (account: BillingAccount): string =>
  account.metadata?.annotations?.[BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION] ??
  account.spec?.contactInfo?.businessName ??
  account.spec?.contactInfo?.name ??
  account.metadata?.name ??
  'Unnamed billing account';

/**
 * Bucket a `BillingAccount` for the listing view's status pill. `Ready`
 * is the happy path — anything else (Provisioning, Suspended, Archived,
 * missing) collapses to "configuring" so the table just answers
 * "usable or not". The detail page is where the user goes to find out
 * what to fix.
 */
export const isBillingAccountReady = (account: BillingAccount): boolean =>
  account.status?.phase === 'Ready';

/** Convenience: does this payment method back the account default? */
export const isDefaultPaymentMethod = (
  method: PaymentMethod,
  account: BillingAccount | undefined
): boolean => account?.spec?.defaultPaymentMethodRef?.name === method.metadata?.name;

/**
 * Map the API's free-form `brand` string onto our fixed icon set. The
 * Stripe vocabulary uses lowercase ids; we lowercase + alias the
 * known synonyms ("american_express" → "amex") so the icon set
 * matches regardless of which controller published the value.
 */
export const normalizeCardBrand = (brand: string | undefined | null): CardBrand => {
  if (!brand) return 'unknown';
  const slug = brand.toLowerCase().replace(/[\s_-]+/g, '');
  switch (slug) {
    case 'visa':
      return 'visa';
    case 'mastercard':
    case 'mc':
      return 'mastercard';
    case 'amex':
    case 'americanexpress':
      return 'amex';
    case 'discover':
      return 'discover';
    case 'diners':
    case 'dinersclub':
      return 'diners';
    case 'jcb':
      return 'jcb';
    case 'unionpay':
    case 'cup':
      return 'unionpay';
    default:
      return 'unknown';
  }
};

/**
 * The address + tax-id surface the billing-address form drives.
 * Extracted from the generated inline shape so the form can render
 * without re-deriving the type from the parent. `contactInfo.address`
 * is the canonical home (the previous `billingDetails.address` field
 * doesn't exist on the real API).
 */
export type BillingAddress = NonNullable<
  NonNullable<NonNullable<BillingAccount['spec']>['contactInfo']>['address']
>;

export type TaxID = NonNullable<NonNullable<BillingAccount['spec']>['taxIds']>[number];
