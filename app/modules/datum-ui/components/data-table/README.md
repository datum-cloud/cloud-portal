# DataTable Component - Modern React Data Table

A powerful, feature-rich data table component built with React, TypeScript, and @tanstack/react-table. Includes advanced filtering, sorting, pagination, and state management with excellent performance and developer experience.

## 🚀 Key Features

- **🎯 Unified Architecture**: Single provider for table and filter state management
- **⚡ High Performance**: Optimized rendering with smart memoization and virtualization
- **🔍 Advanced Filtering**: Debounced search, popover filters, and clean default layouts
- **📊 Rich Data Display**: Support for table and card view modes
- **🔗 URL State Management**: Automatic synchronization with browser URL using nuqs
- **🔀 Smart Sorting**: Context-aware sort labels with popover menu interface
- **📱 Responsive Design**: Mobile-friendly with adaptive layouts
- **♿ Accessibility**: Full keyboard navigation and screen reader support
- **🎨 Highly Customizable**: Flexible styling and component composition
- **🔧 TypeScript First**: Full type safety with excellent IntelliSense
- **📈 Scalable**: Handles large datasets efficiently

## 📚 Quick Start

### Basic Usage

```tsx
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
];

const users: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
];

function UsersTable() {
  return <DataTable columns={columns} data={users} tableTitle="Users" />;
}
```

### With Filtering

```tsx
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableFilter } from '@/modules/datum-ui/components/data-table/filter';

function UsersTableWithFilters() {
  return (
    <DataTable
      columns={columns}
      data={users}
      tableTitle="Users"
      filterComponent={
        <DataTableFilter>
          <DataTableFilter.Search filterKey="name" placeholder="Search users..." />
          <DataTableFilter.Select
            filterKey="status"
            label="Status"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </DataTableFilter>
      }
    />
  );
}
```

### Server-Side Data

```tsx
function ServerDataTable() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFiltersChange = async (filters: Record<string, any>) => {
    setIsLoading(true);
    try {
      const response = await fetchUsers(filters);
      setData(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      serverSideFiltering={true}
      onFiltersChange={handleFiltersChange}
      filterComponent={
        <DataTableFilter>
          <DataTableFilter.Search filterKey="search" debounceMs={500} />
          <DataTableFilter.Select filterKey="status" options={statusOptions} />
        </DataTableFilter>
      }
    />
  );
}
```

## 🎛️ DataTable Props

| Prop                      | Type                        | Default      | Description                            |
| ------------------------- | --------------------------- | ------------ | -------------------------------------- |
| `columns`                 | `ColumnDef<TData>[]`        | **required** | Table column definitions               |
| `data`                    | `TData[]`                   | **required** | Table data array                       |
| `tableTitle`              | `string`                    | -            | Table title displayed in header        |
| `isLoading`               | `boolean`                   | `false`      | Show loading state                     |
| `loadingText`             | `string`                    | "Loading..." | Custom loading text                    |
| `mode`                    | `'table' \| 'card'`         | `'table'`    | Display mode - table or card layout    |
| `hideHeader`              | `boolean`                   | `false`      | Hide table header                      |
| `className`               | `string`                    | -            | Custom CSS classes for table container |
| `tableClassName`          | `string`                    | -            | Custom CSS classes for table element   |
| `tableContainerClassName` | `string`                    | -            | Custom CSS classes for table wrapper   |
| `tableCardClassName`      | `string`                    | -            | Custom CSS classes for card mode       |
| `rowClassName`            | `string \| (row) => string` | -            | Custom CSS classes for table rows      |
| `onRowClick`              | `(row: Row<TData>) => void` | -            | Handle row click events                |
| `rowActions`              | `RowAction<TData>[]`        | `[]`         | Row action buttons/menu items          |
| `emptyContent`            | `EmptyContent`              | -            | Custom empty state content             |

### Filter & State Props

| Prop                   | Type                                     | Default | Description                                |
| ---------------------- | ---------------------------------------- | ------- | ------------------------------------------ |
| `filterComponent`      | `ReactNode`                              | -       | Filter component (usually DataTableFilter) |
| `defaultFilters`       | `Record<string, any>`                    | `{}`    | Initial filter values                      |
| `onFiltersChange`      | `(filters: Record<string, any>) => void` | -       | Callback when filters change               |
| `serverSideFiltering`  | `boolean`                                | `false` | Enable server-side filtering mode          |
| `defaultColumnFilters` | `ColumnFiltersState`                     | `[]`    | Initial column filter state                |
| `defaultSorting`       | `SortingState`                           | `[]`    | Initial sorting state                      |
| `pageSize`             | `number`                                 | `20`    | Number of rows per page                    |

## 🎨 Display Modes

### Table Mode (Default)

Standard table layout with rows and columns.

```tsx
<DataTable columns={columns} data={data} mode="table" />
```

### Card Mode

Card-based layout for better mobile experience.

```tsx
<DataTable
  columns={columns}
  data={data}
  mode="card"
  tableCardClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
/>
```

## 🔀 Sorting System

The DataTable includes a powerful sorting system with context-aware labels and an intuitive popover menu interface.

### Basic Sorting

Sorting is automatically enabled for columns with `accessorKey`. Click any column header to open the sort menu.

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    // Automatic text sorting with "A → Z" / "Z → A" labels
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    meta: {
      sortType: 'date', // Shows "Oldest First" / "Newest First"
    },
  },
];
```

### Sort Types & Context-Aware Labels

The sorting system automatically provides appropriate labels based on the data type:

| Sort Type | Ascending Label | Descending Label |
| --------- | --------------- | ---------------- |
| `text`    | A → Z           | Z → A            |
| `number`  | Low → High      | High → Low       |
| `date`    | Oldest First    | Newest First     |
| `array`   | Fewest First    | Most First       |
| `boolean` | False → True    | True → False     |
| default   | Ascending       | Descending       |

### Custom Sort Labels

Override the default labels for any column:

```tsx
{
  header: 'Priority',
  accessorKey: 'priority',
  meta: {
    sortType: 'number',
    sortLabels: {
      asc: 'Low Priority First',
      desc: 'High Priority First',
    },
  },
}
```

### Nested Field Sorting

Sort by nested object properties using dot notation:

```tsx
{
  header: 'Company Name',
  accessorKey: 'company.name',
  meta: {
    sortPath: 'company.name',
    sortType: 'text',
  },
}
```

### Array Sorting

Sort by array length or unique values within arrays:

```tsx
// Sort by number of tags
{
  header: 'Tags',
  accessorKey: 'tags',
  meta: {
    sortType: 'array',
    sortArrayBy: 'length', // Sort by array length
  },
}

// Sort by unique nested values in arrays
{
  header: 'DNS Providers',
  accessorKey: 'status.nameservers',
  meta: {
    sortPath: 'status.nameservers',
    sortType: 'array',
    sortArrayBy: 'ips.registrantName', // Unique provider names
  },
}
```

### Disable Sorting

Disable sorting for specific columns:

```tsx
{
  header: 'Actions',
  id: 'actions',
  meta: {
    sortable: false, // Disable sorting
  },
  cell: ({ row }) => <RowActions row={row} />,
}
```

### Default Sort State

Set initial sorting when the table loads:

```tsx
<DataTable
  columns={columns}
  data={data}
  defaultSorting={[
    {
      id: 'createdAt',
      desc: true, // Sort by newest first
    },
  ]}
/>
```

### Custom Page Size

Set the number of rows displayed per page:

```tsx
<DataTable
  columns={columns}
  data={data}
  pageSize={50} // Show 50 rows per page instead of default 20
/>
```

### Sort Menu Features

- **Visual Indicators**: Icons show current sort direction
- **Active Highlight**: Current sort is highlighted with checkmark
- **Clear Sort**: Option to remove sorting and return to default order
- **Accessible**: Full keyboard navigation and ARIA labels
- **Click to Open**: Click any sortable column header to open menu

## 🔍 Filtering System

The DataTable integrates seamlessly with the advanced filtering system. See the [Filter Documentation](./filter/README.md) for detailed information.

### Filter Architecture Overview

The filtering system uses a **unified context-based architecture** with automatic URL synchronization:

```
User Input → Filter Component → URL State Hook → Context Update → URL Update → Table Re-render
```

**Key Components:**

- **Context Layer**: `DataTableProvider` manages filter state and syncs with URL
- **Filter Components**: Search, Select, DatePicker, Radio, Checkbox
- **URL State**: Automatic synchronization using `nuqs` library
- **Type-Safe**: Full TypeScript support with proper typing

### Client-Side Filtering (Default)

Filters data locally using @tanstack/react-table's built-in filtering.

```tsx
<DataTable
  columns={columns}
  data={allData} // Load all data upfront
  serverSideFiltering={false} // Default
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="name" immediate={true} />
      <DataTableFilter.Select filterKey="status" options={statusOptions} />
    </DataTableFilter>
  }
/>
```

**How it works:**

1. Filter updates → Context updates
2. Context calls `table.getColumn(key)?.setFilterValue(value)`
3. TanStack Table filters rows locally
4. Table re-renders with filtered data
5. URL updates automatically (shareable links!)

**Important:** For client-side filtering, `filterKey` must match column `accessorKey`.

### Server-Side Filtering

Sends filter changes to your API for server-side processing.

```tsx
function ServerDataTable() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFiltersChange = async (filters: Record<string, any>) => {
    setIsLoading(true);
    try {
      const response = await fetchUsers(filters);
      setData(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={data} // Filtered data from API
      isLoading={isLoading}
      serverSideFiltering={true}
      onFiltersChange={handleFiltersChange} // Required!
      filterComponent={
        <DataTableFilter>
          <DataTableFilter.Search filterKey="search" debounceMs={500} />
          <DataTableFilter.Select filterKey="category" options={categoryOptions} />
        </DataTableFilter>
      }
    />
  );
}
```

**How it works:**

1. Filter updates → Context updates
2. Context calls `onFiltersChange(filters)`
3. Parent component fetches data from API
4. New data passed to DataTable
5. Table re-renders with server-filtered data
6. URL updates automatically

**URL State on Load:** When the page loads with URL parameters (e.g., `?search=example&category=tech`), the system automatically calls `onFiltersChange` with those values to fetch the correct data.

### Hybrid Filtering

Combine server-side and client-side filtering for optimal performance.

```tsx
<DataTable
  columns={columns}
  data={serverFilteredData}
  serverSideFiltering={false} // Enable local filtering too
  onFiltersChange={handleServerFilters} // Also send to server
  filterComponent={
    <DataTableFilter>
      {/* Server-side filters */}
      <DataTableFilter.Search filterKey="search" debounceMs={500} />
      <DataTableFilter.Select filterKey="category" options={categoryOptions} />

      {/* Client-side filters */}
      <DataTableFilter.Radio filterKey="priority" options={priorityOptions} />
      <DataTableFilter.Checkbox filterKey="tags" options={tagOptions} />
    </DataTableFilter>
  }
/>
```

### Available Filter Components

#### 1. Global Search Filter 🆕

Multi-column search that searches across all or specified columns simultaneously.

```tsx
<DataTableFilter.GlobalSearch placeholder="Search everything..." />
```

**Features:**

- ✅ Searches multiple columns at once
- ✅ Auto-detects searchable columns
- ✅ Explicit column control
- ✅ Nested field support
- ✅ Debounced input (configurable)
- ✅ Type-aware searching (strings, numbers, dates, arrays, objects)
- ✅ Performance optimized

**Basic Usage:**

```tsx
// Auto-detect all searchable columns
<DataTableFilter.GlobalSearch placeholder="Search across all columns..." />

// Explicit columns
<DataTableFilter.GlobalSearch
  searchableColumns={['name', 'email', 'company.name']}
  placeholder="Search name, email, or company..."
/>

// Exclude specific columns
<DataTableFilter.GlobalSearch
  excludeColumns={['id', 'createdAt', 'actions']}
  placeholder="Search all except ID and dates..."
/>

// Advanced options
<DataTableFilter.GlobalSearch
  searchableColumns={['name', 'email']}
  placeholder="Search..."
  label="Global Search"
  description="Search across multiple fields"
  debounceMs={500}
  showSearchingColumns={true}
/>
```

**Column-Level Control:**

Control which columns are searchable using column meta:

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: {
      searchable: true, // ✅ Include in global search
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: {
      searchable: true,
      searchTransform: (value) => value.toLowerCase(), // Custom transform
    },
  },
  {
    accessorKey: 'company.name',
    header: 'Company',
    meta: {
      searchable: true,
      searchPath: 'company.name', // Nested field
    },
  },
  {
    accessorKey: 'id',
    header: 'ID',
    meta: {
      searchable: false, // ❌ Exclude from global search (highest priority)
    },
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    meta: {
      searchable: true, // Searches array values
    },
  },
];
```

**Priority Order:**

1. **`meta.searchable: false`** - Always excluded (highest priority)
2. **`excludeColumns` prop** - Explicitly excluded columns
3. **`searchableColumns` prop** - Explicitly included columns (if provided)
4. **Auto-detection** - Columns with `accessorKey` or `accessorFn` (if no explicit list)

**Props:**

| Prop                   | Type       | Default     | Description                           |
| ---------------------- | ---------- | ----------- | ------------------------------------- |
| `searchableColumns`    | `string[]` | auto-detect | Explicit columns to search            |
| `excludeColumns`       | `string[]` | `[]`        | Columns to exclude from search        |
| `placeholder`          | `string`   | "Search..." | Input placeholder                     |
| `label`                | `string`   | -           | Label above input                     |
| `description`          | `string`   | -           | Description text                      |
| `debounceMs`           | `number`   | `300`       | Debounce delay in milliseconds        |
| `immediate`            | `boolean`  | `false`     | Skip debouncing                       |
| `showSearchingColumns` | `boolean`  | `false`     | Show which columns are being searched |
| `disabled`             | `boolean`  | `false`     | Disable input                         |
| `className`            | `string`   | -           | Custom CSS classes                    |
| `inputClassName`       | `string`   | -           | Custom CSS classes for input          |

**How It Works:**

1. Extracts values from all searchable columns for each row
2. Converts values to searchable strings (handles arrays, objects, dates)
3. Normalizes search term and values (case-insensitive, trim)
4. Checks if any column value contains the search term
5. Returns rows that have at least one matching column

**Search Behavior:**

- **Case-insensitive** - Searches ignore case by default
- **Contains match** - Finds partial matches anywhere in the text
- **Nested fields** - Automatically searches nested objects and arrays
- **Type-aware** - Handles strings, numbers, dates, arrays, and objects

**Performance:**

- ✅ Memoized filter function
- ✅ Early exit on first match
- ✅ Debounced input (300ms default)
- ✅ Optimized value extraction

#### 2. Search Filter

Single-column search with debouncing. Use this when you need to search a specific column.

```tsx
<DataTableFilter.Search
  filterKey="domainName"
  placeholder="Search domains..."
  label="Search"
  description="Search by domain name"
  debounceMs={300} // Default: 300ms
  immediate={false} // Skip debounce if true
  disabled={false}
/>
```

**Features:**

- ✅ Searches single column only
- ✅ Debounced input (configurable delay)
- ✅ Clear button (X icon)
- ✅ Search icon
- ✅ Syncs with URL (`?domainName=example`)
- ✅ Local state for immediate UI feedback

**URL Format:** `?filterKey=searchTerm`

**When to Use:**

- ✅ Filtering specific column (e.g., email, phone number)
- ✅ Column has special format or validation
- ✅ Combined with other filters for precision
- ✅ Need column-specific search behavior

**Important:** For client-side filtering, `filterKey` must match column `accessorKey`.

### Global Search vs Single-Column Search

| Feature              | Global Search                   | Single-Column Search        |
| -------------------- | ------------------------------- | --------------------------- |
| **Scope**            | Multiple columns                | One column                  |
| **Use Case**         | Quick, Google-like search       | Precise, targeted filtering |
| **Configuration**    | Auto-detect or explicit columns | Requires `filterKey`        |
| **Performance**      | Optimized with early exit       | Fast (single column)        |
| **User Experience**  | Intuitive, broad search         | Specific, controlled        |
| **URL Param**        | Not synced (table state only)   | Synced with URL             |
| **Nested Fields**    | ✅ Supported                    | ✅ Supported (via column)   |
| **Arrays/Objects**   | ✅ Searches all values          | ✅ Depends on column config |
| **Custom Transform** | ✅ Via column meta              | ✅ Via column meta          |

**Recommendation:** Use `GlobalSearch` for primary search, `Search` for specific column filtering.

```tsx
<DataTableFilter>
  {/* Primary: Quick search across everything */}
  <DataTableFilter.GlobalSearch placeholder="Search..." />

  {/* Secondary: Specific filters */}
  <DataTableFilter.Search filterKey="email" placeholder="Email..." />
  <DataTableFilter.Select filterKey="status" options={statusOptions} />
</DataTableFilter>
```

#### 3. Select Filter

Single or multi-select dropdown with search.

```tsx
<DataTableFilter.Select
  filterKey="status"
  label="Status"
  description="Filter by status"
  placeholder="Select status..."
  multiple={false} // Enable multi-select
  searchable={true} // Enable search in options
  options={[
    { label: 'Active', value: 'active', icon: <CheckIcon /> },
    { label: 'Inactive', value: 'inactive', disabled: true },
  ]}
/>
```

**Features:**

- ✅ Single or multi-select mode
- ✅ Searchable dropdown
- ✅ Badge display for selected items
- ✅ Clear all button
- ✅ Option icons and descriptions
- ✅ Disabled options support

**URL Format:**

- Single: `?status=active`
- Multiple: `?status=active&status=inactive`

#### 3. DatePicker Filter

Single date or date range picker with timezone support.

```tsx
<DataTableFilter.DatePicker
  filterKey="createdAt"
  mode="range" // 'single' or 'range'
  label="Created Date"
  description="Filter by creation date"
  placeholder="Select date range..."
  closeOnSelect={true}
  yearsRange={10}
  // Timezone-aware options
  applyDayBoundaries={true} // Apply start/end of day
  useUserTimezone={true} // Use user's timezone preference
  // Date constraints
  minDate={new Date('2020-01-01')}
  maxDate={new Date()}
  disableFuture={true}
  disablePast={false}
  maxRange={90} // Maximum 90 days range
  // Preset customization
  excludePresets={['today', 'yesterday']}
/>
```

**Features:**

- ✅ Single date or date range
- ✅ Timezone-aware (uses user preference)
- ✅ Presets (Today, Last 7 days, Last 30 days, etc.)
- ✅ Custom date constraints
- ✅ Compact URL serialization

**URL Format:**

- Single: `?createdAt=2024-10-23T00:00:00.000Z`
- Range: `?createdAt=1728172800_1728345599` (Unix timestamps)

#### 4. Radio Filter (Popover)

Single selection with popover interface.

```tsx
<DataTableFilter.Radio
  filterKey="priority"
  label="Priority"
  options={[
    { label: 'High', value: 'high', description: 'Urgent items' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ]}
/>
```

**Features:**

- ✅ Single selection only
- ✅ Popover interface (clean UI)
- ✅ Option descriptions
- ✅ Clear selection button

#### 5. Checkbox Filter (Popover)

Multiple selection with popover interface.

```tsx
<DataTableFilter.Checkbox
  filterKey="tags"
  label="Tags"
  options={[
    { label: 'React', value: 'react' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Node.js', value: 'nodejs' },
  ]}
/>
```

**Features:**

- ✅ Multiple selection
- ✅ Popover interface
- ✅ Select all / Clear all
- ✅ Badge display for selected items

### Filter UI Variants

#### Default Variant (Inline)

Horizontal layout without card wrapper.

```tsx
<DataTableFilter variant="default">
  <DataTableFilter.Search filterKey="name" />
  <DataTableFilter.Select filterKey="status" options={options} />
</DataTableFilter>
```

#### Card Variant (Collapsible)

Card with border, collapsible content, and filter management.

```tsx
<DataTableFilter variant="card" collapsible={true} defaultExpanded={false} showHeader={true}>
  <DataTableFilter.Search filterKey="name" />
  <DataTableFilter.Select filterKey="status" options={options} />
  <DataTableFilter.DatePicker filterKey="createdAt" mode="range" />
</DataTableFilter>
```

**Features:**

- ✅ Card with border and shadow
- ✅ Collapsible content
- ✅ Filter count badge
- ✅ "Reset all" button
- ✅ Responsive grid layout

### URL State Management

All filters automatically sync with URL parameters for shareable links.

**Example URL:**

```
/domains?domainName=example&status=active&createdAt=1728172800_1728345599
```

**Serialization Examples:**

| Filter Type | State                                | URL Parameter                      |
| ----------- | ------------------------------------ | ---------------------------------- |
| String      | `"example"`                          | `?search=example`                  |
| Array       | `["tag1", "tag2"]`                   | `?tags=tag1&tags=tag2`             |
| Date        | `Date(2024-10-23)`                   | `?date=2024-10-23T00:00:00.000Z`   |
| Date Range  | `{ from: Date(...), to: Date(...) }` | `?dateRange=1728172800_1728345599` |

**Initial Load from URL:**
When a page loads with URL parameters, the system automatically:

1. Parses URL parameters
2. Deserializes complex types (dates, arrays)
3. Calls `onFiltersChange` with parsed values (for server-side filtering)
4. Initializes filter UI with URL values

### Filter Performance Optimizations

#### 1. Debouncing

```tsx
// Search input debounced by 300ms (default)
<DataTableFilter.Search filterKey="search" debounceMs={300} />

// Immediate updates (no debounce)
<DataTableFilter.Search filterKey="search" immediate={true} />
```

#### 2. Local State for UI Responsiveness

Filter components maintain local state for immediate UI feedback, then sync with context/URL after debounce.

#### 3. Memoization

Context values and filter hooks are memoized to prevent unnecessary re-renders.

#### 4. Selective Updates

Individual filters use `useFilter` hook for isolated updates - only re-render when their specific value changes.

### Advanced Filter Usage

#### Custom Filter Hooks

Access filter state programmatically:

```tsx
import { useFilter, useDataTableFilter } from '@/modules/datum-ui/components/data-table';

function CustomFilterComponent() {
  // Access specific filter
  const { value, setValue, reset } = useFilter<string>('search');

  // Access all filter state
  const { filterState, hasActiveFilters, getActiveFilterCount, resetAllFilters } =
    useDataTableFilter();

  return (
    <div>
      <input value={value || ''} onChange={(e) => setValue(e.target.value)} />
      {hasActiveFilters() && (
        <button onClick={resetAllFilters}>Clear {getActiveFilterCount()} filters</button>
      )}
    </div>
  );
}
```

#### Filter State Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     User Types in Search                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         SearchFilter: setLocalValue (immediate UI)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              useDebounce (300ms delay)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│      useStringFilter: setValue (context + URL update)        │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Context Update  │    │    URL Update    │
│  setFilter()     │    │  setUrlValue()   │
└────────┬─────────┘    └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Client-Side or Server-Side?                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│   Client-Side    │    │   Server-Side    │
│ table.setFilter()│    │ onFiltersChange()│
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ TanStack filters │    │   API Call       │
│ rows locally     │    │   Fetch new data │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Table Re-renders                           │
└─────────────────────────────────────────────────────────────┘
```

## ⚡ Performance Features

### 1. **Unified Provider Architecture**

Single context provider eliminates nested provider overhead and reduces React tree depth.

### 2. **Smart Memoization**

- Column definitions are memoized to prevent unnecessary re-renders
- Filter state is optimized with selective updates
- Table instance is cached and reused efficiently

### 3. **Virtualization Ready**

Built-in support for large datasets with @tanstack/react-table's virtualization features.

### 4. **Debounced Operations**

Search and filter operations are debounced to reduce API calls and improve performance.

### 5. **Selective Re-renders**

Components only re-render when their specific data changes, not the entire table state.

## 🎨 Customization

### Styling

```tsx
<DataTable
  columns={columns}
  data={data}
  className="custom-table-container"
  tableClassName="custom-table"
  tableContainerClassName="custom-wrapper"
  rowClassName={(row) => (row.original.status === 'active' ? 'bg-green-50' : 'bg-gray-50')}
/>
```

### Empty States

```tsx
<DataTable
  columns={columns}
  data={[]}
  emptyContent={{
    title: 'No users found',
    description: 'Try adjusting your search or filter criteria',
    action: {
      label: 'Add User',
      onClick: () => navigate('/users/new'),
    },
  }}
/>
```

### Row Actions

```tsx
const rowActions: RowAction<User>[] = [
  {
    label: 'Edit',
    onClick: (row) => navigate(`/users/${row.original.id}/edit`),
    icon: <Edit className="h-4 w-4" />,
  },
  {
    label: 'Delete',
    onClick: (row) => handleDelete(row.original.id),
    icon: <Trash className="h-4 w-4" />,
    variant: 'destructive',
  },
];

<DataTable
  columns={columns}
  data={data}
  rowActions={rowActions}
  onRowClick={(row) => navigate(`/users/${row.original.id}`)}
/>;
```

### Loading States

```tsx
<DataTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  loadingText="Fetching user data..."
/>
```

## 🔧 Advanced Usage

### Custom Column Definitions

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Full Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar src={row.original.avatar} />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge type={row.original.status === 'active' ? 'success' : 'secondary'}>
        {row.original.status}
      </Badge>
    ),
    filterFn: 'equals', // Enable filtering for this column
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleEdit(row.original)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(row.original)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
```

### Integration with React Hook Form

```tsx
import { useForm } from 'react-hook-form';

function UserManagement() {
  const form = useForm();
  const [users, setUsers] = useState([]);

  const handleFiltersChange = (filters: Record<string, any>) => {
    // Update form values when filters change
    Object.entries(filters).forEach(([key, value]) => {
      form.setValue(key, value);
    });

    // Fetch filtered data
    fetchUsers(filters).then(setUsers);
  };

  return (
    <Form {...form}>
      <DataTable
        columns={columns}
        data={users}
        serverSideFiltering={true}
        onFiltersChange={handleFiltersChange}
        defaultFilters={form.getValues()}
        filterComponent={
          <DataTableFilter>
            <DataTableFilter.Search filterKey="search" />
            <DataTableFilter.Select filterKey="department" options={departments} />
          </DataTableFilter>
        }
      />
    </Form>
  );
}
```

### URL State Management

```tsx
import { useQueryStates } from 'nuqs';

function UsersPage() {
  const [filters, setFilters] = useQueryStates({
    search: '',
    status: '',
    page: 1,
  });

  return (
    <DataTable
      columns={columns}
      data={users}
      defaultFilters={filters}
      onFiltersChange={setFilters}
      filterComponent={
        <DataTableFilter>
          <DataTableFilter.Search filterKey="search" />
          <DataTableFilter.Select filterKey="status" options={statusOptions} />
        </DataTableFilter>
      }
    />
  );
}
```

## 🎣 Hooks & Context

### useDataTable

Access the complete table and filter state from any component within the DataTable.

```tsx
import { useDataTable } from '@/modules/datum-ui/components/data-table/data-table.context';

function CustomTableControls() {
  const {
    // Table state
    table,
    columns,
    columnFilters,
    sorting,

    // Filter state
    filterState,
    setFilter,
    resetAllFilters,
    hasActiveFilters,
    getActiveFilterCount,
  } = useDataTable();

  return (
    <div className="flex items-center justify-between">
      <span>
        Showing {table.getRowModel().rows.length} of {table.getRowCount()} rows
      </span>
      {hasActiveFilters() && (
        <Button onClick={resetAllFilters} variant="outline" size="sm">
          Clear {getActiveFilterCount()} filters
        </Button>
      )}
    </div>
  );
}
```

### useDataTableFilter

Access only filter-related functionality.

```tsx
import { useDataTableFilter } from '@/modules/datum-ui/components/data-table/filter';

function FilterSummary() {
  const { filterState, hasActiveFilters, getActiveFilterCount, resetAllFilters } =
    useDataTableFilter();

  if (!hasActiveFilters()) return null;

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <span>{getActiveFilterCount()} active filters</span>
      <Button onClick={resetAllFilters} variant="link" size="sm">
        Clear all
      </Button>
    </div>
  );
}
```

## 🧪 Testing

### Basic Testing

```tsx
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { render, screen, fireEvent } from '@testing-library/react';

const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
];

const mockColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
];

test('renders table with data', () => {
  render(<DataTable columns={mockColumns} data={mockData} />);

  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('jane@example.com')).toBeInTheDocument();
});

test('handles row clicks', () => {
  const handleRowClick = jest.fn();

  render(<DataTable columns={mockColumns} data={mockData} onRowClick={handleRowClick} />);

  fireEvent.click(screen.getByText('John Doe'));
  expect(handleRowClick).toHaveBeenCalledWith(
    expect.objectContaining({
      original: mockData[0],
    })
  );
});
```

### Testing with Filters

```tsx
test('filters data correctly', async () => {
  render(
    <DataTable
      columns={mockColumns}
      data={mockData}
      filterComponent={
        <DataTableFilter>
          <DataTableFilter.Search filterKey="name" />
        </DataTableFilter>
      }
    />
  );

  const searchInput = screen.getByPlaceholderText('Search...');
  fireEvent.change(searchInput, { target: { value: 'John' } });

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });
});
```

## 📦 Component Structure

```text
data-table/
├── README.md                     # This file
├── data-table.tsx               # Main DataTable component
├── data-table.types.ts          # TypeScript interfaces
├── data-table.context.tsx       # Unified provider and hooks
├── data-table-sort.tsx          # Sort button and menu component
├── filter/                      # Filter system
│   ├── README.md               # Filter documentation
│   ├── data-table-filter.tsx  # Main filter component
│   ├── components/             # Individual filter types
│   └── ...                     # Filter utilities and tests
├── hooks/                       # Custom hooks
├── utils/                       # Utility functions
│   ├── sorting.helpers.ts      # Sorting utilities
│   └── sort-labels.ts          # Context-aware sort labels
├── data-table-header.tsx       # Table header component
├── data-table-pagination.tsx   # Pagination component
├── data-table-loading.tsx      # Loading state component
├── data-table-empty-content.tsx # Empty state component
└── data-table-row-actions.tsx  # Row actions component
```

## 🔍 Troubleshooting

### Common Issues

#### Q: Table not rendering data

```tsx
// ✅ Ensure columns have correct accessorKey
const columns = [
  { accessorKey: 'name', header: 'Name' }, // ✅ Matches data.name
  { accessorKey: 'email', header: 'Email' }, // ✅ Matches data.email
];

// ❌ Avoid typos in accessorKey
const badColumns = [
  { accessorKey: 'fullName', header: 'Name' }, // ❌ data.fullName doesn't exist
];
```

#### Q: Filters not working with table columns

```tsx
// ✅ Ensure filterKey matches column accessorKey for client-side filtering
<DataTableFilter.Search filterKey="name" />     // ✅ Matches column accessorKey
<DataTableFilter.Select filterKey="status" />   // ✅ Matches column accessorKey

// ❌ Different keys won't work for client-side filtering
<DataTableFilter.Search filterKey="search" />   // ❌ No column with accessorKey="search"
```

#### Q: Server-side filtering not triggering

```tsx
// ✅ Ensure onFiltersChange is provided with serverSideFiltering
<DataTable
  serverSideFiltering={true}
  onFiltersChange={handleFiltersChange}  // ✅ Required for server-side
  // ...
/>

// ❌ Missing onFiltersChange callback
<DataTable
  serverSideFiltering={true}
  // Missing onFiltersChange - filters won't trigger API calls
/>
```

#### Q: Performance issues with large datasets

```tsx
// ✅ Use server-side filtering for large datasets
<DataTable
  serverSideFiltering={true}
  onFiltersChange={handleApiFiltering}
  // ...
/>

// ✅ Implement pagination for large client-side data
<DataTable
  data={paginatedData}
  // Add pagination controls
/>
```

#### Q: TypeScript errors with column definitions

```tsx
// ✅ Use proper typing with ColumnDef
const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
];

// ✅ For custom cells, use proper typing
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }: { row: Row<User> }) => (
    <Badge>{row.original.status}</Badge>
  ),
}
```

## 🎯 Best Practices

### 1. **Performance Optimization**

```tsx
// ✅ Memoize column definitions
const columns = useMemo(
  () => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
  ],
  []
);

// ✅ Use server-side filtering for large datasets
const isLargeDataset = data.length > 1000;

<DataTable
  serverSideFiltering={isLargeDataset}
  onFiltersChange={isLargeDataset ? handleApiFiltering : undefined}
  // ...
/>;
```

### 2. **Accessibility**

```tsx
<DataTable
  columns={columns}
  data={data}
  tableTitle="User Management" // ✅ Provides context for screen readers
  onRowClick={handleRowClick} // ✅ Keyboard accessible
  rowActions={[
    {
      label: 'Edit User', // ✅ Descriptive labels
      onClick: handleEdit,
      'aria-label': 'Edit user', // ✅ Additional context
    },
  ]}
/>
```

### 3. **Error Handling**

```tsx
function UsersTable() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFiltersChange = async (filters) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchUsers(filters);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={() => handleFiltersChange({})} />;
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      isLoading={isLoading}
      serverSideFiltering={true}
      onFiltersChange={handleFiltersChange}
      // ...
    />
  );
}
```

### 4. **Mobile Responsiveness**

```tsx
<DataTable
  columns={columns}
  data={data}
  mode="card" // ✅ Better for mobile
  tableCardClassName="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  filterComponent={
    <DataTableFilter variant="card" collapsible={true}>
      <DataTableFilter.Search filterKey="search" />
      <DataTableFilter.Select filterKey="status" options={statusOptions} />
    </DataTableFilter>
  }
/>
```

## 🔗 Related Documentation

- [Filter System Documentation](./filter/README.md)
- [@tanstack/react-table Documentation](https://tanstack.com/table/v8)
- [nuqs Documentation](https://github.com/47ng/nuqs)

## 📦 Dependencies

- **React** 18+ (required)
- **TypeScript** 4.9+ (required)
- **@tanstack/react-table** ^8.0.0 (required)
- **nuqs** (for URL state management)
- **lucide-react** (for icons)
- **date-fns** (for date formatting)
- **Tailwind CSS** (for styling)

## 🔮 Future Enhancements

- **Virtual scrolling**: For extremely large datasets
- **Column resizing**: Interactive column width adjustment
- **Column reordering**: Drag and drop column reordering
- **Export functionality**: CSV, Excel, PDF export options
- **Advanced pagination**: Jump to page, page size selection
- **Bulk operations**: Multi-row selection and actions
- **Real-time updates**: WebSocket integration for live data
- **Data persistence**: Save table state to localStorage
- **Advanced sorting**: Multi-column sorting with priorities
- **Inline editing**: Edit cells directly in the table

The unified architecture and performance optimizations provide a solid foundation for these future enhancements while maintaining excellent developer experience and user performance.

---

---

### Built with ❤️ for modern React applications
