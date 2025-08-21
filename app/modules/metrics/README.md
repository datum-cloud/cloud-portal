# MetricsPanel Module

A modern, flexible, and reusable metrics dashboard system with dynamic filter state management and auto-integrated charts.

## 🚀 Quick Start

```tsx
import { MetricsPanel } from '@/modules/metrics';

function Dashboard() {
  return (
    <MetricsPanel onFiltersChange={(filters) => console.log(filters)}>
      <MetricsPanel.Controls>
        <MetricsPanel.TimeRange />
        <MetricsPanel.Step />
        <MetricsPanel.Refresh />
      </MetricsPanel.Controls>

      <MetricsPanel.Chart query="cpu_usage" title="CPU Usage" />
    </MetricsPanel>
  );
}
```

## ✨ Key Features

- **🧩 Compound Component Pattern** - Clean, intuitive API with subcomponents
- **🔄 Dynamic Filter State** - Flexible filter system supporting custom controls
- **🔗 Auto-Integration** - Charts automatically consume filter state
- **📊 URL Persistence** - All filter state persists in URL using nuqs
- **⚡ Performance Optimized** - Throttled updates and efficient re-renders
- **🎨 Flexible Layouts** - Multiple control variants and grid systems
- **🔧 Extensible** - Easy to add custom controls and queries
- **📱 Responsive** - Works on all screen sizes

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

#### MetricChart Callbacks

The `MetricChart` component provides several callback props to handle data changes and query states:

```tsx
<MetricChart
  query="rate(http_requests_total[5m])"
  title="Request Rate"
  // Data callbacks
  onDataChange={(rawData, chartData) => {
    // Handle raw Prometheus data and transformed chart data
    console.log('Raw metrics:', rawData);
    console.log('Chart data for rendering:', chartData);
  }}
  onSeriesChange={(series) => {
    // Handle series changes (useful for dynamic legends or summaries)
    console.log(
      'Available series:',
      series.map((s) => s.name)
    );
    updateExternalLegend(series);
  }}
  onQueryStateChange={({ isLoading, isFetching, error }) => {
    // Handle loading states and errors
    if (error) {
      console.error('Query failed:', error);
      showErrorNotification(error.message);
    }
    setGlobalLoadingState(isLoading);
  }}
/>
```

**Callback Types:**

- **`onDataChange(rawData, chartData)`** - Fires when data changes
  - `rawData`: Raw Prometheus response data
  - `chartData`: Transformed data ready for chart rendering
- **`onSeriesChange(series)`** - Fires when series array changes
  - `series`: Array of `ChartSeries` objects with name and color
- **`onQueryStateChange(state)`** - Fires when query state changes
  - `state`: Object with `isLoading`, `isFetching`, and `error` properties

**Common Use Cases:**

```tsx
// 1. Data Aggregation
const [summary, setSummary] = useState(null);

<MetricChart
  onDataChange={(data, chartData) => {
    const total = chartData.reduce((sum, point) =>
      sum + Object.values(point)
        .filter(v => typeof v === 'number')
        .reduce((a, b) => a + b, 0), 0
    );
    setSummary({ total, dataPoints: chartData.length });
  }}
/>

// 2. Real-time Dashboard Updates
<MetricChart
  onSeriesChange={(series) => {
    // Update dashboard summary when new series appear
    updateDashboardMetrics(series);
  }}
  onQueryStateChange={({ isLoading, error }) => {
    // Show global loading indicator
    setDashboardLoading(isLoading);
    if (error) showAlert(error.message);
  }}
/>

// 3. External State Synchronization
<MetricChart
  onDataChange={(data) => {
    // Sync with external state management
    dispatch(updateMetricsData(data));
  }}
/>
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
