import { usageSummaryTableColumns } from './usage-summary-table';
import { Card, CardContent, CardHeader } from '@datum-cloud/datum-ui/card';
import { GroupedTable } from '@datum-cloud/datum-ui/grouped-table';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';

function UsageSummaryTableSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <GroupedTable
          columns={usageSummaryTableColumns}
          groups={[]}
          isLoading
          enableSorting={false}
          className="[&>div:last-child]:rounded-none [&>div:last-child]:border-0"
        />
      </CardContent>
    </Card>
  );
}

function MeterCardSkeleton() {
  return (
    <Card className="h-full min-w-0 gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-5 pt-5 pb-0">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-6 shrink-0 rounded-sm" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pt-4 pb-5">
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function UsageSectionSkeleton({
  title,
  description,
  children,
  layout = 'split',
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  layout?: 'split' | 'grid';
}) {
  if (layout === 'grid') {
    return (
      <section className="border-border min-w-0 border-b py-8 last:border-b-0 last:pb-0">
        <div className="mb-6 flex max-w-2xl flex-col gap-2">
          <h2 className="text-foreground text-base font-medium">{title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className="border-border grid min-w-0 grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-foreground text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export function UsageDashboardSkeleton({ scopeDescription }: { scopeDescription: string }) {
  return (
    <div className="border-border min-w-0 border-t">
      <UsageSectionSkeleton title="Usage summary" description={scopeDescription}>
        <UsageSummaryTableSkeleton />
      </UsageSectionSkeleton>

      <UsageSectionSkeleton
        title="Services"
        description={`${scopeDescription} Per-meter breakdown for the selected billing period.`}
        layout="grid">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MeterCardSkeleton />
          <MeterCardSkeleton />
          <MeterCardSkeleton />
          <MeterCardSkeleton />
        </div>
      </UsageSectionSkeleton>
    </div>
  );
}
