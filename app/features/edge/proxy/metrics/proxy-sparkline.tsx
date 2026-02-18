import { buildRateQuery } from '@/modules/metrics';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import { transformForRecharts, type FormattedMetricData } from '@/modules/prometheus';
import { SpinnerIcon } from '@datum-ui/components';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@shadcn/ui/chart';
import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface ProxySparklineProps {
  projectId: string;
  proxyId: string;
}

const chartConfig: ChartConfig = {
  requests: {
    label: 'Requests',
    color: '#888888',
  },
};

export function ProxySparkline({ projectId, proxyId }: ProxySparklineProps) {
  // Fetch metrics for the last hour
  const endTime = useMemo(() => new Date(), []);
  const startTime = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() - 1);
    return date;
  }, []);

  // Build query for requests rate
  const query = useMemo(() => {
    return buildRateQuery({
      metric: 'envoy_vhost_vcluster_upstream_rq',
      timeWindow: '1m', // 1 minute resolution for last hour
      baseLabels: {
        resourcemanager_datumapis_com_project_name: projectId,
        gateway_name: proxyId,
        gateway_namespace: 'default',
      },
      // Sum all regions together for a single line
      groupBy: [],
    });
  }, [projectId, proxyId]);

  const { data, isLoading, error } = usePrometheusAPIQuery<FormattedMetricData>(
    ['proxy-sparkline', projectId, proxyId],
    {
      type: 'chart',
      query,
      timeRange: {
        start: startTime,
        end: endTime,
      },
      step: '1m', // 1 minute step for last hour
    },
    {
      enabled: !!projectId && !!proxyId,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

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
      <div className="flex h-8 w-full min-w-[200px] items-center justify-center px-1.5">
        <SpinnerIcon size="sm" />
      </div>
    );
  }

  if (!data || error || chartData.length === 0) {
    return (
      <div className="flex h-8 w-full min-w-[200px] items-center justify-center px-1.5">
        <span className="text-muted-foreground text-xs">No data</span>
      </div>
    );
  }

  return (
    <div className="flex h-8 w-full min-w-[200px] items-center justify-center px-1.5">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
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
                    <div className="border-border bg-background text-1xs rounded-md border px-2 py-1 shadow-sm">
                      <div className="text-foreground font-medium">{value.toFixed(2)} req/s</div>
                    </div>
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
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
