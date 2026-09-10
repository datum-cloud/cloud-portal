import { DateTime } from '@/components/date-time';
import { toChartLabelDate } from '@/modules/metrics/utils/chart-axis';
import type { ReactNode } from 'react';

type TooltipItem = {
  value?: unknown;
  name?: unknown;
  color?: string;
  payload?: { fill?: string };
};

export function MetricsChartTooltip({
  active,
  payload,
  label,
  formatName,
  formatValue,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: ReactNode;
  formatName?: (name: string) => ReactNode;
  formatValue?: (value: number, name: string) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((item) => Number(item.value) > 0);
  if (!items.length) return null;

  return (
    <div className="border-border/50 bg-background min-w-[13rem] rounded-lg border px-3.5 py-2.5 shadow-xl">
      <div className="text-muted-foreground mb-2 text-xs">
        <DateTime date={toChartLabelDate(label)} />
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const name = String(item.name ?? '');
          const color = item.payload?.fill || item.color;
          return (
            <div key={name} className="flex w-full min-w-0 items-center justify-between gap-8">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground truncate">{formatName?.(name) ?? name}</span>
              </div>
              <span className="text-foreground shrink-0 font-mono font-medium tabular-nums">
                {formatValue
                  ? formatValue(Number(item.value), name)
                  : Number(item.value).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
