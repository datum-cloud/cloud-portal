import {
  ChartLegendProvider,
  useOptionalChartLegend,
} from '@/modules/metrics/context/chart-legend';
import type { SeriesLegendModifiers } from '@/modules/metrics/utils/series-visibility';
import type { ChartSeries } from '@/modules/prometheus';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';

export function SeriesLegend({
  series,
  labels,
  colors,
  hidden,
  onItemClick,
  className,
}: {
  series: ChartSeries[];
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  hidden?: ReadonlySet<string>;
  onItemClick?: (name: string, modifiers: SeriesLegendModifiers) => void;
  className?: string;
}) {
  if (series.length < 2) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {series.map((item) => {
        const isHidden = hidden?.has(item.name) ?? false;
        const label = labels?.[item.name] ?? item.name;
        const swatch = colors?.[item.name] ?? item.color;

        if (!onItemClick) {
          return (
            <div key={item.name} className="text-foreground flex items-center gap-1.5 text-xs">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: swatch }} />
              {label}
            </div>
          );
        }

        return (
          <button
            key={item.name}
            type="button"
            title="Click to isolate · Shift-click to hide"
            onMouseDown={(event) => {
              if (event.shiftKey) event.preventDefault();
            }}
            onClick={(event) => {
              event.preventDefault();
              onItemClick(item.name, event);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs select-none',
              isHidden
                ? 'text-muted-foreground/50 line-through'
                : 'text-foreground hover:text-foreground/80'
            )}>
            <span
              className={cn('size-2 shrink-0 rounded-full', isHidden && 'opacity-40')}
              style={{ backgroundColor: swatch }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ChartHeading({
  title,
  series: seriesProp,
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
  const legend = useOptionalChartLegend();
  const series = seriesProp ?? legend?.series ?? [];

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium">{title}</p>
        {actions}
      </div>
      <SeriesLegend
        series={series}
        labels={labels}
        colors={colors}
        hidden={legend?.hidden}
        onItemClick={legend?.onLegendClick}
      />
    </div>
  );
}

export function ChartBlock({
  title,
  labels,
  colors,
  actions,
  className,
  children,
}: {
  title: string;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ChartLegendProvider>
      <div className={className ?? 'flex flex-col gap-2'}>
        <ChartHeading title={title} labels={labels} colors={colors} actions={actions} />
        {children}
      </div>
    </ChartLegendProvider>
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
