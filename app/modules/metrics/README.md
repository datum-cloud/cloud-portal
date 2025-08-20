# Metrics Integration Module

This module provides the project-specific UI components and React hooks for displaying Prometheus metrics within the Cloud Portal application. It acts as the client-side consumer for the backend-for-frontend (BFF) API route located at `/api/prometheus`.

## Purpose

This module's primary responsibility is to separate the application-specific integration logic from the core, reusable Prometheus library (`/app/modules/prometheus`). It should not contain any direct calls to the Prometheus server. Instead, all data fetching is handled through hooks that query our internal API.

This approach provides several benefits:

- **Security**: The Prometheus endpoint is not exposed to the client.
- **Centralization**: Query logic and authentication are managed in one place (the API route).
- **Reusability**: The core `prometheus` library remains generic and can be used in other projects.

## Usage

Prefer imports from the top-level barrel `@/modules/metrics`. All data access goes through the `/api/prometheus` route (BFF), not directly to Prometheus.

### Quick start

```tsx
import {
  MetricsProvider,
  MetricsControls,
  MetricChart,
  MetricCard,
  useMetrics,
} from '@/modules/metrics';
import React from 'react';

export default function MetricsDashboard(): React.ReactElement {
  return (
    <MetricsProvider>
      <div className="space-y-4">
        <ControlsAndCharts />
      </div>
    </MetricsProvider>
  );
}

function ControlsAndCharts(): React.ReactElement {
  const { timeRange, step } = useMetrics();
  return (
    <>
      <MetricsControls />
      <MetricChart
        title="CPU Usage Over Time"
        query="rate(cpu_usage_total[5m])"
        timeRange={timeRange}
        step={step}
        chartType="area"
        height={300}
      />
      <MetricCard
        title="Average CPU Load"
        query="avg(cpu_usage_percent)"
        metricFormat="percentage"
      />
    </>
  );
}
```

### Hooks

The hooks provide a simple way to fetch formatted data for use in UI components.

#### `usePrometheusChart`

```tsx
import { usePrometheusChart } from '@/modules/metrics';

export function MyChartComponent(): React.ReactElement {
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
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

#### `usePrometheusCard`

```tsx
import { usePrometheusCard } from '@/modules/metrics';

export function MyCardComponent(): React.ReactElement {
  const { data, isLoading, error } = usePrometheusCard({
    query: 'avg(cpu_usage_percent)',
    metricFormat: 'percentage',
  });

  if (isLoading) return <p>Loading value...</p>;
  if (error) return <p>Error: {error.message}</p>;
  return <div>{data?.value}</div>;
}
```

### Components

Pre-built UI elements that use the hooks internally. Import from `@/modules/metrics`.

- `MetricChart`
- `MetricCard`
- `MetricsControls` (groups TimeRange/Step/Refresh)

```tsx
import { MetricChart, MetricCard, MetricsControls } from '@/modules/metrics';
```

## Folder structure

```text
app/modules/metrics/
├─ README.md
├─ index.ts                 # Barrel exports (constants, utils, components, controls, context, hooks)
├─ constants.ts             # REFRESH_OPTIONS, STEP_OPTIONS, PRESET_RANGES and types
├─ utils.ts                 # parseDurationToMs, parseRange
├─ components/
│  ├─ index.ts
│  ├─ BaseMetric.tsx
│  ├─ MetricCard.tsx
│  ├─ MetricChart.tsx
│  ├─ MetricPresets.tsx
│  ├─ controls/
│  │  ├─ index.ts
│  │  ├─ MetricsControls.tsx
│  │  ├─ RefreshControl.tsx
│  │  ├─ StepControl.tsx
│  │  └─ TimeRangeControl.tsx
│  └─ series/
│     ├─ index.ts
│     ├─ AreaSeries.tsx
│     ├─ BarSeries.tsx
│     └─ LineSeries.tsx
├─ context/
│  ├─ index.ts
│  ├─ metrics-context.ts
│  ├─ metrics-provider.tsx
│  └─ use-metrics.ts
└─ hooks/
   ├─ index.ts
   └─ use-prometheus-api.ts
```

## Relationship to Core Library

This module depends on the core `/app/modules/prometheus` library for shared types, formatters, and validation logic. It does **not** use the `prometheusService` or `usePrometheusQuery` hook directly, as all communication is proxied through the API route.
