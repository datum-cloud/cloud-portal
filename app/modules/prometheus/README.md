# Prometheus Core Library

A standalone, comprehensive, and flexible Prometheus/Victoria Metrics client library for TypeScript applications. It provides a robust foundation for querying Prometheus, with built-in validation, data formatting, and a powerful query builder.

This library is designed to be used directly in backend services or as the core for building higher-level integrations, such as React component libraries.

## Features

- **Standalone & General Purpose**: Works with any Prometheus-compatible endpoint. Not tied to any specific application or framework.
- **Flexible Query Builder**: Supports both a fluent PromQL builder and raw query strings.
- **Type Safety**: Complete TypeScript coverage with Zod-based validation for query parameters and configurations.
- **Resilient Client**: Built-in retry logic and structured error handling.
- **Data Formatting**: Utilities to transform raw Prometheus data into structured formats for charts and cards.
- **Query Templates**: Pre-built templates for common metric patterns (e.g., CPU, memory, request rates).
- **Core React Hook**: Includes a basic `usePrometheusQuery` hook (using TanStack Query) for direct client-side usage if needed, though a BFF approach is recommended for production apps.

## Installation

Ensure you have the required peer dependencies:

```bash
npm install zod axios @tanstack/react-query
```

## Environment Setup

For direct use, the library relies on an environment variable to locate your Prometheus instance.

```bash
PROMETHEUS_URL=https://your-prometheus-instance.com
```

---

## Usage Patterns

This library can be used in two primary ways:

1. **Directly (Server-Side)**: Ideal for backend services, scripts, or server-side rendering (SSR) logic.
2. **Indirectly (Client-Side via BFF)**: The recommended approach for web applications, where a dedicated API route acts as a proxy to Prometheus.

### 1. Direct Library Usage (Server-Side)

Use the `prometheusService` singleton for direct access to the Prometheus API.

#### Querying for Charts

```typescript
import { prometheusService } from '@/modules/prometheus';

const chartData = await prometheusService.queryForChart({
  query: 'rate(http_requests_total[5m])',
  timeRange: {
    start: new Date(Date.now() - 3600 * 1000),
    end: new Date(),
  },
  step: '1m',
});
```

#### Querying for Cards

```typescript
import { prometheusService } from '@/modules/prometheus';

const cardData = await prometheusService.queryForCard({
  query: 'avg(cpu_usage_percent)',
  format: 'percentage',
});
```

#### Using the Query Builder

```typescript
import { PrometheusQueryBuilder } from '@/modules/prometheus';

const query = new PrometheusQueryBuilder()
  .metric('http_requests_total')
  .rate('5m')
  .sumBy(['path', 'status_code'])
  .build(); // "sum(rate(http_requests_total[5m])) by (path, status_code)"

const result = await prometheusService.queryInstant({ query });
```

### 2. React Integration via BFF (Client-Side)

For security and centralization, it's best to proxy Prometheus requests through a backend-for-frontend (BFF) API route. This core library provides the foundation for your BFF, and a separate integration module (like `/app/modules/metrics`) consumes it.

#### Step 1: Create the API Route (e.g., `/app/routes/api/prometheus.ts`)

This route uses `prometheusService` to securely query the backend and exposes the results to the client.

```typescript
// Example API Route
import { prometheusService } from '@/modules/prometheus';

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();

  // Add validation and logic based on body.type
  switch (body.type) {
    case 'chart':
      return await prometheusService.queryForChart(body);
    case 'card':
      return await prometheusService.queryForCard(body);
    // ... other cases
  }
}
```

#### Step 2: Create a Client-Side Integration Module (e.g., `/app/modules/metrics`)

This module contains React hooks and components that fetch data from your API route.

**Example Hook (`/app/modules/metrics/hooks/usePrometheusAPI.ts`):**

```typescript
import { useQuery } from '@tanstack/react-query';

// This hook fetches from YOUR /api/prometheus route
export function usePrometheusChart(options) {
  return useQuery({
    queryKey: ['prometheus', 'chart', options],
    queryFn: () =>
      fetch('/api/prometheus', {
        method: 'POST',
        body: JSON.stringify({ type: 'chart', ...options }),
      }).then((res) => res.json()),
  });
}
```

**Example Component (`/app/modules/metrics/components/MetricChart.tsx`):**

```tsx
import { usePrometheusChart } from '../hooks/usePrometheusAPI';

// Note the import path

export function MetricChart({ query, timeRange }) {
  const { data, isLoading } = usePrometheusChart({ query, timeRange });

  if (isLoading) return <p>Loading...</p>;

  // Render chart with data
  return <RechartsComponent data={data.series} />;
}
```

## In-Depth Usage Examples

This section provides more detailed examples for the core functionalities of the library.

### Using `prometheusService`

The `prometheusService` is the workhorse for direct, server-side interactions.

#### Example: Checking the status of multiple jobs

```typescript
import { prometheusService } from '@/modules/prometheus';

async function checkJobStatuses() {
  try {
    const { data } = await prometheusService.queryInstant({
      query: 'up{job=~"node-exporter|prometheus"}',
    });

    if (data.resultType === 'vector') {
      data.result.forEach((metric) => {
        console.log(
          `Job: ${metric.metric.job}, Status: ${metric.value[1] === '1' ? 'Up' : 'Down'}`
        );
      });
    }
  } catch (error) {
    console.error('Failed to fetch job statuses:', error);
  }
}
```

### Using `usePrometheusQuery`

The core hook is powerful when you need direct client-side querying (e.g., for an admin dashboard without a BFF).

#### Example: A real-time updating query with error handling

```tsx
import { usePrometheusQuery } from '@/modules/prometheus';

function RealtimeRequestRate() {
  const { data, isLoading, error, isError } = usePrometheusQuery({
    query: 'rate(http_requests_total[1m])',
    refetchInterval: 5000, // Refresh every 5 seconds
    queryKey: ['realtime-requests'], // Custom query key
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  // Assuming vector result, render the value
  const rate = data?.result?.[0]?.value?.[1] || 'N/A';

  return <div>Current request rate: {parseFloat(rate).toFixed(2)} req/s</div>;
}
```

### Using `CommonTemplates`

Templates streamline the creation of complex but common queries.

#### Example: Creating a reusable query for p95 latency by path

```typescript
import { CommonTemplates, PrometheusQueryBuilder } from '@/modules/prometheus';

function getLatencyQueryForPath(path: string) {
  const latencyTemplate = CommonTemplates.latencyPercentile(
    0.95, // p95
    'http_request_duration_seconds_bucket', // Histogram bucket metric
    '5m' // 5-minute window
  );

  // The template returns a raw query string, which we can enhance
  const finalQuery = new PrometheusQueryBuilder(latencyTemplate)
    .filter({ path }) // Add a filter for the specific path
    .build();

  return finalQuery;
}

// Usage:
const userApiLatencyQuery = getLatencyQueryForPath('/api/users');
// Result: "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{path=\"/api/users\"}[5m])) by (le))"
```

---

## Core API Reference

Key exports from this standalone library:

- `prometheusService`: Singleton service for all query operations.
- `PrometheusService`: Class for creating custom service instances.
- `PrometheusQueryBuilder`: Fluent API for building PromQL queries.
- `usePrometheusQuery`: Core TanStack Query hook for direct client-side queries.
- `validateQueryOptions`, `validateTimeRange`, etc.: Zod-based validation functions.
- `formatForChart`, `formatForCard`, `formatValue`: Data formatting utilities.
- `PrometheusError`: Custom error class for structured error handling.
- `CommonTemplates`: Pre-built query templates for common metrics.

## Architecture

The module follows a clean, modular architecture focused on core logic:

- **`types.ts`**: TypeScript definitions.
- **`errors.ts`**: Custom error classes.
- **`validator.ts`**: Zod validation schemas.
- **`client.ts`**: Low-level HTTP client with retry logic.
- **`query-builder.ts`**: PromQL construction utilities.
- **`formatter.ts`**: Data transformation logic.
- **`templates/`**: Pre-built query patterns.
- **`hooks/`**: Contains the core `usePrometheusQuery` hook.
- **`service.ts`**: Main service orchestrating all operations.

This design ensures high cohesion and low coupling, making the library easy to maintain, test, and extend.

## Contributing

When adding new features:

1. Follow the established TypeScript patterns.
2. Add comprehensive JSDoc documentation.
3. Include proper error handling and validation.
4. Update this README with relevant examples.
