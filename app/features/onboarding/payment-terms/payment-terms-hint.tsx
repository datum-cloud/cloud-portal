import { paymentTermsPath, type PaymentTermsEntry } from '@/features/billing/payment-terms-paths';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Link } from 'react-router';

const hintLinkClassName = 'text-primary cursor-pointer underline underline-offset-2';

/**
 * "Can't pay by card? Apply for payment terms": a quiet line under the card
 * form's payment method field, in onboarding, when finishing an existing
 * org's setup, and when adding an org from the organizations page. Card
 * entry stays the obvious path. With `onApply`, the
 * caller handles the click (and the navigation) instead of a plain link.
 */
export function PaymentTermsHint({
  orgId,
  entry,
  onApply,
}: {
  orgId: string;
  entry: PaymentTermsEntry;
  onApply?: (orgId: string) => void;
}) {
  return (
    <Text as="p" size="2xs" textColor="muted" data-e2e="payment-terms-hint">
      Can&apos;t pay by card?{' '}
      {onApply ? (
        <button
          type="button"
          className={hintLinkClassName}
          onClick={() => onApply(orgId)}
          data-e2e="apply-for-payment-terms">
          Apply for payment terms
        </button>
      ) : (
        <Link
          to={paymentTermsPath({ orgId, entry })}
          className={hintLinkClassName}
          data-e2e="apply-for-payment-terms">
          Apply for payment terms
        </Link>
      )}
    </Text>
  );
}
