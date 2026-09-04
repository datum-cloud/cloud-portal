import type { ChartSeries } from '@/modules/prometheus';

export function SeriesLegend({
  series,
  labels,
  colors,
}: {
  series: ChartSeries[];
  labels?: Record<string, string>;
  colors?: Record<string, string>;
}) {
  if (series.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((item) => (
        <div key={item.name} className="text-foreground flex items-center gap-1.5 text-xs">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: colors?.[item.name] ?? item.color }}
          />
          {labels?.[item.name] ?? item.name}
        </div>
      ))}
    </div>
  );
}
