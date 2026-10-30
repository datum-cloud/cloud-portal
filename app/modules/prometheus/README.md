# Prometheus

Shared types, validation and formatting for Prometheus query results. This module doesn't make HTTP requests: the portal reads metrics through telemetry queryapi with the o11y-metrics service (`app/resources/o11y-metrics`), and `app/modules/metrics` turns the responses into charts and cards with the helpers here.

## Exports

- **Types**: the Prometheus response envelope (`PrometheusResponse`, `PrometheusQueryResult`, `PrometheusMetric`), query options (`PrometheusQueryOptions`, `TimeRange`) and the formatted shapes the UI renders (`FormattedMetricData`, `ChartSeries`, `MetricCardData`, `MetricFormat`).
- **Errors**: `PrometheusError` (with a `type` of `network`, `query`, `timeout` or `unknown`, and the HTTP status), `QueryValidationError` and `ChartDataError`.
- **Validation**: `validateQueryOptions` checks a query, time range and step with Zod. `timeRangeToUnix` and `parseDuration` convert time ranges and duration strings (`15s`, `5m`) to seconds.
- **Formatting**: `formatForChart` and `formatForCard` turn a Prometheus response into series or a single value. `formatValue` formats a number for display, and `transformForRecharts` reshapes series for Recharts.

## Usage

```typescript
import { formatForChart, timeRangeToUnix, validateQueryOptions } from '@/modules/prometheus';

const options = validateQueryOptions({ query, timeRange, step: '1m' });
const range = timeRangeToUnix(options.timeRange!);
const response = await o11yMetricsService.queryRange({ projectId, query, ...range, step: '60s' });
const chartData = formatForChart(response.data, range);
```

In practice, use the hooks and components in `app/modules/metrics` rather than calling these directly. `executePrometheusRequest` (`app/modules/metrics/utils/prometheus-request.ts`) is the one place that combines them.

## Files

- `types.ts`: type definitions
- `errors.ts`: error classes
- `validator.ts`: Zod schemas and time helpers
- `formatter.ts`: response formatting
