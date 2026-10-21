import { formatCurrency } from '../usage.format';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Spend from `UsageQuery`: the amount, `—` when no plan prices the usage,
 * or "Unavailable" when it could not be computed. The API's reason can name
 * plan or meter internals, so it stays in the server logs.
 */
export function SpendValue({
  spend,
  unavailable,
  className,
}: {
  spend?: UsageSpend;
  unavailable?: boolean;
  className?: string;
}) {
  if (spend) {
    return <span className={cn('tabular-nums', className)}>{formatCurrency(spend)}</span>;
  }
  if (unavailable) {
    return (
      <Tooltip message="Spend could not be calculated for this period.">
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
