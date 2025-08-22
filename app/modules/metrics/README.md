# Metrics Integration Module

A comprehensive TypeScript-first module for Prometheus metrics visualization with dynamic filtering, URL state management, and flexible controls.

## 🚀 Key Features

- **Dynamic Filtering**: Add region, environment, service filters with URL synchronization
- **Flexible Query Building**: Support for both static strings and dynamic query builder functions
- **Unified State Management**: Single MetricsProvider manages core controls + custom filters
- **Compound Components**: Clean API with MetricsToolbar and MetricsFilter namespaces
- **URL State Synchronization**: Automatic bidirectional sync between UI state and URL parameters
- **Enhanced TypeScript**: Full type safety for filters, query builders, and API parameters
- **Custom API Parameters**: Support for both object and function-based API parameter customization

## Architecture Benefits

- **TypeScript-first**: Complete type safety with interfaces and validation
- **TanStack Query Integration**: Built-in caching, background updates, and error handling
- **Recharts Compatibility**: Works seamlessly with Shadcn UI Chart components
- **Micro-component Architecture**: Small, focused components that can be composed together
- **Real-time Updates**: Configurable auto-refresh intervals with manual refresh support
- **Error Handling**: Comprehensive error states and recovery mechanisms
- **Performance Optimized**: Efficient re-renders, query caching, and memoized computations
- **URL State Management**: Built on nuqs for robust URL parameter handling
- **Self-Registering Components**: Filters automatically register with the URL state registry

## Quick Start

### Basic Usage

```tsx
import { MetricsProvider, MetricCard, MetricChart, MetricsToolbar } from '@/modules/metrics';

function Dashboard() {
  return (
    <MetricsProvider>
      <MetricsToolbar>
        <MetricsToolbar.CoreControls />
      </MetricsToolbar>

      <MetricCard
        title="Active Users"
        query="prometheus_notifications_total"
        metricFormat="number"
      />

      <MetricChart title="Request Rate" query="rate(http_requests_total[5m])" chartType="line" />
    </MetricsProvider>
  );
}
```

### Advanced Usage with Dynamic Filters and Custom API Parameters

```tsx
import {
  MetricsProvider,
  MetricsToolbar,
  MetricsFilter,
  MetricCard,
  MetricChart,
  type QueryBuilderFunction,
} from '@/modules/metrics';
import { Server, Globe } from 'lucide-react';

function AdvancedDashboard() {
  const regionOptions = [
    { label: 'US East 1', value: 'us-east-1', icon: <Globe className="h-4 w-4" /> },
    { label: 'US West 2', value: 'us-west-2', icon: <Globe className="h-4 w-4" /> },
    { label: 'EU West 1', value: 'eu-west-1', icon: <Globe className="h-4 w-4" /> },
  ];

  const environmentOptions = [
    { label: 'Production', value: 'prod', icon: <Server className="h-4 w-4" /> },
    { label: 'Staging', value: 'staging', icon: <Server className="h-4 w-4" /> },
  ];

  // Dynamic query that uses filter values
  const dynamicQuery: QueryBuilderFunction = ({ filters }) => {
    let query = 'http_requests_total';
    if (filters.region || filters.environment) {
      const labels = [];
      if (filters.region) labels.push(`region="${filters.region}"`);
      if (filters.environment) labels.push(`env="${filters.environment}"`);
      query += `{${labels.join(', ')}}`;
    }
    return query;
  };

  return (
    <MetricsProvider>
      <MetricsToolbar variant="card">
        <MetricsToolbar.Filters>
          <MetricsFilter.Select
            filterKey="region"
            label="Region"
            options={regionOptions}
            placeholder="Select region..."
            searchable
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

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="Regional Requests"
          query={dynamicQuery}
          metricFormat="number"
          showTrend
          customApiParams={{
            resolution: 'high',
            caching: 'enabled',
          }}
        />

        <MetricChart
          title="Request Rate by Region"
          query={dynamicQuery}
          chartType="area"
          customApiParams={(context) => ({
            resolution: context.get('environment') === 'prod' ? 'high' : 'medium',
            limit: 1000,
          })}
        />
      </div>
    </MetricsProvider>
  );
}
```

## Architecture Overview

This module provides application-specific integration logic built on top of the core Prometheus library (`/app/modules/prometheus`). All data fetching is handled through hooks that query our internal `/api/prometheus` endpoint, never directly accessing Prometheus servers.

**Key Design Principles:**

- **Security**: Prometheus endpoints are not exposed to the client
- **Centralization**: Query logic and authentication are managed in the API route
- **Reusability**: The core `prometheus` library remains generic and reusable
- **URL State Management**: All filter and control state is synchronized with URL parameters
- **Component Self-Registration**: Filters automatically register themselves with the URL state registry
- **Type Safety**: Complete TypeScript coverage for all APIs and components

## API Reference

### Core Components

#### `MetricsProvider`

Root provider that manages URL state and provides context to all child components.

```tsx
<MetricsProvider>{/* All metrics components go here */}</MetricsProvider>
```

#### `MetricsToolbar`

Compound component for organizing controls and filters.

```tsx
<MetricsToolbar variant="card">
  {' '}
  {/* or "default" */}
  <MetricsToolbar.Filters>{/* Filter components */}</MetricsToolbar.Filters>
  <MetricsToolbar.CoreControls />
</MetricsToolbar>
```

#### `MetricsFilter`

Namespace for filter components with automatic URL state management.

```tsx
{
  /* Select dropdown with single/multiple selection */
}
<MetricsFilter.Select
  filterKey="region"
  label="Region"
  options={options}
  multiple
  searchable
  placeholder="Select..."
/>;

{
  /* Radio button group */
}
<MetricsFilter.Radio
  filterKey="environment"
  label="Environment"
  options={options}
  orientation="horizontal"
/>;

{
  /* Search input */
}
<MetricsFilter.Search filterKey="service" label="Service" placeholder="Search..." />;
```

#### `MetricCard` & `MetricChart`

Visualization components with dynamic query building support.

```tsx
{
  /* Static query */
}
<MetricCard
  title="Active Users"
  query="prometheus_notifications_total"
  metricFormat="number"
  showTrend
/>;

{
  /* Dynamic query with filter context */
}
<MetricChart
  title="Request Rate"
  query={({ filters }) => `rate(http_requests_total{region="${filters.region}"}[5m])`}
  chartType="line"
  customApiParams={{ resolution: 'high' }}
/>;
```

### Hooks

#### `useMetrics`

Access the metrics context for URL state management and query building.

```tsx
import { useMetrics } from '@/modules/metrics';

function MyComponent() {
  const { timeRange, step, filterState, buildQueryContext, setFilter, resetFilters } = useMetrics();

  // Access current filter values
  const region = filterState.region;

  // Build query context for dynamic queries
  const context = buildQueryContext();
  const hasRegionFilter = context.has('region');

  return (
    <div>
      <p>
        Current time range: {timeRange.start.toISOString()} to {timeRange.end.toISOString()}
      </p>
      <p>Active filters: {Object.keys(filterState).length}</p>
    </div>
  );
}
```

#### `usePrometheusChart` & `usePrometheusCard`

Low-level hooks for custom implementations (automatically use metrics context).

```tsx
import { usePrometheusChart, usePrometheusCard } from '@/modules/metrics';

// Chart data hook
const { data, isLoading, error } = usePrometheusChart({
  query: 'rate(http_requests_total[5m])',
  // timeRange and step automatically from context
});

// Card data hook
const { data, isLoading, error } = usePrometheusCard({
  query: 'avg(cpu_usage_percent)',
  metricFormat: 'percentage',
});
```

### Query Builder Functions

Dynamic queries that adapt based on current filter state.

```tsx
import type { QueryBuilderFunction } from '@/modules/metrics';

// Basic query builder
const dynamicQuery: QueryBuilderFunction = ({ filters }) => {
  let query = 'http_requests_total';
  if (filters.region) {
    query += `{region="${filters.region}"}`;
  }
  return query;
};

// Advanced query builder with context utilities
const advancedQuery: QueryBuilderFunction = (context) => {
  const { filters, get, has, getMany } = context;

  // Get specific values with defaults
  const region = get('region', 'us-east-1');
  const environment = get('environment');

  // Check if filters are active
  if (!has('region')) {
    return 'http_requests_total'; // No region filter
  }

  // Get multiple values at once
  const { service, namespace } = getMany(['service', 'namespace']);

  // Build complex query
  const labels = [];
  if (region) labels.push(`region="${region}"`);
  if (environment) labels.push(`env="${environment}"`);
  if (service) labels.push(`service=~".*${service}.*"`);

  return `http_requests_total{${labels.join(', ')}}`;
};
```

### Custom API Parameters

Both `MetricCard` and `MetricChart` support custom API parameters for fine-tuned control.

```tsx
// Static API parameters
<MetricCard
  query="avg(cpu_usage)"
  customApiParams={{
    resolution: 'high',
    limit: 1000,
    caching: 'enabled',
    includeMetadata: true
  }}
/>

// Dynamic API parameters based on context
<MetricChart
  query={dynamicQuery}
  customApiParams={(context) => ({
    resolution: context.get('environment') === 'prod' ? 'high' : 'medium',
    limit: context.has('region') ? 5000 : 1000,
    aggregation: 'avg',
    refreshRate: context.get('refresh') === 'realtime' ? 'realtime' : 'normal'
  })}
/>
```

### URL State Management

All filter components automatically sync with URL parameters:

```tsx
// URL: /dashboard?region=us-west&environment=prod&search=api

<MetricsFilter.Select filterKey="region" />      {/* Will show 'us-west' selected */}
<MetricsFilter.Radio filterKey="environment" />  {/* Will show 'prod' selected */}
<MetricsFilter.Search filterKey="search" />      {/* Will show 'api' in input */}
```

**Supported URL Parameter Types:**

- `string` - Single values
- `array` - Comma-separated values for multi-select
- `date` - ISO date strings
- `dateRange` - Date range objects
- `number` - Numeric values

**URL State Features:**

- ✅ Bidirectional synchronization (URL ↔ UI)
- ✅ Page reload persistence
- ✅ Browser back/forward support
- ✅ Shareable URLs with filter state
- ✅ Type-safe parameter parsing
- ✅ Default value support

## Module Structure

```text
app/modules/metrics/
├─ README.md
├─ index.ts                     # Main barrel export
├─ constants.ts                 # REFRESH_OPTIONS, STEP_OPTIONS, etc.
├─ components/
│  ├─ index.ts
│  ├─ BaseMetric.tsx            # Shared loading/error wrapper
│  ├─ MetricCard.tsx            # Single value display
│  ├─ MetricChart.tsx           # Time series visualization
│  ├─ MetricsToolbar.tsx        # Compound toolbar component
│  ├─ controls/                 # Core control components
│  │  ├─ index.ts
│  │  ├─ RefreshControl.tsx     # Manual/auto refresh
│  │  ├─ StepControl.tsx        # Query resolution
│  │  └─ TimeRangeControl.tsx   # Time range picker
│  ├─ filters/                  # Filter components with URL sync
│  │  ├─ index.ts
│  │  ├─ MetricsFilterSelect.tsx   # Dropdown selection
│  │  ├─ MetricsFilterRadio.tsx    # Radio button group
│  │  └─ MetricsFilterSearch.tsx   # Search input
│  └─ series/                   # Chart series components
│     ├─ index.ts
│     ├─ AreaSeries.tsx
│     ├─ BarSeries.tsx
│     └─ LineSeries.tsx
├─ context/
│  ├─ index.ts
│  └─ metrics.context.tsx       # Unified context provider
├─ hooks/
│  ├─ index.ts
│  └─ usePrometheusApi.ts     # API integration hooks
├─ types/
│  ├─ metrics.type.ts          # Core type definitions
│  └─ url.type.ts              # URL state management types
└─ utils/
   ├─ index.ts
   ├─ date-parsers.ts           # Date/time parsing utilities
   └─ url-parsers.ts            # URL parameter parsing
```

## Dependencies

**Core Libraries:**

- `/app/modules/prometheus` - Shared types, formatters, and validation
- `nuqs` - URL state management
- `@tanstack/react-query` - Data fetching and caching
- `recharts` - Chart rendering (via Shadcn UI)

**API Integration:**
All data fetching goes through `/api/prometheus` endpoint, never directly to Prometheus servers. This provides security, centralized authentication, and consistent error handling.

**Type Safety:**
Complete TypeScript coverage with interfaces for:

- Filter options and values
- Query builder functions
- URL state management
- API parameter customization
- Component props and callbacks
