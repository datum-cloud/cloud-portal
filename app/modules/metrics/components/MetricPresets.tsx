import { MetricCard, type MetricCardProps } from './MetricCard';

/**
 * Preset metric cards for common use cases
 */
export const MetricPresets = {
  /**
   * CPU Usage percentage card
   */
  CpuUsage: (props: Omit<MetricCardProps, 'query' | 'metricFormat' | 'title'>) => (
    <MetricCard
      {...props}
      query="(1 - avg(rate(node_cpu_seconds_total{mode='idle'}[5m]))) * 100"
      title="CPU Usage"
      metricFormat="percent"
    />
  ),

  /**
   * Memory Usage percentage card
   */
  MemoryUsage: (props: Omit<MetricCardProps, 'query' | 'metricFormat' | 'title'>) => (
    <MetricCard
      {...props}
      query="(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
      title="Memory Usage"
      metricFormat="percent"
    />
  ),

  /**
   * Request Rate card
   */
  RequestRate: (props: Omit<MetricCardProps, 'query' | 'metricFormat' | 'title' | 'suffix'>) => (
    <MetricCard
      {...props}
      query="rate(http_requests_total[5m])"
      title="Request Rate"
      metricFormat="rate"
      suffix="req/s"
    />
  ),

  /**
   * Error Rate card
   */
  ErrorRate: (props: Omit<MetricCardProps, 'query' | 'metricFormat' | 'title'>) => (
    <MetricCard
      {...props}
      query="rate(http_requests_total{status=~'5..'}[5m]) / rate(http_requests_total[5m]) * 100"
      title="Error Rate"
      metricFormat="percent"
    />
  ),

  /**
   * Response Time P95 card
   */
  ResponseTimeP95: (
    props: Omit<MetricCardProps, 'query' | 'metricFormat' | 'title' | 'suffix'>
  ) => (
    <MetricCard
      {...props}
      query="histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
      title="Response Time P95"
      metricFormat="duration"
      suffix="ms"
    />
  ),

  /**
   * Active Connections card
   */
  ActiveConnections: (props: Omit<MetricCardProps, 'query' | 'metricFormat' | 'title'>) => (
    <MetricCard
      {...props}
      query="sum(http_connections_active)"
      title="Active Connections"
      metricFormat="number"
    />
  ),
};
