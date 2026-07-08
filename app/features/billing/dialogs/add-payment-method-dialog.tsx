import {
  StripePaymentMethodForm,
  type AddPaymentMethodValues,
  type CreatePaymentMethodResult,
  type StripeBillingDetailsPrefill,
} from '@/modules/stripe';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ClockIcon } from 'lucide-react';

// Re-export shared types so consumers can keep importing them from the
// dialog. The Stripe module owns the canonical definitions.
export type { AddPaymentMethodValues, CreatePaymentMethodResult, StripeBillingDetailsPrefill };

/**
 * Add Payment Method dialog.
 *
 * Provider-agnostic shell: this file owns the `<Dialog>` chrome, the
 * public props (`AddPaymentMethodDialogProps`), and the customer-facing
 * fallback shown when no payment provider is configured. The actual
 * "collect card + address + confirm" UI lives in a provider module — at
 * the moment that's `@/modules/stripe` (Stripe Elements + deferred
 * SetupIntent flow). When a second provider lands the dialog will dispatch
 * on whichever `*ProviderConfig` resource the tenant has.
 *
 * Until the `PaymentMethod` API merges, calls into the dialog will hit the
 * "card payments aren't ready yet" fallback because no `publishableKey` is
 * being passed down from the page yet. Once the page can fetch a
 * `StripeProviderConfig` it just forwards its publishable key into
 * `<PaymentMethodsCard stripePublishableKey={...}>` and the full Stripe
 * flow lights up.
 */
interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Stripe publishable key for the tenant's Stripe account, fetched from
   * the `StripeProviderConfig` resource. When undefined the dialog renders
   * the "card payments aren't ready yet" fallback instead of mounting the
   * Stripe form — that's the expected state today, until the
   * `StripePaymentMethod` API ships.
   */
  stripePublishableKey?: string;
  /**
   * Whether this card should be offered as the default. The first card on
   * an account is typically forced to be the default — pass `true` to
   * lock the checkbox on.
   */
  forceDefault?: boolean;
  /**
   * Creates the `PaymentMethod` CRD via the billing API and waits for the
   * provider to publish whatever it needs to finish the flow (a SetupIntent
   * `clientSecret` for Stripe). Return `null` (or throw) to keep the
   * dialog open — surface user-actionable errors via your toast layer.
   *
   * Not wired today: the dialog will surface a friendly error if this
   * callback isn't provided or returns null. That's the expected state
   * until the `PaymentMethod` API lands.
   */
  onCreatePaymentMethod?: (
    values: AddPaymentMethodValues
  ) => Promise<CreatePaymentMethodResult | null | undefined>;
  /**
   * Called after the provider finishes confirming the payment method. The
   * parent should refetch the payment-method list; the resource will
   * transition to `phase=Active` asynchronously via the provider's webhook
   * handler.
   */
  onConfirmed?: () => void;
  /**
   * Email/name omitted from PaymentElement — forwarded to Stripe at confirm time.
   * Typically sourced from billing account contact info.
   */
  billingDetailsPrefill?: StripeBillingDetailsPrefill;
}

export const AddPaymentMethodDialog = ({
  open,
  onOpenChange,
  stripePublishableKey,
  forceDefault = false,
  onCreatePaymentMethod,
  onConfirmed,
  billingDetailsPrefill,
}: AddPaymentMethodDialogProps) => {
  const onClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-2xl">
        {stripePublishableKey ? (
          <StripePaymentMethodForm
            publishableKey={stripePublishableKey}
            forceDefault={forceDefault}
            billingDetailsPrefill={billingDetailsPrefill}
            onClose={onClose}
            onCreatePaymentMethod={onCreatePaymentMethod}
            onConfirmed={onConfirmed}
          />
        ) : (
          <UnconfiguredBody onClose={onClose} />
        )}
      </Dialog.Content>
    </Dialog>
  );
};

/**
 * Customer-facing fallback shown when no payment provider is wired up.
 * Today this is the expected state — the `PaymentMethod` API isn't merged
 * yet, and the portal hasn't been given a publishable key for the tenant's
 * Stripe account. Avoid leaking that into copy: the user just sees a polite
 * "not ready yet" message with a way to get a human if they're stuck.
 */
const UnconfiguredBody = ({ onClose }: { onClose: () => void }) => (
  <>
    <Dialog.Header
      className="mb-0 border-b"
      title="Card payments aren't ready yet"
      description="We're still getting card payments set up for your account."
      onClose={onClose}
    />
    <Dialog.Body className="mb-0 flex flex-col gap-3 px-5 py-6">
      <div className="border-border bg-muted/40 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
        <Icon icon={ClockIcon} className="text-muted-foreground size-5" />
        <p className="text-foreground text-sm font-medium">Almost there</p>
        <p className="text-muted-foreground max-w-md text-xs">
          You&apos;ll be able to add a card here soon. In the meantime, if you need to get one on
          file straight away our team is happy to help.
        </p>
      </div>
    </Dialog.Body>
    <Dialog.Footer className="border-t">
      <Button htmlType="button" type="quaternary" theme="outline" onClick={onClose}>
        Close
      </Button>
      <Button
        htmlType="button"
        type="primary"
        onClick={() =>
          openSupportMessage({
            subject: 'Adding a payment method',
            text: "I need to add a card to my account and the form isn't working",
          })
        }>
        Contact support
      </Button>
    </Dialog.Footer>
  </>
);
