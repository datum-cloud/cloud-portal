import { formatByUnit, formatCurrency, formatUnitRate, formatUsagePair } from '../usage.format';
import type { MeterPoint, UsageMeter } from '../usage.types';
import { humanizeDimension } from '../usage.view';
import { QuotaIndicator } from './quota-ring';
import { Card, CardContent, CardHeader } from '@datum-cloud/datum-ui/card';
import { Tabs, TabsList, TabsTrigger } from '@datum-cloud/datum-ui/tabs';
import { cn } from '@datum-cloud/datum-ui/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  Bar,
  BarChart,
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
  const data = Array.from(byTimestamp.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((row) => {
      const filled: StackRow = { timestamp: row.timestamp };
      for (const key of keys) {
        filled[key] = row[key] ?? 0;
      }
      return filled;
    });
  return { keys, data };
}

function sumValues(values: MeterPoint[]): number {
  return values.reduce((acc, point) => acc + point.value, 0);
}

/**
 * Per-meter card: title + description, a right-aligned `used / limit`
 * headline with a quota ring, optional breakdown tabs, and a daily bar
 * chart. Amberflo series are day-bucketed sums, so bars (stacked on
 * dimension tabs) match the data better than a smoothed area.
 */
export function MeterCard({ meter }: MeterCardProps) {
  const [activeTab, setActiveTab] = useState(meter.tabs[0]);

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

  const showRate = (meter.spend ?? 0) > 0 || meter.unitRate !== undefined;

  return (
    <Card className="@container h-full min-w-0 gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardHeader className="flex flex-col gap-2 space-y-0 px-4 pt-4 pb-0 @sm:px-5 @sm:pt-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h3 className="text-foreground min-w-0 text-base leading-snug font-medium">
            {meter.label}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-foreground text-sm font-medium tabular-nums">
              {formatUsagePair(meter.unit, meter.used, meter.limit)}
            </span>
            <QuotaIndicator used={meter.used} limit={meter.limit} size={24} />
          </div>
        </div>
        {meter.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {meter.description}
          </p>
        ) : null}
        {showRate ? (
          <p className="text-muted-foreground min-w-0 text-xs leading-relaxed wrap-break-word tabular-nums">
            {formatUnitRate(meter.unitRate, meter.unit, meter.currencyCode, meter.pricingUnit)}
            {(meter.spend ?? 0) > 0 ? (
              <>
                {' · '}
                <span className="text-foreground font-medium">
                  {formatCurrency(meter.spend, meter.currencyCode)} spent
                </span>
              </>
            ) : null}
          </p>
        ) : null}
      </CardHeader>

      {hasBreakdownTabs ? (
        <div className="min-w-0 px-4 pt-3 @sm:px-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 bg-transparent">
            <div className="scrollbar-hide min-w-0 overflow-x-auto">
              <TabsList className="inline-flex h-auto w-max justify-start gap-3 rounded-none bg-transparent p-0">
                {meter.tabs.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className={cn(
                      'relative w-fit !flex-none shrink-0 rounded-none border-b border-transparent bg-transparent px-0 py-1 text-xs leading-none font-normal shadow-none',
                      'focus-visible:ring-0 focus-visible:outline-hidden',
                      'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none'
                    )}>
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
      ) : null}

      <CardContent className="min-w-0 px-4 pt-4 pb-4 @sm:px-5 @sm:pb-5">
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
            <BarChart
              data={chartData as Record<string, number>[]}
              barCategoryGap="24%"
              margin={{
                top: 14,
                right: 8,
                left: 0,
                bottom: isStackedChart ? 20 : 4,
              }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                tickLine={false}
                axisLine={false}
                minTickGap={36}
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
                cursor={{ fill: 'var(--muted)', fillOpacity: 0.45 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const stackedRows = [...payload]
                    .reverse()
                    .filter((entry) => typeof entry.value === 'number' && entry.value > 0);
                  return (
                    <div className="border-border bg-background rounded-md border px-2.5 py-1.5 shadow-sm">
                      <div className="text-muted-foreground text-xs">
                        {format(new Date(label as number), 'MMM d, yyyy')}
                      </div>
                      {isStackedChart && stack ? (
                        stackedRows.length > 0 ? (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {stackedRows.map((entry) => (
                              <div
                                key={entry.dataKey as string}
                                className="text-foreground flex items-center gap-1.5 text-xs">
                                <span
                                  className="size-2 shrink-0 rounded-[2px]"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-muted-foreground">
                                  {String(entry.dataKey)}
                                </span>
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
                          <div className="text-foreground mt-1 text-xs font-medium">
                            {formatByUnit(meter.unit, 0)}
                          </div>
                        )
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
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      stackId="breakdown"
                      fill={STACK_COLORS[index % STACK_COLORS.length]}
                      maxBarSize={18}
                      isAnimationActive={false}
                    />
                  ))}
                </>
              ) : (
                <Bar
                  dataKey="value"
                  fill="var(--primary)"
                  maxBarSize={18}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
