/**
 * Dashboard Playground - Enhanced Metrics Module Demo
 * Showcases the new MetricsToolbar with CoreControls and dynamic Filters
 */
import { DateTime } from '@/components/date-time';
import {
  MetricCard,
  MetricChart,
  MetricsProvider,
  MetricsToolbar,
  MetricsFilter,
  type QueryBuilderFunction,
} from '@/modules/metrics';
import { Badge } from '@datum-ui/components';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { ChartTooltipContent } from '@shadcn/ui/chart';
import { Activity, Server, Globe, Database } from 'lucide-react';
import { useCallback } from 'react';

const MetricsContent = () => {
  // Sample filter options
  const regionOptions = [
    { label: 'US East 1', value: 'us-east-1', icon: <Globe className="h-4 w-4" /> },
    { label: 'US West 2', value: 'us-west-2', icon: <Globe className="h-4 w-4" /> },
    { label: 'EU West 1', value: 'eu-west-1', icon: <Globe className="h-4 w-4" /> },
  ];

  const environmentOptions = [
    { label: 'Production', value: 'prod', icon: <Server className="h-4 w-4" /> },
    { label: 'Staging', value: 'staging', icon: <Database className="h-4 w-4" /> },
    { label: 'Development', value: 'dev', icon: <Database className="h-4 w-4" /> },
  ];

  // Query builder functions
  const domainVerificationQuery: QueryBuilderFunction = useCallback(({ filters }) => {
    let query = 'avg(datum_cloud_networking_domain_status_next_verification_attempt{})';
    if (filters.region) {
      query = `avg(datum_cloud_networking_domain_status_next_verification_attempt{region="${filters.region}"})`;
    }
    return query;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enhanced Dashboard</h1>
            <p className="mt-1 text-gray-600">New MetricsToolbar with Dynamic Filters Demo</p>
          </div>
          <Badge type="secondary" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Enhanced Demo
          </Badge>
        </div>

        {/* Enhanced Toolbar with Filters */}
        <MetricsToolbar variant="card">
          <MetricsToolbar.Filters>
            <MetricsFilter.Select
              filterKey="region"
              label="Region"
              options={regionOptions}
              placeholder="Select region..."
            />
            <MetricsFilter.Radio
              filterKey="environment"
              label="Environment"
              options={environmentOptions}
              orientation="horizontal"
            />
            <MetricsFilter.Search
              filterKey="service"
              label="Service"
              placeholder="Search services..."
            />
          </MetricsToolbar.Filters>
          <MetricsToolbar.CoreControls />
        </MetricsToolbar>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Basic MetricCard with default controls */}
          <MetricCard
            title="Vector Concurrency Limit"
            query="sum(rate(vector_adaptive_concurrency_limit_sum{}[$__rate_interval]))/sum(rate(vector_adaptive_concurrency_limit_count{}[$__rate_interval]))"
            metricFormat="number"
            showTrend={false}
            icon={Server}
          />

          {/* MetricCard with dynamic query builder and custom API params */}
          <MetricCard
            title="Domain Verification Attempt"
            query={domainVerificationQuery}
            metricFormat="number"
            showTrend={true}
            icon={Database}
            customApiParams={{
              resolution: 'high',
              caching: 'enabled',
              includeMetadata: true,
            }}
          />

          {/* MetricChart with query builder function */}
          <MetricChart
            query={domainVerificationQuery}
            title="Domain Verification (Filtered by Region)"
            chartType="line"
            valueFormat="short-number"
            showLegend={false}
            showTooltip={true}
            customApiParams={(context) => ({
              resolution: context.get('environment') === 'prod' ? 'high' : 'medium',
              limit: 1000,
              aggregation: 'avg',
            })}
          />

          {/* MetricChart with advanced features */}
          <MetricChart
            query={({ filters }) => {
              let baseQuery =
                'sum(rate(envoy_vhost_vcluster_upstream_rq{resourcemanager_datumapis_com_project_name="jreese-test-5d2p7z", label_topology_kubernetes_io_region!=""}[1m])) by (label_topology_kubernetes_io_region)';
              if (filters.region) {
                baseQuery = `sum(rate(envoy_vhost_vcluster_upstream_rq{resourcemanager_datumapis_com_project_name="jreese-test-5d2p7z", label_topology_kubernetes_io_region="${filters.region}"}[1m])) by (label_topology_kubernetes_io_region)`;
              }
              return baseQuery;
            }}
            title="Regional Upstream RPS (Dynamic)"
            chartType="line"
            showLegend={true}
            showTooltip={true}
            yAxisFormatter={(value) => `${value.toFixed(3)} req/s`}
            yAxisOptions={{ width: 80 }}
            customApiParams={{
              format: 'prometheus',
              refreshRate: 'realtime',
            }}
            tooltipContent={({ active, payload, label, ...props }) => {
              if (active && payload && payload.length) {
                const filteredPayload = payload.filter((p) => p.value > 0);
                if (filteredPayload.length === 0) return null;

                return (
                  <ChartTooltipContent
                    active={active}
                    payload={filteredPayload}
                    label={label}
                    labelFormatter={(value) => <DateTime date={value} />}
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
              This dashboard demonstrates the enhanced Metrics module with unified URL state
              management, dynamic query building, and custom API parameters. All components
              automatically sync their state with URL parameters and support flexible configuration.
            </p>

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-semibold">New Features Demonstrated:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• URL state synchronization with filterKey props</li>
                  <li>• Dynamic query building with filter context</li>
                  <li>• Custom API parameters (object & function)</li>
                  <li>• Self-registering controls and filters</li>
                  <li>• Enhanced query builder context</li>
                  <li>• Centralized URL state registry</li>
                  <li>• Backward compatible legacy hooks</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Architecture Benefits:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Unified URL state management with nuqs</li>
                  <li>• Component-level self-registration</li>
                  <li>• Type-safe URL parameter parsing</li>
                  <li>• Flexible custom API parameter support</li>
                  <li>• Enhanced query builder utilities</li>
                  <li>• Clean separation of concerns</li>
                  <li>• Composable and reusable components</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function MetricsPlayground() {
  return (
    <MetricsProvider>
      <MetricsContent />
    </MetricsProvider>
  );
}
