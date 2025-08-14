# Metrics Integration Module

This module provides the project-specific UI components and React hooks for displaying Prometheus metrics within the Cloud Portal application. It acts as the client-side consumer for the backend-for-frontend (BFF) API route located at `/api/prometheus`.

## Purpose

This module's primary responsibility is to separate the application-specific integration logic from the core, reusable Prometheus library (`/app/modules/prometheus`). It should not contain any direct calls to the Prometheus server. Instead, all data fetching is handled through hooks that query our internal API.

This approach provides several benefits:

- **Security**: The Prometheus endpoint is not exposed to the client.
- **Centralization**: Query logic and authentication are managed in one place (the API route).
- **Reusability**: The core `prometheus` library remains generic and can be used in other projects.

## Usage

This module exports React hooks and components designed to work with the `/api/prometheus` endpoint.

### Hooks

The hooks provide a simple way to fetch formatted data for use in UI components.

#### `usePrometheusChart`

Fetches time-series data suitable for rendering charts.

```tsx
import { usePrometheusChart } from '@/modules/metrics/hooks';

function MyChartComponent() {
  const { data, isLoading, error } = usePrometheusChart({
    query: 'rate(http_requests_total[5m])',
    timeRange: {
      start: new Date(Date.now() - 3600 * 1000),
      end: new Date(),
    },
    step: '1m',
  });

  if (isLoading) return <p>Loading chart...</p>;
  if (error) return <p>Error: {error.message}</p>;

  // Render a chart with `data`
}
```

#### `usePrometheusCard`

Fetches a single aggregated value suitable for a metric card.

```tsx
import { usePrometheusCard } from '@/modules/metrics/hooks';

function MyCardComponent() {
  const { data, isLoading, error } = usePrometheusCard({
    query: 'avg(cpu_usage_percent)',
    metricFormat: 'percentage',
  });

  if (isLoading) return <p>Loading value...</p>;
  if (error) return <p>Error: {error.message}</p>;

  // Display the `data.value`
}
```

### Components

The components are pre-built UI elements that use these hooks internally.

#### `MetricChart`

A full-featured chart component that handles its own data fetching.

```tsx
import { MetricChart } from '@/modules/metrics/components';

function Dashboard() {
  return (
    <MetricChart
      title="CPU Usage Over Time"
      query="rate(cpu_usage_total[5m])"
      timeRange={{
        start: new Date(Date.now() - 3600 * 1000),
        end: new Date(),
      }}
      step="1m"
      chartType="area"
    />
  );
}
```

#### `MetricCard`

A single-stat card component.

```tsx
import { MetricCard } from '@/modules/metrics/components';

function Dashboard() {
  return (
    <MetricCard title="Average CPU Load" query="avg(cpu_usage_percent)" metricFormat="percentage" />
  );
}
```

## Relationship to Core Library

This module depends on the core `/app/modules/prometheus` library for shared types, formatters, and validation logic. It does **not** use the `prometheusService` or `usePrometheusQuery` hook directly, as all communication is proxied through the API route.
