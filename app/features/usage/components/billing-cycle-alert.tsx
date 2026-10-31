import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlertIcon } from 'lucide-react';

/**
 * Shown when the billing account lookup failed upstream: usage still loads,
 * but the cycle picker fell back to default calendar windows, so its dates
 * may not match the account's payment terms.
 */
export function BillingCycleAlert({ show }: { show?: boolean }) {
  if (!show) return null;

  return (
    <Alert variant="destructive" data-e2e="usage-billing-cycle-alert">
      <Icon icon={TriangleAlertIcon} className="size-4" />
      <AlertTitle className="text-destructive text-sm">Could not load billing cycle</AlertTitle>
      <AlertDescription>
        The billing period below uses default dates and may not match your billing account. Try
        again later.
      </AlertDescription>
    </Alert>
  );
}
