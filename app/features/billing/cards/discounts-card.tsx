import {
  formatDiscountPercentage,
  summarizeDiscounts,
  type AccountDiscount,
} from '@/features/billing/discounts';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { BadgePercentIcon } from 'lucide-react';

interface DiscountsCardProps {
  /** Each service's resolved discount. Services at 0% are left out. */
  discounts: readonly AccountDiscount[];
}

/**
 * Billing settings' "Discounts" section: which discounts apply to this
 * account's usage. Read-only, and renders nothing when no discount is
 * above 0%.
 */
export const DiscountsCard = ({ discounts }: DiscountsCardProps) => {
  const summary = summarizeDiscounts(discounts);
  if (!summary) return null;

  return (
    <Card size="sm" sectioned className="overflow-hidden" data-e2e="discounts-card">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
            <Icon icon={BadgePercentIcon} className="text-primary size-4" />
          </div>
          <Text as="p" weight="semibold">
            {summary.kind === 'uniform'
              ? `${formatDiscountPercentage(summary.percentage)} discount on all usage`
              : 'Discounts on your usage'}
          </Text>
        </div>
        {summary.kind === 'perService' ? (
          <ul className="divide-border flex flex-col divide-y" data-e2e="discounts-list">
            {summary.items.map((item) => (
              <li
                key={item.serviceDisplayName}
                className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                <Text as="span" size="sm" className="min-w-0 break-words">
                  {item.serviceDisplayName}
                </Text>
                <Text as="span" size="sm" weight="medium" className="shrink-0">
                  {formatDiscountPercentage(item.percentage)}
                </Text>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter bordered className="py-3">
        <Text as="p" size="xs" textColor="muted">
          Discounts are applied to your invoices automatically.
        </Text>
      </CardFooter>
    </Card>
  );
};
