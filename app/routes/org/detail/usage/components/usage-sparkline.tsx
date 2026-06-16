import { formatByUnit } from '../usage.format';
import type { MeterPoint, MeterUnit } from '../usage.types';
import { cn } from '@datum-cloud/datum-ui/utils';
import { format } from 'date-fns';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

interface UsageSparklineProps {
  apiName: string;
  unit: MeterUnit;
  series: MeterPoint[];
  className?: string;
}

/**
 * Compact daily-usage spark for the summary table. Uses the same aggregate
 * series as the meter cards' Total tab.
 */
export function UsageSparkline({ apiName, unit, series, className }: UsageSparklineProps) {
  const fillId = `usage-spark-${apiName}`.replace(/[^a-zA-Z0-9_-]/g, '-');

  if (series.length === 0) {
    return (
      <div className={cn('bg-muted/40 h-8 w-full min-w-0 rounded-sm', className)} aria-hidden />
    );
  }

  return (
    <div className={cn('h-8 w-full min-w-0', className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as MeterPoint;
              const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
              return (
                <div className="border-border bg-background rounded-md border px-2 py-1 shadow-sm">
                  <div className="text-muted-foreground text-xs">
                    {format(new Date(point.timestamp), 'MMM d, yyyy')}
                  </div>
                  <div className="text-foreground text-xs font-medium tabular-nums">
                    {formatByUnit(unit, value)}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={1.5}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 2, fill: 'var(--primary)' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
