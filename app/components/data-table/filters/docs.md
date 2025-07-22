# DataTable Filter System

A powerful, hybrid filter system for DataTable components with individual nuqs state management and centralized utility functions. Features automatic URL persistence and server-side support.

## 🚀 Quick Start

```tsx
import { DataTable, DataTableFilter } from '@/components/data-table';

function MyTable() {
  const handleFiltersChange = (filters) => {
    console.log('Active filters:', filters);
    // Apply filters to your data or send to server
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      filters={
        <DataTableFilter onFiltersChange={handleFiltersChange}>
          <DataTableFilter.Search placeholder="Search..." filterKey="search" />
          <DataTableFilter.Select
            options={[{ label: 'Active', value: 'active' }]}
            filterKey="status"
          />
        </DataTableFilter>
      }
    />
  );
}
```

## ✨ Key Features

- **🔧 Hybrid Architecture**: Individual nuqs state + centralized utilities
- **🔗 URL Persistence**: Each filter manages its own URL state (shareable links!)
- **⚡ Auto-Debounced**: 300ms throttling prevents excessive API calls
- **🧩 Composable**: Mix and match any filter types
- **🛠️ Utility Functions**: Centralized clearAll, getActiveFilters, etc.
- **🔧 Server-Ready**: Single callback for all filter changes
- **📱 Type Safe**: Full TypeScript support
- **🎨 Flexible**: Maximum flexibility for individual filters

## 🏗️ Hybrid Architecture

Our filter system uses a **hybrid approach** that combines the best of both worlds:

### 🔧 Individual nuqs State Management

Each filter component manages its own URL state using `nuqs`:

```tsx
// Each filter has its own nuqs state
const [search, setSearch] = useQueryState(
  filterKey,
  parseAsString.withDefault('').withOptions({
    shallow: false,
    throttleMs: 300,
  })
);
```

**Benefits:**

- ✅ Maximum flexibility for each filter
- ✅ No dynamic key limitations
- ✅ Individual throttling and parsing options
- ✅ Proper TypeScript support per filter type

### 🛠️ Centralized Utility Functions

The context provides utility functions for cross-filter operations:

```tsx
// Context utilities work across all filters
const { clearAllFilters, getActiveFilters, getFilterValue } = useFilterContext();
```

**Benefits:**

- ✅ `clearAllFilters()` works across all registered filters
- ✅ `getActiveFilters()` provides unified state view
- ✅ Utility components (FilterToolbar, QuickFilter) work seamlessly
- ✅ Single `onFiltersChange` callback for server integration

### 🎯 How It Works

1. **Registration**: Each filter registers its key with the context
2. **Individual State**: Each filter manages its own nuqs state
3. **Utility Functions**: Context provides cross-filter operations
4. **Unified Callback**: Main component listens to URL changes and calls `onFiltersChange`

## 📦 Available Filters

### Search Filter

```tsx
<DataTableFilter.Search placeholder="Search tasks..." filterKey="search" />
```

### Select Dropdown

```tsx
<DataTableFilter.Select
  options={[
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ]}
  placeholder="Status"
  filterKey="status"
/>
```

### Date Picker

```tsx
<DataTableFilter.DatePicker
  placeholder="Select date"
  filterKey="date"
  mode="single" // or "range"
/>
```

### Custom Filter

```tsx
<DataTableFilter.Custom filterKey="priority">
  {({ value, onChange, onClear }) => (
    <div>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} />
      {value && <button onClick={onClear}>Clear</button>}
    </div>
  )}
</DataTableFilter.Custom>
```

## 🏛️ Context Hooks (Advanced)

For building custom filter components, the context provides utility hooks:

```tsx
import {
  useFilterContext,
  useFilterValue,
  useFilterUpdater,
  useHasActiveFilters,
} from '@/components/data-table/filters';

// Get full context with all utilities
const { clearAllFilters, getActiveFilters, getFilterValue } = useFilterContext();

// Get current filter value from URL
const searchValue = useFilterValue('search');

// Register filter and get updater (for custom components)
const updateStatus = useFilterUpdater('status');

// Check if any filters are active
const hasFilters = useHasActiveFilters();

// Example: Custom filter component
const MyCustomFilter = () => {
  // Register with context but manage own nuqs state
  useFilterUpdater('myFilter');

  const [value, setValue] = useQueryState('myFilter', parseAsString.withDefault(''));

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
};
```

**Key Points:**

- **`useFilterUpdater(key)`**: Registers filter with context (required for utilities)
- **`useFilterValue(key)`**: Reads filter value from URL state
- **`useFilterContext()`**: Access to all utility functions
- **Individual nuqs**: Each filter still manages its own URL state

## 🛠️ Utility Components

### Filter Toolbar

Shows active filters with clear buttons:

```tsx
import { FilterToolbar } from '@/components/data-table/filters';

<DataTableFilter onFiltersChange={handleFiltersChange}>
  <DataTableFilter.Search placeholder="Search..." />
  <FilterToolbar /> {/* Shows: "Search: hello [x]" */}
</DataTableFilter>;
```

### Quick Filter Buttons

Button-based filters:

```tsx
import { QuickFilter } from '@/components/data-table/filters';

<QuickFilter
  filterKey="priority"
  label="Priority"
  options={[
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
  ]}
/>;
```

## 💡 Complete Example

```tsx
import { DataTable, DataTableFilter } from '@/components/data-table';
import { FilterToolbar, QuickFilter } from '@/components/data-table/filters';
import { useState } from 'react';

function TaskManager() {
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState(false);

  const handleFiltersChange = async (filters) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });

      const response = await fetch(`/api/tasks?${params}`);
      const result = await response.json();
      setTasks(result.data);
    } catch (error) {
      console.error('Filter error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DataTable
      data={tasks}
      isLoading={loading}
      filters={
        <DataTableFilter onFiltersChange={handleFiltersChange}>
          {/* Your filters */}
        </DataTableFilter>
      }
    />
  );
}
```

## 📚 API Reference

### DataTableFilter

| Prop              | Type                                     | Description                    |
| ----------------- | ---------------------------------------- | ------------------------------ |
| `onFiltersChange` | `(filters: Record<string, any>) => void` | Called when any filter changes |
| `children`        | `ReactNode`                              | Filter components              |
| `className`       | `string?`                                | Additional CSS classes         |

### Filter Components

#### Search

| Prop          | Type      | Default       | Description            |
| ------------- | --------- | ------------- | ---------------------- |
| `filterKey`   | `string`  | `"search"`    | URL parameter name     |
| `placeholder` | `string`  | `"Search..."` | Input placeholder      |
| `className`   | `string?` | -             | Additional CSS classes |

#### Select

| Prop          | Type                               | Description            |
| ------------- | ---------------------------------- | ---------------------- |
| `filterKey`   | `string`                           | URL parameter name     |
| `options`     | `{label: string, value: string}[]` | Dropdown options       |
| `placeholder` | `string`                           | Select placeholder     |
| `className`   | `string?`                          | Additional CSS classes |

#### DatePicker

| Prop          | Type                  | Default            | Description            |
| ------------- | --------------------- | ------------------ | ---------------------- |
| `filterKey`   | `string`              | -                  | URL parameter name     |
| `mode`        | `"single" \| "range"` | `"single"`         | Date selection mode    |
| `placeholder` | `string`              | `"Select date..."` | Input placeholder      |
| `className`   | `string?`             | -                  | Additional CSS classes |

#### Custom

| Prop        | Type                                        | Description        |
| ----------- | ------------------------------------------- | ------------------ |
| `filterKey` | `string`                                    | URL parameter name |
| `children`  | `({value, onChange, onClear}) => ReactNode` | Render function    |

### Context Hooks

| Hook                    | Returns              | Description                         |
| ----------------------- | -------------------- | ----------------------------------- |
| `useFilterValue(key)`   | `any`                | Read filter value from URL state    |
| `useFilterUpdater(key)` | `void`               | Register filter key with context    |
| `useHasActiveFilters()` | `boolean`            | Whether any filters are active      |
| `useFilterContext()`    | `FilterContextValue` | Full context with utility functions |

**Note**: In the hybrid approach, `useFilterUpdater` is used for registration only. Each filter manages its own nuqs state directly.

## 🔄 Migration from Old System

### Before (Old Props)

```tsx
// ❌ Old way
<DataTable enableSearch searchPlaceholder="Search..." onSearchChange={handleSearch} />
```

### After (New Filter System)

```tsx
// ✅ New way
<DataTable
  filters={
    <DataTableFilter onFiltersChange={handleFiltersChange}>
      <DataTableFilter.Search placeholder="Search..." filterKey="search" />
    </DataTableFilter>
  }
/>
```

## 💡 Tips & Best Practices

### 🏗️ Hybrid Architecture Benefits

1. **Maximum Flexibility**: Each filter can use nuqs with its own configuration
2. **No Dynamic Key Limitations**: Unlike centralized approaches, no nuqs restrictions
3. **Individual Control**: Each filter manages throttling, parsing, and validation
4. **Centralized Utilities**: Still get `clearAllFilters()`, `getActiveFilters()`, etc.

### 🛠️ Development Tips

5. **Use descriptive filter keys**: `filterKey="userStatus"` not `filterKey="s"`
6. **Register filters**: Always call `useFilterUpdater(filterKey)` in custom components
7. **Group related filters**: Use consistent spacing and layout
8. **Show active filters**: Always include `<FilterToolbar />` for UX
9. **Handle loading states**: Show spinners during server requests
10. **URL sharing works**: Users can bookmark and share filtered views
11. **Debouncing is automatic**: Each filter has its own 300ms throttling
12. **Type safety**: Use TypeScript for better development experience
13. **Server-side ready**: Use single `onFiltersChange` callback

## 🐛 Troubleshooting

**Filters not working?**

- Make sure components are inside `<DataTableFilter>`
- Check that `onFiltersChange` is implemented
- Verify `filterKey` props are unique
- Ensure each filter calls `useFilterUpdater(filterKey)` for registration

**URL not updating?**

- Ensure `nuqs` is properly configured in your app (with NuqsAdapter)
- Check browser console for errors
- Verify each filter manages its own nuqs state

**Utility functions not working?**

- Make sure filters are registered with `useFilterUpdater(filterKey)`
- Check that you're using `useFilterContext()` to access utilities
- Verify the main `DataTableFilter` component is wrapping your filters

**TypeScript errors?**

- Import types: `import type { FilterValue } from '@/components/data-table/filters'`
- Use proper typing for filter values
- Remember: `useFilterUpdater` returns `void` in hybrid approach

Need help? Check the examples or create an issue! 🚀
