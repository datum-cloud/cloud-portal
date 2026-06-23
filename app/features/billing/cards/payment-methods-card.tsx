import { CardBrandIcon } from '@/features/billing/components/card-brand-icon';
import {
  AddPaymentMethodDialog,
  type AddPaymentMethodValues,
  type CreatePaymentMethodResult,
  type StripeBillingDetailsPrefill,
} from '@/features/billing/dialogs/add-payment-method-dialog';
import {
  isDefaultPaymentMethod,
  normalizeCardBrand,
  type BillingAccount,
  type CardBrand,
  type PaymentMethod,
  type PaymentMethodPhase,
} from '@/features/billing/types';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

/** Human label for each brand, surfaced as the secondary text line. */
const brandLabels: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  unknown: 'Card',
};

// Active is the happy path — every healthy card lives there — so we skip the
// badge in that case and only surface a pill when the row actually carries
// useful state.
const phaseBadge: Record<
  Exclude<PaymentMethodPhase, 'Active'>,
  { label: string; type: 'warning' | 'danger' | 'muted' }
> = {
  Pending: { label: 'Pending', type: 'muted' },
  AwaitingConfirmation: { label: 'Awaiting confirmation', type: 'warning' },
  Failed: { label: 'Failed', type: 'danger' },
};

const formatExpiry = (month: number, year: number) =>
  `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;

/**
 * Cards within this window of expiry get a soft warning pill so the user
 * has time to swap them before invoices start failing. Tuned to roughly
 * "two billing cycles" — long enough that we're not crying wolf, short
 * enough to actually be useful.
 */
const EXPIRES_SOON_WINDOW_DAYS = 60;

type ExpiryStatus = 'ok' | 'soon' | 'expired';

const getExpiryStatus = (expMonth: number, expYear: number): ExpiryStatus => {
  // JS Date months are 0-indexed and `day=0` rolls back to the previous
  // month's last day, so `(expYear, expMonth, 0)` is the last day of the
  // expMonth itself.
  const expEndMs = new Date(expYear, expMonth, 0, 23, 59, 59).getTime();
  const daysUntilExpiry = Math.floor((expEndMs - Date.now()) / 86_400_000);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= EXPIRES_SOON_WINDOW_DAYS) return 'soon';
  return 'ok';
};

interface PaymentMethodRowProps {
  method: PaymentMethod;
  isDefault: boolean;
  onSetAsDefault?: (method: PaymentMethod) => void;
  onRemove?: (method: PaymentMethod) => void;
}

const PaymentMethodRow = ({
  method,
  isDefault,
  onSetAsDefault,
  onRemove,
}: PaymentMethodRowProps) => {
  const card = method.status?.details?.card;
  const brand: CardBrand = normalizeCardBrand(card?.brand);
  const brandLabel = brandLabels[brand];
  // `phase` defaults to `Pending` when the controller hasn't published
  // status yet — surface the muted "Pending" pill rather than hiding
  // the row entirely so the user knows their action landed.
  const phase = (() => {
    const current = method.status?.phase ?? 'Pending';
    return current === 'Active' ? null : phaseBadge[current];
  })();
  const expiryStatus: ExpiryStatus = card
    ? getExpiryStatus(card.expiryMonth, card.expiryYear)
    : 'ok';

  return (
    // The row reflows on its own container width rather than the viewport,
    // because this card lives in a narrow right-hand column at `md` widths.
    <div className="@container px-5 py-4">
      <div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between @md:gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <CardBrandIcon brand={brand} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground text-sm font-medium">
                {method.spec?.displayName}
              </span>
              {isDefault && (
                <Badge type="primary" theme="outline" className="text-2xs font-medium">
                  Default
                </Badge>
              )}
              {phase && (
                <Badge type={phase.type} theme="light" className="text-2xs font-medium">
                  {phase.label}
                </Badge>
              )}
              {expiryStatus === 'expired' && (
                <Badge type="danger" theme="light" className="text-2xs font-medium">
                  Expired
                </Badge>
              )}
              {expiryStatus === 'soon' && (
                <Badge type="warning" theme="light" className="text-2xs font-medium">
                  Expires soon
                </Badge>
              )}
            </div>
            <span className="text-muted-foreground text-xs">
              {brandLabel} •••• {card?.last4 ?? '••••'}
              {card && (
                <>
                  {' · '}Expires {formatExpiry(card.expiryMonth, card.expiryYear)}
                </>
              )}
            </span>
          </div>
        </div>

        {/*
          The default card has no row-level actions: "Set as default" is
          implicit (it already is), and remove is gated by the default-
          payment-method deletion-guard webhook server-side anyway. Hiding
          both buttons matches that — a disabled red trash button suggests
          "destructive action you can't perform" which is louder than the
          row deserves.
        */}
        {!isDefault && (
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              htmlType="button"
              type="quaternary"
              theme="outline"
              size="xs"
              disabled={method.status?.phase !== 'Active'}
              onClick={() => onSetAsDefault?.(method)}>
              Set as default
            </Button>
            <Button
              htmlType="button"
              type="quaternary"
              theme="outline"
              size="xs"
              aria-label={`Remove ${method.spec?.displayName ?? 'payment method'}`}
              onClick={() => onRemove?.(method)}
              icon={<Icon icon={Trash2Icon} className="size-3.5" />}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface PaymentMethodsCardProps {
  /**
   * Payment methods returned by the billing service. Empty / undefined renders
   * the empty state.
   */
  paymentMethods?: PaymentMethod[];
  /** The owning billing account — used to identify which card is the default. */
  billingAccount?: BillingAccount;
  /**
   * Stripe publishable key for the tenant's Stripe account, fetched from
   * the `StripeProviderConfig` resource. Forwarded to the add-payment
   * dialog. When undefined the dialog shows a "card payments aren't ready
   * yet" fallback.
   */
  stripePublishableKey?: string;
  /**
   * Creates a `PaymentMethod` CRD via the billing API and returns the
   * SetupIntent `clientSecret` minted by the stripe-provider so the dialog
   * can mount Stripe Elements. Throw / return `null` to keep the dialog on
   * step 1.
   */
  onCreatePaymentMethod?: (
    values: AddPaymentMethodValues
  ) => Promise<CreatePaymentMethodResult | null | undefined>;
  /**
   * Fired after Stripe Elements confirms the SetupIntent. Parent should
   * refetch the payment-method list — `phase` will flip to `Active`
   * asynchronously when the provider's webhook lands.
   */
  onPaymentMethodConfirmed?: () => void;
  onSetAsDefault?: (method: PaymentMethod) => void;
  onRemove?: (method: PaymentMethod) => void;
  billingDetailsPrefill?: StripeBillingDetailsPrefill;
}

export const PaymentMethodsCard = ({
  paymentMethods = [],
  billingAccount,
  stripePublishableKey,
  onCreatePaymentMethod,
  onPaymentMethodConfirmed,
  onSetAsDefault,
  onRemove,
  billingDetailsPrefill,
}: PaymentMethodsCardProps) => {
  const [open, setOpen] = useState(false);
  const hasMethods = paymentMethods.length > 0;

  return (
    <>
      <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
        {hasMethods ? (
          <CardContent className="divide-border divide-y p-0">
            {paymentMethods.map((method) => (
              <PaymentMethodRow
                key={method.metadata?.uid ?? method.metadata?.name}
                method={method}
                isDefault={isDefaultPaymentMethod(method, billingAccount)}
                onSetAsDefault={onSetAsDefault}
                onRemove={onRemove}
              />
            ))}
          </CardContent>
        ) : (
          <CardContent className="px-5 py-4">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              No payment methods
            </CardTitle>
          </CardContent>
        )}
        <CardFooter className="flex justify-end border-t px-5 py-4">
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="xs"
            onClick={() => setOpen(true)}
            icon={<Icon icon={PlusIcon} className="size-3.5" />}>
            Add a payment method
          </Button>
        </CardFooter>
      </Card>

      <AddPaymentMethodDialog
        open={open}
        onOpenChange={setOpen}
        stripePublishableKey={stripePublishableKey}
        forceDefault={!hasMethods}
        billingDetailsPrefill={billingDetailsPrefill}
        onCreatePaymentMethod={onCreatePaymentMethod}
        onConfirmed={() => {
          onPaymentMethodConfirmed?.();
          setOpen(false);
        }}
      />
    </>
  );
};
