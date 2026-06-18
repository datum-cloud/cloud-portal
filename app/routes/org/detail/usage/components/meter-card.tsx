import { formatByUnit, formatUsagePair } from '../usage.format';
import type { MeterPoint, UsageMeter } from '../usage.types';
import { humanizeDimension } from '../usage.view';
import { QuotaIndicator } from './quota-ring';
import { Card, CardContent, CardHeader } from '@datum-cloud/datum-ui/card';
import { Tabs, TabsList, TabsTrigger } from '@datum-cloud/datum-ui/tabs';
import { cn } from '@datum-cloud/datum-ui/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MeterCardProps {
  meter: UsageMeter;
}

// Distinct fills for stacked breakdown series. The first reuses the brand
// primary so the "Total" → breakdown transition feels continuous; the
// rest are a small, color-blind-friendly palette.
const STACK_COLORS = ['var(--primary)', '#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899'];

const MAX_STACK_SERIES = 6;

type StackRow = Record<string, number>;

/** Merge a dimension's grouped series into stacked rows keyed by timestamp. */
function buildStackData(series: { groupValue: string; values: MeterPoint[] }[]): {
  keys: string[];
  data: StackRow[];
} {
  const top = [...series]
    .sort((a, b) => sumValues(b.values) - sumValues(a.values))
    .slice(0, MAX_STACK_SERIES);
  const keys = top.map((s) => s.groupValue);

  const byTimestamp = new Map<number, StackRow>();
  for (const s of top) {
    for (const point of s.values) {
      const row = byTimestamp.get(point.timestamp) ?? { timestamp: point.timestamp };
      row[s.groupValue] = (row[s.groupValue] ?? 0) + point.value;
      byTimestamp.set(point.timestamp, row);
    }
  }
  const data = Array.from(byTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
  return { keys, data };
}

function sumValues(values: MeterPoint[]): number {
  return values.reduce((acc, point) => acc + point.value, 0);
}

/**
 * Per-meter card from the Figma: title + description, a right-aligned
 * `used / limit` headline with a quota ring, optional breakdown tabs,
 * and a filled area chart. The "Total" tab shows the
 * aggregate series; dimension tabs render the live per-group breakdown as
 * a stacked area chart.
 */
export function MeterCard({ meter }: MeterCardProps) {
  const [activeTab, setActiveTab] = useState(meter.tabs[0]);
  // Meter api names can contain dots/slashes (e.g.
  // `assistant.miloapis.com/conversation/input-tokens`), which aren't
  // valid in an SVG id or a `url(#...)` reference — sanitize them.
  const fillId = `usage-fill-${meter.apiName}`.replace(/[^a-zA-Z0-9_-]/g, '-');

  const isBreakdownView = activeTab !== 'Total';
  const activeBreakdown = isBreakdownView
    ? (meter.breakdowns ?? []).find((b) => humanizeDimension(b.dimension) === activeTab)
    : undefined;
  const stack =
    activeBreakdown && activeBreakdown.series.length > 0
      ? buildStackData(activeBreakdown.series)
      : null;
  const isStackedChart = Boolean(stack && stack.keys.length > 0);
  const chartData = isStackedChart ? stack!.data : meter.series;
  const hasBreakdownTabs = (meter.breakdowns?.length ?? 0) > 0;

  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 px-4 pt-6 pb-0 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-foreground text-base font-medium sm:text-lg">{meter.label}</h3>
          {meter.description ? (
            <p className="text-muted-foreground text-sm leading-relaxed">{meter.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="text-foreground text-right text-sm font-medium tabular-nums">
            {formatUsagePair(meter.unit, meter.used, meter.limit)}
          </span>
          <QuotaIndicator used={meter.used} limit={meter.limit} size={24} />
        </div>
      </CardHeader>

      {hasBreakdownTabs ? (
        <div className="px-4 pt-4 sm:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 bg-transparent">
            <TabsList className="scrollbar-hide h-auto max-w-full justify-start gap-4 overflow-x-auto rounded-none bg-transparent p-0">
              {meter.tabs.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    'relative shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 text-xs font-normal shadow-none',
                    'focus-visible:ring-0 focus-visible:outline-hidden',
                    'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none'
                  )}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      <CardContent className="px-4 pt-4 pb-6 sm:px-8 sm:pb-8">
        {isBreakdownView && !isStackedChart ? (
          <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
            No {activeTab.toLowerCase()} breakdown recorded in this period.
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
            No usage recorded in this period.
          </div>
        ) : (
          <ResponsiveContainer key={activeTab} width="100%" height={isStackedChart ? 248 : 220}>
            <AreaChart
              data={chartData as Record<string, number>[]}
              margin={{
                top: 4,
                right: 8,
                left: 0,
                bottom: isStackedChart ? 20 : 0,
              }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value) =>
                  formatByUnit(meter.unit, typeof value === 'number' ? value : 0)
                }
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: 'var(--border)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="border-border bg-background rounded-md border px-2.5 py-1.5 shadow-sm">
                      <div className="text-muted-foreground text-xs">
                        {format(new Date(label as number), 'MMM d, yyyy')}
                      </div>
                      {isStackedChart && stack ? (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {payload.map((entry) => (
                            <div
                              key={entry.dataKey as string}
                              className="text-foreground flex items-center gap-1.5 text-xs">
                              <span
                                className="size-2 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">{String(entry.dataKey)}</span>
                              <span className="ml-auto font-medium tabular-nums">
                                {formatByUnit(
                                  meter.unit,
                                  typeof entry.value === 'number' ? entry.value : 0
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-foreground text-xs font-medium">
                          {meter.label}:{' '}
                          {formatByUnit(
                            meter.unit,
                            typeof payload[0].value === 'number' ? payload[0].value : 0
                          )}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {isStackedChart && stack ? (
                <>
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="square"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  {stack.keys.map((key, index) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stackId="breakdown"
                      stroke={STACK_COLORS[index % STACK_COLORS.length]}
                      strokeWidth={1.5}
                      fill={STACK_COLORS[index % STACK_COLORS.length]}
                      fillOpacity={0.18}
                    />
                  ))}
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill={`url(#${fillId})`}
                  dot={{
                    r: 3,
                    fill: 'var(--primary)',
                    stroke: 'var(--background)',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 4,
                    fill: 'var(--primary)',
                    stroke: 'var(--background)',
                    strokeWidth: 2,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
