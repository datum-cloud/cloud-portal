/**
 * Dashboard Playground - Prometheus Module Demo
 * Showcases various chart types and metric cards using the Prometheus module
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MetricCards } from '@/modules/metrics/components/MetricCard';
import { MetricChart } from '@/modules/metrics/components/MetricChart';
import type { TimeRange } from '@/modules/prometheus';
import {
  Calendar,
  Clock,
  RefreshCw,
  Activity,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';

export default function DashboardPlayground() {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date(),
  });

  const [step, setStep] = useState('1m');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isRealtime, setIsRealtime] = useState(true);

  const handleRefreshTimeRange = () => {
    setTimeRange({
      start: new Date(Date.now() - 3600000),
      end: new Date(),
    });
  };

  const timeRangeOptions = [
    { label: '15m', value: 15 * 60 * 1000 },
    { label: '1h', value: 60 * 60 * 1000 },
    { label: '6h', value: 6 * 60 * 60 * 1000 },
    { label: '24h', value: 24 * 60 * 60 * 1000 },
    { label: '7d', value: 7 * 24 * 60 * 60 * 1000 },
  ];

  const stepOptions = [
    { label: '15s', value: '15s' },
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
  ];

  const refreshIntervalOptions = [
    { label: '15s', value: 15000 },
    { label: '30s', value: 30000 },
    { label: '1m', value: 60000 },
    { label: '5m', value: 300000 },
    { label: 'Off', value: 0 },
  ];

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
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Dashboard Controls
            </CardTitle>
            <CardDescription>
              Configure time range, intervals, and refresh settings for all charts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Time Range:</span>
                <div className="flex gap-1">
                  {timeRangeOptions.map((option) => (
                    <Button
                      key={option.label}
                      variant={
                        timeRange.end.getTime() - timeRange.start.getTime() === option.value
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        setTimeRange({
                          start: new Date(now.getTime() - option.value),
                          end: now,
                        });
                      }}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Step Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Step:</span>
                <div className="flex gap-1">
                  {stepOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={step === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStep(option.value)}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Refresh Controls */}
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${isRealtime ? 'animate-spin' : 'text-gray-500'}`} />
                <span className="text-sm font-medium">Refresh:</span>
                <div className="flex gap-1">
                  {refreshIntervalOptions.map((option) => (
                    <Button
                      key={option.label}
                      variant={refreshInterval === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (option.value === 0) {
                          setIsRealtime(false);
                        } else {
                          setIsRealtime(true);
                          setRefreshInterval(option.value);
                        }
                      }}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleRefreshTimeRange}>
                Refresh Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <MetricCards.CpuUsage
            icon={Cpu}
            timeRange={timeRange}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />
          <MetricCards.MemoryUsage
            icon={HardDrive}
            timeRange={timeRange}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />
          <MetricCards.RequestRate
            icon={Network}
            timeRange={timeRange}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />
          <MetricCards.ErrorRate
            icon={AlertTriangle}
            timeRange={timeRange}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />
          <MetricCards.ResponseTimeP95
            icon={Clock}
            timeRange={timeRange}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* CPU Usage */}
          <MetricChart
            title="CPU Usage by Instance (5m Rate)"
            query="sum by (instance) (rate(node_cpu_seconds_total{mode!='idle'}[5m]))"
            timeRange={timeRange}
            step={step}
            chartType="area"
            valueFormat="percentage"
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />

          {/* Memory Usage */}
          <MetricChart
            title="Memory Usage by Instance"
            query="(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes"
            timeRange={timeRange}
            step={step}
            chartType="area"
            valueFormat="percentage"
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />

          {/* Network Traffic */}
          <MetricChart
            title="Network Traffic (Received)"
            query="rate(node_network_receive_bytes_total[5m])"
            timeRange={timeRange}
            step={step}
            chartType="line"
            valueFormat="bytes"
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />

          {/* Disk I/O */}
          <MetricChart
            title="Disk I/O (Read)"
            query="rate(node_disk_read_bytes_total[5m])"
            timeRange={timeRange}
            step={step}
            chartType="bar"
            valueFormat="bytes"
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />

          {/* Gauge Chart */}
          {/* <MetricChart
            query="prometheus_tsdb_head_series"
            title="Active Time Series"
            description="Total number of active time series in the TSDB"
            chartType="gauge"
            height={300}
            timeRange={timeRange}
            step={step}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          /> */}

          {/* Area Chart */}
          {/* <MetricChart
            query="rate(prometheus_tsdb_wal_writes_failed_total[5m])"
            title="WAL Write Failures"
            description="Rate of failed writes to the WAL"
            chartType="area"
            height={300}
            timeRange={timeRange}
            step={step}
            valueFormat="rate"
            refetchInterval={isRealtime ? refreshInterval : undefined}
          /> */}

          {/* Line Chart */}
          {/* <MetricChart
            query="go_goroutines"
            title="Go Goroutines"
            description="Number of active goroutines"
            chartType="line"
            height={300}
            timeRange={timeRange}
            step={step}
            showLegend={true}
            showTooltip={true}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          /> */}

          {/* Another Area Chart */}
          {/* <MetricChart
            query="rate(node_network_transmit_bytes_total[1m])"
            title="Network Transmit Rate"
            description="Rate of bytes transmitted over the network"
            chartType="area"
            height={300}
            timeRange={timeRange}
            step={step}
            valueFormat="bytes"
            refetchInterval={isRealtime ? refreshInterval : undefined}
          /> */}

          {/* Bar Chart */}
          {/* <MetricChart
            query="prometheus_notifications_total"
            title="Notifications Total"
            description="Total notifications sent"
            chartType="bar"
            height={300}
            timeRange={timeRange}
            step={step}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          /> */}

          {/* Multi-series Line Chart */}
          {/* <MetricChart
            query="rate(prometheus_http_requests_total[5m]) by (handler)"
            title="Request Rate by Handler"
            description="HTTP requests grouped by handler"
            chartType="line"
            height={300}
            timeRange={timeRange}
            step={step}
            showLegend={true}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          /> */}

          {/* Domain Verification Chart */}
          <MetricChart
            query="avg(datum_cloud_networking_domain_status_next_verification_attempt{})"
            title="Domain Verification Status"
            description="Average next verification attempt timestamp for domain status"
            chartType="line"
            height={300}
            step="1h"
            timeRange={timeRange}
            showLegend={true}
            showTooltip={true}
            refetchInterval={isRealtime ? refreshInterval : undefined}
          />
        </div>

        {/* Large Chart Section */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Detailed Metrics View</CardTitle>
            <CardDescription>Comprehensive view of Prometheus internal metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricChart
              query="rate(prometheus_tsdb_head_samples_appended_total[5m])"
              title="Sample Ingestion Rate"
              description="Rate of samples being ingested into TSDB"
              chartType="area"
              height={400}
              timeRange={timeRange}
  
              showLegend={true}
              showTooltip={true}
              valueFormat="rate"
              refetchInterval={isRealtime ? refreshInterval : undefined}
            />
          </CardContent>
        </Card> */}

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
