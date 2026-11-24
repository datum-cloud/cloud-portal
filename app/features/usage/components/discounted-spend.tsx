import { formatCurrency, formatDiscount, spendDiscount } from '../usage.format';
import { SpendValue } from './spend-value';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * What usage costs. When a discount took something off, the amount before
 * it is struck through beside the cost, with the discount on hover:
 * ~~$19.57~~ $0.
 */
export function DiscountedSpend({
  spend,
  unavailable,
  className,
  beforeClassName,
}: {
  spend?: UsageSpend;
  unavailable?: boolean;
  /** Classes for the cost. */
  className?: string;
  /** Classes for the amount before the discount. */
  beforeClassName?: string;
}) {
  const discount = spendDiscount(spend);
  return (
    <>
      {discount ? (
        <Tooltip message={`${formatDiscount(discount.discount)} (${discount.percent}% off)`}>
          <span
            className={cn(
              'text-muted-foreground mr-1.5 cursor-help tabular-nums line-through',
              beforeClassName
            )}>
            {formatCurrency(discount.beforeDiscounts)}
          </span>
        </Tooltip>
      ) : null}
      <SpendValue spend={spend} unavailable={unavailable} className={className} />
    </>
  );
}
