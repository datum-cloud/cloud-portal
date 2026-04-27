import { buildRateQuery } from '@/modules/metrics';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import { transformForRecharts, type FormattedMetricData } from '@/modules/prometheus';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@datum-cloud/datum-ui/chart';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface ConnectorSparklineProps {
  projectId: string;
  /** Proxy names (gateway_name) that use this connector; request rate is summed across these */
  proxyNames: string[];
  /** Optional stable id for chart elements (e.g. connector name); avoids long or invalid SVG ids */
  connectorId?: string;
}

const chartConfig: ChartConfig = {
  requests: {
    label: 'Requests',
    color: 'var(--primary)',
  },
};

export function ConnectorSparkline({
  projectId,
  proxyNames,
  connectorId = 'connector',
}: ConnectorSparklineProps) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

  const proxyNamesKey = useMemo(() => [...proxyNames].sort().join(','), [proxyNames]);

  const query = useMemo(() => {
    if (!proxyNamesKey) return '';
    const names = proxyNamesKey.split(',');
    return buildRateQuery({
      metric: 'envoy_vhost_vcluster_upstream_rq',
      timeWindow: '1m',
      baseLabels: {
        resourcemanager_datumapis_com_project_name: projectId,
        gateway_namespace: 'default',
      },
      filters: [{ label: 'gateway_name', value: names }],
      groupBy: [],
    });
  }, [projectId, proxyNamesKey]);

  const { data, isLoading, error } = usePrometheusAPIQuery<FormattedMetricData>(
    ['connector-sparkline', projectId, proxyNamesKey],
    {
      type: 'chart',
      query,
      timeRange: { start: startTime, end: endTime },
      step: '1m',
    },
    {
      enabled: !!projectId && proxyNames.length > 0 && !!query,
      refetchInterval: 30000,
    }
  );

  const chartData = useMemo(() => {
    if (!data || error) return [];
    return transformForRecharts(data);
  }, [data, error]);

  const seriesName = data?.series[0]?.name || 'requests';
  const dataKey = seriesName;
  const gradientId = `connector-sparkline-${connectorId}`.replace(/[^a-z0-9-]/gi, '-');

  if (proxyNames.length === 0) {
    return (
      <div className="flex h-8 w-full min-w-[200px] items-center justify-center px-1.5">
        <span className="text-muted-foreground text-xs">No data</span>
      </div>
    );
  }

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
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-requests)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-requests)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
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
              fill={`url(#${gradientId})`}
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
