import { formatCurrency, formatDiscount, spendDiscount } from '../usage.format';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * What a discounted spend cost before its discount, and what the discount
 * took off: `$412.30 before discount · −$412.30 (100% off)`. Renders nothing
 * when nothing was discounted.
 */
export function SpendBreakdown({ spend, className }: { spend?: UsageSpend; className?: string }) {
  const discount = spendDiscount(spend);
  if (!discount) return null;
  return (
    <Text as="p" size="xs" textColor="muted" className={cn('tabular-nums', className)}>
      {formatCurrency(discount.beforeDiscounts)} before discount ·{' '}
      {formatDiscount(discount.discount)} ({discount.percent}% off)
    </Text>
  );
}
