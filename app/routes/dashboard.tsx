/**
 * Dashboard Playground - Prometheus Module Demo
 * Showcases various chart types and metric cards using the Prometheus module
 */
import { DateFormat } from '@/components/date-format/date-format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipContent } from '@/components/ui/chart';
import { MetricChart } from '@/modules/metrics/components/MetricChart';
import { MetricsControls } from '@/modules/metrics/components/controls';
import { MetricsProvider, useMetrics } from '@/modules/metrics/context';
import { Activity } from 'lucide-react';
import { useEffect } from 'react';

function DashboardContent() {
  const { timeRange, step } = useMetrics();

  useEffect(() => {
    console.log(timeRange);
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Playground</h1>
            <p className="mt-1 text-gray-600">Prometheus Module Demo - Various Charts & Metrics</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Demo
          </Badge>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsControls />
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Domain Verification Chart */}
          <MetricChart
            query="sum(rate(vector_adaptive_concurrency_limit_sum{}[$__rate_interval]))/sum(rate(vector_adaptive_concurrency_limit_count{}[$__rate_interval]))"
            title="vector_adaptive_concurrency_limit (average)"
            chartType="line"
            step={step}
            timeRange={timeRange}
            showLegend={false}
            showTooltip={true}
          />

          <MetricChart
            query="avg(datum_cloud_networking_domain_status_next_verification_attempt{})"
            title="datum_cloud_networking_domain_status_next_verification_attempt (average)"
            chartType="line"
            valueFormat="short-number"
            step={step}
            timeRange={timeRange}
            showLegend={false}
            showTooltip={true}
          />

          <MetricChart
            query={`sum(rate(envoy_vhost_vcluster_upstream_rq{resourcemanager_datumapis_com_project_name="jreese-test-5d2p7z", label_topology_kubernetes_io_region!=""}[1m])) by (label_topology_kubernetes_io_region)`}
            title="Regional Upstream RPS"
            chartType="line"
            step={step}
            timeRange={timeRange}
            showLegend={true}
            showTooltip={true}
            yAxisFormatter={(value) => `${value.toFixed(3)} req/s`}
            yAxisOptions={{ width: 80 }}
            tooltipContent={({ active, payload, label, ...props }) => {
              if (active && payload && payload.length) {
                const filteredPayload = payload.filter((p) => p.value > 0);
                if (filteredPayload.length === 0) return null;

                return (
                  <ChartTooltipContent
                    active={active}
                    payload={filteredPayload}
                    label={label}
                    labelFormatter={(value) => <DateFormat date={value} />}
                    formatter={(value, name, item) => {
                      const indicatorColor = item.payload.fill || item.color;
                      return (
                        <div className="flex flex-1 items-center justify-between leading-none">
                          <div className="flex items-center gap-1">
                            <div
                              className="size-2.5 shrink-0 rounded-[2px]"
                              style={{
                                backgroundColor: indicatorColor,
                                borderColor: indicatorColor,
                              }}></div>
                            <span className="font-medium">{name}</span>
                          </div>
                          <div className="text-foreground font-medium">
                            {`${(value as number).toFixed(3)} req/s`}
                          </div>
                        </div>
                      );
                    }}
                    {...props}
                  />
                );
              }
              return null;
            }}
          />
        </div>

        {/* Demo Information */}
        <Card>
          <CardHeader>
            <CardTitle>About This Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              This dashboard demonstrates the Prometheus module capabilities with various chart
              types and metric cards. All components are using real Prometheus queries and support
              real-time updates.
            </p>

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-semibold">Features Demonstrated:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• MetricCard components with different formats</li>
                  <li>• MetricChart with line, area, and bar types</li>
                  <li>• Real-time data updates</li>
                  <li>• Configurable time ranges and intervals</li>
                  <li>• Multi-series chart support</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Module Benefits:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• TypeScript-first with complete type safety</li>
                  <li>• TanStack Query integration for caching</li>
                  <li>• Recharts compatibility with Shadcn UI</li>
                  <li>• Micro-component architecture</li>
                  <li>• Flexible query building and validation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPlayground() {
  return (
    <MetricsProvider>
      <DashboardContent />
    </MetricsProvider>
  );
}
