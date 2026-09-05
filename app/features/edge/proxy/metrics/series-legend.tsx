import type { ChartSeries } from '@/modules/prometheus';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

export function SeriesLegend({
  series,
  labels,
  colors,
  className,
}: {
  series: ChartSeries[];
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  className?: string;
}) {
  if (series.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {series.map((item) => (
        <div key={item.name} className="text-foreground flex items-center gap-1.5 text-xs">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: colors?.[item.name] ?? item.color }}
          />
          {labels?.[item.name] ?? item.name}
        </div>
      ))}
    </div>
  );
}

export function ChartHeading({
  title,
  series = [],
  labels,
  colors,
  actions,
}: {
  title: string;
  series?: ChartSeries[];
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium">{title}</p>
        {actions}
      </div>
      <SeriesLegend series={series} labels={labels} colors={colors} />
    </div>
  );
}

/** Side-by-side charts whose headings can wrap without shifting the plots. */
export function MetricChartPair({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto]">{children}</div>
  );
}

export const metricChartStackClassName =
  'flex flex-col gap-2 lg:row-span-2 lg:grid lg:grid-rows-subgrid';
