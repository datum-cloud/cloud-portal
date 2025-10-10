# Metrics Integration Module

A comprehensive TypeScript-first module for Prometheus metrics visualization with dynamic filtering, URL state management, and flexible controls.

## 🚀 Key Features

- **Dynamic Label Fetching**: Automatically fetch filter options from Prometheus labels API
- **Enhanced Filter Components**: Unified `MetricsFilterSelect` with MultiSelect/SelectBox integration
- **Centralized Query Building**: Utility functions for building Prometheus queries with consistent patterns
- **Flexible Query Building**: Support for both static strings and dynamic query builder functions
- **Unified State Management**: Single MetricsProvider manages core controls + custom filters
- **URL State Synchronization**: Automatic bidirectional sync between UI state and URL parameters
- **Enhanced TypeScript**: Full type safety for filters, query builders, and API parameters
- **Custom API Parameters**: Support for both object and function-based API parameter customization
- **Built-in Transforms & Filters**: Predefined functions for common label transformations

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

### Advanced Usage with Dynamic Filters and Labels

```tsx
import {
  MetricsProvider,
  MetricsToolbar,
  MetricsFilterSelect,
  MetricCard,
  MetricChart,
  usePrometheusLabels,
  labelFilters,
  buildRateQuery,
  createRegionFilter,
  type QueryBuilderFunction,
} from '@/modules/metrics';

function AdvancedDashboard() {
  // Fetch region options dynamically from Prometheus
  const { options: regionOptions, isLoading: regionsLoading } = usePrometheusLabels({
    label: 'region',
    filter: labelFilters.excludeTest,
  });

  // Fetch environment options
  const { options: environmentOptions, isLoading: environmentsLoading } = usePrometheusLabels({
    label: 'environment',
    filter: labelFilters.productionOnly,
  });

  // Legacy approach: Manual query building
  const legacyQuery: QueryBuilderFunction = ({ filters, get }) => {
    const baseLabels = [`project="${projectId}"`, `service="${serviceId}"`, `region!=""`];

    const regionFilter = get('regions');
    if (regionFilter && Array.isArray(regionFilter) && regionFilter.length > 0) {
      const regionPattern = regionFilter.join('|');
      baseLabels.push(`region=~"${regionPattern}"`);
    }

    return `rate(http_requests_total{${baseLabels.join(',')}}[5m])`;
  };

  // Modern approach: Using query builder utilities
  const modernQuery: QueryBuilderFunction = ({ get }) => {
    return buildRateQuery({
      metric: 'http_requests_total',
      timeWindow: '5m',
      baseLabels: {
        project: projectId,
        service: serviceId,
      },
      customLabels: {
        region: '!=""',
      },
      filters: [createRegionFilter(get('regions'))],
      groupBy: ['region'],
    });
  };

  return (
    <MetricsProvider>
      <MetricsToolbar variant="card">
        <MetricsToolbar.Filters>
          <MetricsFilterSelect
            filterKey="region"
            label="Region"
            options={regionOptions}
            placeholder="Select regions..."
            multiple
            searchable
            disabled={regionsLoading}
            showSelectAll
          />
          <MetricsFilterSelect
            filterKey="environment"
            label="Environment"
            options={environmentOptions}
            placeholder="Select environment..."
            disabled={environmentsLoading}
          />
        </MetricsToolbar.Filters>
        <MetricsToolbar.CoreControls />
      </MetricsToolbar>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          title="Regional Requests"
          query={modernQuery}
          metricFormat="number"
          showTrend
          customApiParams={{
            resolution: 'high',
            caching: 'enabled',
          }}
        />

        <MetricChart
          title="Request Rate by Region"
          query={modernQuery}
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

#### `MetricsFilterSelect`

Enhanced filter component with automatic URL state management and MultiSelect/SelectBox integration.

```tsx
// Basic select filter
<MetricsFilterSelect
  filterKey="region"
  label="Region"
  options={regionOptions}
  placeholder="Select region..."
  searchable
/>

// Multiple selection with dynamic labels
<MetricsFilterSelect
  filterKey="regions"
  label="Regions"
  options={regionOptions}
  placeholder="Select regions..."
  multiple
  showSelectAll
  maxCount={5}
/>

// With Prometheus labels hook
const { options, isLoading } = usePrometheusLabels({ label: 'instance' });

<MetricsFilterSelect
  filterKey="instances"
  label="Instances"
  options={options}
  disabled={isLoading}
  multiple
  searchable
/>
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

#### `usePrometheusLabels`

Hook for fetching Prometheus label values with automatic formatting for MultiSelect components.

```tsx
import { usePrometheusLabels, labelTransforms, labelFilters } from '@/modules/metrics';

// Basic usage
const { options, isLoading } = usePrometheusLabels({
  label: 'region'
});

// Advanced usage with transforms and filters
const { options, isLoading, error, refetch } = usePrometheusLabels({
  label: 'instance',
  transform: labelTransforms.removePort,     // host:9090 → host
  filter: labelFilters.excludeTest,          // Remove test instances
  sort: (a, b) => a.label.localeCompare(b.label)
});

// Use with MetricsFilterSelect
<MetricsFilterSelect
  filterKey="regions"
  placeholder="Select regions..."
  multiple
  options={options}
  disabled={isLoading}
/>
```

**Built-in Transform Functions:**

- `labelTransforms.removePort` - Remove port from instance labels
- `labelTransforms.capitalize` - Capitalize first letter
- `labelTransforms.humanize` - Replace underscores with spaces and capitalize
- `labelTransforms.extractRegion` - Extract AWS regions from complex strings

**Built-in Filter Functions:**

- `labelFilters.excludeTest` - Remove test environments
- `labelFilters.excludeDev` - Remove dev environments
- `labelFilters.productionOnly` - Only production values
- `labelFilters.excludeEmpty` - Remove empty/invalid values

### Query Builder Utilities

Centralized utilities for building Prometheus queries with consistent patterns and region filtering.

```tsx
import {
  buildRateQuery,
  buildHistogramQuantileQuery,
  buildPrometheusLabelSelector,
  createRegionFilter,
  type PrometheusLabelFilter,
} from '@/modules/metrics';

// Simple rate query with region filtering
const query = buildRateQuery({
  metric: 'envoy_vhost_vcluster_upstream_rq',
  timeWindow: '15m',
  baseLabels: {
    resourcemanager_datumapis_com_project_name: projectId,
    gateway_name: proxyId,
    gateway_namespace: 'default',
  },
  customLabels: {
    label_topology_kubernetes_io_region: '!=""', // Raw operator
  },
  filters: [createRegionFilter(get('regions'))],
  groupBy: ['label_topology_kubernetes_io_region'],
});

// Histogram quantile for latency metrics
const latencyQuery = buildHistogramQuantileQuery({
  quantile: 0.99,
  metric: 'http_request_duration_seconds_bucket',
  timeWindow: '5m',
  baseLabels: { service: 'api' },
  filters: [
    createRegionFilter(get('regions')),
    { label: 'environment', value: get('environment') },
  ],
  groupBy: ['le', 'namespace'],
});

// Manual label selector building
const selector = buildPrometheusLabelSelector({
  baseLabels: { project: 'myproject' },
  customLabels: {
    region: '!=""', // Raw operator
    environment: 'production', // Auto-quoted
  },
  filters: [
    { label: 'instance', value: ['host1', 'host2'] }, // Multiple values
    { label: 'service', value: 'api' }, // Single value
  ],
});
// Result: {project="myproject",region!="",environment="production",instance=~"host1|host2",service="api"}
```

**Query Builder Features:**

- ✅ **Automatic quoting**: Base labels are automatically quoted
- ✅ **Raw operators**: Custom labels support `!=`, `=~`, `!~` operators
- ✅ **Array handling**: Multiple filter values use regex OR patterns
- ✅ **Type safety**: Full TypeScript support with interfaces
- ✅ **Consistent patterns**: Standardized across all metric components

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

// Modern approach using query builder utilities
const modernQuery: QueryBuilderFunction = ({ get }) => {
  return buildRateQuery({
    metric: 'http_requests_total',
    timeWindow: '5m',
    baseLabels: { service: 'api' },
    filters: [
      createRegionFilter(get('regions')),
      { label: 'environment', value: get('environment') },
    ],
    groupBy: ['region', 'environment'],
  });
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

### Time Range Format

Time ranges in URLs use Unix timestamp format (seconds) for clean, compact URLs:

```
# Relative ranges (presets)
?timeRange=now-24h  # Last 24 hours (day boundaries)
?timeRange=now-6h   # Last 6 hours (exact time)
?timeRange=now-7d   # Last 7 days (day boundaries)

# Absolute ranges (custom dates)
?timeRange=1704067200_1706745599  # Unix timestamps in seconds
```

**Smart Day Boundaries:**

The time range control intelligently applies day boundaries based on the range duration:

| Range Type   | Example             | Start Time   | End Time     | Use Case             |
| ------------ | ------------------- | ------------ | ------------ | -------------------- |
| Minutes      | `now-5m`, `now-30m` | Exact time   | Current time | Real-time monitoring |
| Hours (<24h) | `now-1h`, `now-12h` | Exact time   | Current time | Real-time monitoring |
| Hours (≥24h) | `now-24h`           | **00:00:00** | **23:59:59** | Daily reporting      |
| Days         | `now-2d`, `now-7d`  | **00:00:00** | **23:59:59** | Historical analysis  |
| Custom dates | Calendar selection  | **00:00:00** | **23:59:59** | Custom reporting     |

This behavior ensures:

- ✅ **Real-time precision** for short ranges (monitoring)
- ✅ **Full day coverage** for daily/weekly ranges (reporting)
- ✅ **Consistent timestamps** on day boundaries
- ✅ **Intuitive user experience** matching mental models

**Timezone-Aware Conversion:**

The time range control automatically handles timezone conversion:

1. **User Selection**: Dates are interpreted in the user's timezone preference (`userPreferences.timezone`)
2. **UTC Conversion**: Start/end of day applied in user's timezone, then converted to UTC
3. **API Format**: Sent as Unix timestamps (seconds) to the Prometheus API
4. **Display**: Results displayed back in user's timezone

Example for a user in PST (UTC-7) selecting "Oct 9, 2025":

```
User sees: Oct 9, 2025 (PST)
Start: Oct 9, 2025 00:00:00 PST → 1728464400 UTC
End:   Oct 9, 2025 23:59:59 PST → 1728550799 UTC
API receives: { start: 1728464400, end: 1728550799 }
```

This ensures accurate time range queries regardless of user timezone.

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
│  │  ├─ base/
│  │  │  ├─ metrics-filter-select.tsx  # Enhanced select with MultiSelect/SelectBox
│  │  │  ├─ metrics-filter-radio.tsx   # Radio button group
│  │  │  └─ metrics-filter-search.tsx  # Search input
│  │  └─ regions-filter.tsx      # Example region filter implementation
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
│  ├─ usePrometheusApi.ts        # Core API integration hooks
│  └─ usePrometheusLabels.ts     # Label fetching with transforms/filters
├─ types/
│  ├─ metrics.type.ts          # Core type definitions
│  └─ url.type.ts              # URL state management types
└─ utils/
   ├─ index.ts
   ├─ date-parsers.ts           # Date/time parsing utilities
   ├─ url-parsers.ts            # URL parameter parsing
   └─ query-builders.ts         # Prometheus query building utilities
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
