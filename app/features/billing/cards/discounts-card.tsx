import {
  formatDiscountPercentage,
  summarizeDiscounts,
  type AccountDiscount,
} from '@/features/billing/discounts';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';

// Line the first/last cells up with the card padding, as the other billing
// tables do.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';

const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

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
      {summary.kind === 'uniform' ? (
        <CardContent>
          <Text as="p" size="sm" weight="medium" textColor="default">
            {formatDiscountPercentage(summary.percentage)} discount on all usage
          </Text>
        </CardContent>
      ) : (
        <CardContent padding="none">
          <Table className={cn(ROW_INSET, HEADER_DIVIDERS)} data-e2e="discounts-list">
            <TableHeader>
              <TableRow className="bg-background hover:bg-background">
                <TableHead className="text-foreground text-xs font-medium">Service</TableHead>
                <TableHead className="text-foreground w-32 text-xs font-medium">Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.items.map((item) => (
                <TableRow key={item.serviceDisplayName}>
                  <TableCell className="h-11 text-sm">{item.serviceDisplayName}</TableCell>
                  <TableCell className="h-11 text-sm">
                    {formatDiscountPercentage(item.percentage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
      <CardFooter bordered className="text-muted-foreground bg-background py-3 text-xs">
        Discounts are applied to your invoices automatically.
      </CardFooter>
    </Card>
  );
};
