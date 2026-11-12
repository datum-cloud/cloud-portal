import { useProxyRequestRate } from '@/features/edge/proxy/metrics/proxy-request-rates';
import { transformForRecharts } from '@/modules/prometheus';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@datum-cloud/datum-ui/chart';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useMemo } from 'react';
import { Area, AreaChart } from 'recharts';

interface ProxySparklineProps {
  proxyId: string;
  /** Width override. Defaults to the ALB table's 200px minimum. */
  className?: string;
}

const chartConfig: ChartConfig = {
  requests: {
    label: 'Requests',
    color: 'var(--primary)',
  },
};

export function ProxySparkline({ proxyId, className }: ProxySparklineProps) {
  const wrapperClassName = cn(
    'flex h-8 w-full min-w-[200px] items-center justify-center px-1.5',
    className
  );

  // The page asks once for every ALB; this row reads its own series.
  const proxyNames = useMemo(() => (proxyId ? [proxyId] : []), [proxyId]);
  const { data, isLoading, error } = useProxyRequestRate(proxyNames);

  const chartData = useMemo(() => {
    if (!data || error) {
      return [];
    }
    return transformForRecharts(data);
  }, [data, error]);

  const seriesName = data?.series[0]?.name || 'requests';
  const dataKey = seriesName;

  if (isLoading) {
    return (
      <div className={wrapperClassName}>
        <SpinnerIcon size="sm" />
      </div>
    );
  }

  if (error?.statusCode === 403 || error?.statusCode === 401) {
    return (
      <div className={wrapperClassName}>
        <Tooltip message="You don't have permission to view metrics">
          <Text size="xs" textColor="muted">
            &mdash;
          </Text>
        </Tooltip>
      </div>
    );
  }

  if (!data || error || chartData.length === 0) {
    return (
      <div className={wrapperClassName}>
        <Text size="xs" textColor="muted">
          No data
        </Text>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`gradient-${proxyId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-requests)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-requests)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <ChartTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const value = payload[0].value as number;
                return (
                  <Text
                    as="div"
                    size="2xs"
                    className="border-border bg-background rounded-md border px-2 py-1 shadow-sm">
                    <div className="text-foreground font-medium">{value.toFixed(2)} req/s</div>
                  </Text>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="var(--color-requests)"
            strokeWidth={1.5}
            fill={`url(#gradient-${proxyId})`}
            fillOpacity={1}
            connectNulls={false}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
