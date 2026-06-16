import { Card, CardContent, CardHeader } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { cn } from '@datum-cloud/datum-ui/utils';

const ROW_INSET =
  '[&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 sm:[&_th:first-child]:pl-5 sm:[&_th:last-child]:pr-5 sm:[&_td:first-child]:pl-5 sm:[&_td:last-child]:pr-5';

const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

const PRODUCT_COL_CLASS = 'max-w-0 w-[65%] overflow-hidden sm:w-[16rem] sm:max-w-[16rem]';
const TREND_COL_CLASS = 'hidden w-0 p-0 sm:table-cell sm:w-48 sm:p-2';
const USAGE_COL_CLASS = 'w-[35%] shrink-0 overflow-hidden text-right sm:w-36';

function UsageSummaryTableSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className={cn('w-full table-fixed', ROW_INSET, HEADER_DIVIDERS)}>
            <colgroup>
              <col className="w-[65%] sm:w-[16rem]" />
              <col className="hidden w-0 sm:table-column sm:w-48" />
              <col className="w-[35%] sm:w-36" />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-background hover:bg-background">
                <TableHead className={cn('text-foreground text-xs font-medium', PRODUCT_COL_CLASS)}>
                  Product
                </TableHead>
                <TableHead className={cn('text-foreground text-xs font-medium', TREND_COL_CLASS)}>
                  Trend
                </TableHead>
                <TableHead className={cn('text-foreground text-xs font-medium', USAGE_COL_CLASS)}>
                  Usage
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={3} className="py-0 pr-4 pl-4 sm:pr-5 sm:pl-5">
                  <div className="flex h-10 items-center gap-2">
                    <Skeleton className="size-4 shrink-0 rounded-sm" />
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-4 w-5 rounded-full" />
                  </div>
                </TableCell>
              </TableRow>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className={cn('text-sm', PRODUCT_COL_CLASS)}>
                    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                      <Skeleton className="size-[18px] shrink-0 rounded-sm" />
                      <Skeleton className="h-4 w-full max-w-40" />
                    </div>
                  </TableCell>
                  <TableCell className={TREND_COL_CLASS}>
                    <Skeleton className="h-8 w-full rounded-sm" />
                  </TableCell>
                  <TableCell className={cn('text-sm', USAGE_COL_CLASS)}>
                    <Skeleton className="ml-auto h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MeterCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-4 pt-6 pb-0 sm:px-8 sm:pt-8">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40 max-w-full sm:h-6 sm:w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-6 shrink-0 rounded-sm" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-4 pb-6 sm:px-8 sm:pb-8">
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function UsageSectionSkeleton({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border grid grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function UsageDashboardSkeleton({ scopeDescription }: { scopeDescription: string }) {
  return (
    <div className="border-border border-t">
      <UsageSectionSkeleton
        title="Usage summary"
        description={`${scopeDescription} Your plan includes a set allowance for each metered service.`}>
        <UsageSummaryTableSkeleton />
      </UsageSectionSkeleton>

      <UsageSectionSkeleton
        title="Services"
        description={`${scopeDescription} Usage for services across this organization, aggregated for the current period.`}>
        <MeterCardSkeleton />
        <MeterCardSkeleton />
      </UsageSectionSkeleton>
    </div>
  );
}
