import { buildRateQuery } from '@/modules/metrics';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import { transformForRecharts, type FormattedMetricData } from '@/modules/prometheus';
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
    color: 'var(--primary)',
  },
};

// Generate mock data for styling/testing
function generateMockData(): any[] {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const dataPoints: any[] = [];

  // Randomly select a pattern type for variety
  const patternType = Math.floor(Math.random() * 3); // 0 = flat, 1 = peaks, 2 = sawtooth
  const baseValue = 8 + Math.random() * 4; // Random base value between 8-12

  // Generate 288 data points (1 per 5 minutes for last 24 hours)
  let previousValue = baseValue; // Track previous value for smoothing
  for (let i = 0; i < 288; i++) {
    const timestamp = twentyFourHoursAgo + i * 5 * 60 * 1000;
    let value: number;

    if (patternType === 0) {
      // Flat pattern with slight variation
      value = baseValue + (Math.random() - 0.5) * 2;
    } else if (patternType === 1) {
      // Peaks and valleys pattern - flatter with reduced amplitude
      const cycles = 2 + Math.random() * 2; // Random number of cycles (2-4)
      const amplitude = 2 + Math.random() * 2; // Random amplitude (2-4)
      const variation = Math.sin((i / 288) * Math.PI * cycles) * amplitude;
      const noise = (Math.random() - 0.5) * 0.8;
      value = Math.max(6, baseValue + variation + noise);
    } else {
      // Sawtooth pattern - smoother and flatter
      const cycleLength = 48 + Math.random() * 24; // Random cycle length (48-72 points = 4-6 hours)
      const amplitude = 3 + Math.random() * 2; // Random amplitude (3-5)
      const sawtooth = ((i % cycleLength) / cycleLength) * amplitude;
      const noise = (Math.random() - 0.5) * 0.8;
      value = Math.max(6, baseValue + sawtooth + noise);
    }

    // Apply stronger smoothing: blend with previous value (60% new, 40% old) for flatter curves
    value = value * 0.6 + previousValue * 0.4;
    previousValue = value;

    dataPoints.push({
      timestamp,
      requests: value,
    });
  }

  return dataPoints;
}

export function ProxySparkline({ projectId, proxyId }: ProxySparklineProps) {
  // Use mock data for now - set to false to use real data
  const USE_MOCK_DATA = true;

  // Fetch metrics for the last 24 hours
  const endTime = useMemo(() => new Date(), []);
  const startTime = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() - 24);
    return date;
  }, []);

  // Build query for requests rate
  const query = useMemo(() => {
    return buildRateQuery({
      metric: 'envoy_vhost_vcluster_upstream_rq',
      timeWindow: '5m', // 5 minute resolution for last 24 hours
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
      step: '5m', // 5 minute step for 24 hours
    },
    {
      enabled: !!projectId && !!proxyId && !USE_MOCK_DATA,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const chartData = useMemo(() => {
    if (USE_MOCK_DATA) {
      return generateMockData();
    }
    if (!data) return [];
    return transformForRecharts(data);
  }, [data]);

  // Show placeholder if loading, error, or no data (only for real data)
  if (!USE_MOCK_DATA && (isLoading || error || chartData.length === 0)) {
    return <span className="text-muted-foreground text-xs">---</span>;
  }

  // Get the series name (should be the metric name or a generated name)
  const seriesName = USE_MOCK_DATA ? 'requests' : data?.series[0]?.name || 'requests';
  const dataKey = seriesName;

  return (
    <div className="border-border flex h-8 w-full min-w-[200px] items-center justify-center rounded border px-1.5">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${proxyId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
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
              stroke="var(--primary)"
              strokeWidth={1.5}
              fill={`url(#gradient-${proxyId})`}
              fillOpacity={0.3}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
