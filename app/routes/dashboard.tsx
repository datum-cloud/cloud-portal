/**
 * Dashboard Playground - MetricsPanel Demo
 * Showcases the new MetricsPanel system with various chart types and metric cards
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricsPanel } from '@/modules/metrics';
import { Activity } from 'lucide-react';

export default function DashboardPlayground() {
  const handleFiltersChange = (filters: any) => {
    console.log('Dashboard filters changed:', filters);
    // Here you would typically make API calls with the filter values
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Playground</h1>
            <p className="mt-1 text-gray-600">MetricsPanel Demo - Modern Metrics Dashboard</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Demo
          </Badge>
        </div>

        <MetricsPanel onFiltersChange={handleFiltersChange}>
          {/* Controls Section */}
          <MetricsPanel.Section
            title="Dashboard Controls"
            description="Configure time range and refresh settings">
            <MetricsPanel.Controls variant="card" showHeader>
              <MetricsPanel.TimeRange />
              <MetricsPanel.Step />
              <MetricsPanel.Refresh />
            </MetricsPanel.Controls>
          </MetricsPanel.Section>

          {/* Metrics Grid */}
          <MetricsPanel.Section title="System Metrics" description="Key performance indicators">
            <MetricsPanel.Grid cols={2}>
              <MetricsPanel.Card
                title="Domain Verification Attempt"
                query="avg(datum_cloud_networking_domain_status_next_verification_attempt{})"
                metricFormat="number"
              />

              <MetricsPanel.Chart
                query="sum(rate(vector_adaptive_concurrency_limit_sum{}[$__rate_interval]))/sum(rate(vector_adaptive_concurrency_limit_count{}[$__rate_interval]))"
                title="Vector Adaptive Concurrency Limit"
                description="Average concurrency limit over time"
                chartType="line"
              />

              <MetricsPanel.Chart
                query="avg(datum_cloud_networking_domain_status_next_verification_attempt{})"
                title="Domain Status Verification"
                description="Next verification attempt timing"
                chartType="area"
              />

              <MetricsPanel.Chart
                query={`sum(rate(envoy_vhost_vcluster_upstream_rq{resourcemanager_datumapis_com_project_name="jreese-test-5d2p7z", label_topology_kubernetes_io_region!=""}[1m])) by (label_topology_kubernetes_io_region)`}
                title="Regional Upstream RPS"
                description="Request rate by region"
                chartType="line"
              />
            </MetricsPanel.Grid>
          </MetricsPanel.Section>

          {/* Demo Information */}
          <Card>
            <CardHeader>
              <CardTitle>About This Demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                This dashboard demonstrates the new MetricsPanel system with compound components,
                dynamic filter state management, and auto-integrated charts. All components
                automatically consume filter state from the URL.
              </p>

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-semibold">New Features:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Compound component pattern</li>
                    <li>• Dynamic filter state management</li>
                    <li>• Auto-integrated charts and cards</li>
                    <li>• URL state persistence</li>
                    <li>• Flexible layouts and variants</li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Architecture Benefits:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Clean, maintainable code</li>
                    <li>• Easy extensibility</li>
                    <li>• Type-safe throughout</li>
                    <li>• Performance optimized</li>
                    <li>• Modern React patterns</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </MetricsPanel>
      </div>
    </div>
  );
}
