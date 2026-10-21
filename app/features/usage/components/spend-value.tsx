import { formatCurrency } from '../usage.format';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Spend from `UsageQuery`: the amount, `—` when no plan prices the usage,
 * or "Unavailable" with the API's reason when it could not be computed.
 */
export function SpendValue({
  spend,
  spendError,
  className,
}: {
  spend?: UsageSpend;
  spendError?: string;
  className?: string;
}) {
  if (spend) {
    return <span className={cn('tabular-nums', className)}>{formatCurrency(spend)}</span>;
  }
  if (spendError) {
    return (
      <Tooltip message={`Spend could not be calculated: ${spendError}`}>
        <Text as="span" textColor="muted" className={cn('cursor-help', className)}>
          Unavailable
        </Text>
      </Tooltip>
    );
  }
  return (
    <Text as="span" textColor="muted" className={className}>
      —
    </Text>
  );
}
