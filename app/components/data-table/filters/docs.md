# DataTable Filter System

A powerful, centralized filter system for DataTable components with automatic URL persistence and server-side support.

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

- **🎯 Centralized State**: All filter state managed in one place
- **🔗 URL Persistence**: Filters automatically saved to URL (shareable links!)
- **⚡ Auto-Debounced**: 300ms throttling prevents excessive API calls
- **🧩 Composable**: Mix and match any filter types
- **🔧 Server-Ready**: Single callback for all filter changes
- **📱 Type Safe**: Full TypeScript support
- **🎨 Customizable**: Easy to create custom filters

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

## 🎛️ Context Hooks (Advanced)

For building custom filter components:

```tsx
import {
  useFilterValue,
  useFilterUpdater,
  useFilterClearer,
  useHasActiveFilters,
} from '@/components/data-table/filters';

// Get current filter value
const searchValue = useFilterValue('search');

// Get updater function
const updateStatus = useFilterUpdater('status');

// Get clearer function
const clearSearch = useFilterClearer('search');

// Check if any filters active
const hasFilters = useHasActiveFilters();
```

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

| Hook                    | Returns                | Description                    |
| ----------------------- | ---------------------- | ------------------------------ |
| `useFilterValue(key)`   | `any`                  | Current filter value           |
| `useFilterUpdater(key)` | `(value: any) => void` | Update function                |
| `useFilterClearer(key)` | `() => void`           | Clear function                 |
| `useHasActiveFilters()` | `boolean`              | Whether any filters are active |
| `useFilterContext()`    | `FilterContextValue`   | Full context object            |

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

1. **Use descriptive filter keys**: `filterKey="userStatus"` not `filterKey="s"`
2. **Group related filters**: Use consistent spacing and layout
3. **Show active filters**: Always include `<FilterToolbar />` for UX
4. **Handle loading states**: Show spinners during server requests
5. **URL sharing works**: Users can bookmark and share filtered views
6. **Debouncing is automatic**: No need to implement your own throttling
7. **Type safety**: Use TypeScript for better development experience
8. **Server-side ready**: Use single `onFiltersChange` callback

## 🐛 Troubleshooting

**Filters not working?**

- Make sure components are inside `<DataTableFilter>`
- Check that `onFiltersChange` is implemented
- Verify `filterKey` props are unique

**URL not updating?**

- Ensure `nuqs` is properly configured in your app
- Check browser console for errors

**TypeScript errors?**

- Import types: `import type { FilterValue } from '@/components/data-table/filters'`
- Use proper typing for filter values

Need help? Check the examples or create an issue! 🚀
