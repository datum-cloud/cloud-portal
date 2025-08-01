# DataTable Filter System - Context & Compound Components

A modern, declarative filter system for React data tables using Context API and compound components pattern. Built with TypeScript, nuqs for URL state management, and full @tanstack/react-table integration.

## 🚀 Key Benefits

- **🎯 Declarative API**: Intuitive compound component pattern
- **🔗 URL State**: Automatic URL synchronization with nuqs
- **⚡ Performance**: Context-based state management with minimal re-renders
- **🎨 Flexible**: Easy customization and styling
- **📱 Responsive**: Mobile-friendly collapsible design
- **♿ Accessible**: Full keyboard navigation and screen reader support
- **🔧 Extensible**: Easy to create custom filter components

## 📚 Quick Start

### Basic Usage

```tsx
import { DataTable } from '@/components/data-table/data-table';
import { DataTableFilter } from '@/components/data-table/filter';

function MyTable() {
  const handleFiltersChange = (filters) => {
    console.log('Filters changed:', filters);
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      filterComponent={
        <DataTableFilter onFiltersChange={handleFiltersChange}>
          <DataTableFilter.Search filterKey="search" placeholder="Search..." />
          <DataTableFilter.Select filterKey="status" label="Status" options={statusOptions} />
        </DataTableFilter>
      }
    />
  );
}
```

## 🧩 Available Filter Components

### Search Filter

Text input with clear functionality and search icon.

```tsx
<DataTableFilter.Search
  filterKey="name"
  label="Search Projects"
  placeholder="Search by name..."
  description="Search across project names and descriptions"
  disabled={false}
/>
```

### Date Picker Filter

Single date or date range picker with preset options. Range mode includes default presets automatically.

```tsx
<DataTableFilter.DatePicker
  filterKey="createdAt"
  label="Created Date"
  mode="range" // 'single' | 'range'
  description="Filter by creation date"
  // Default presets included automatically for range mode:
  // Today, Yesterday, Last 7/14/30/90 days, This/Last month
  useDefaultPresets={true} // default: true
  presets={[
    // Custom presets (optional - overrides defaults)
    {
      label: 'Last 7 days',
      value: { from: new Date(), to: new Date() },
      shortcut: '7D',
    },
  ]}
/>
```

### Select Filter

Single or multi-select dropdown with search capability.

```tsx
<DataTableFilter.Select
  filterKey="category"
  label="Category"
  multiple={true}
  searchable={true}
  placeholder="Select categories..."
  options={[
    {
      label: 'Frontend',
      value: 'frontend',
      icon: <Code className="h-4 w-4" />,
      description: 'Frontend development',
    },
  ]}
/>
```

### Radio Filter

Single selection radio button group.

```tsx
<DataTableFilter.Radio
  filterKey="priority"
  label="Priority"
  options={[
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
  ]}
/>
```

### Checkbox Filter

Multi-selection checkbox group with select/clear all.

```tsx
<DataTableFilter.Checkbox
  filterKey="tags"
  label="Tags"
  options={[
    {
      label: 'React',
      value: 'react',
      description: 'React framework',
      icon: <Tag className="h-4 w-4" />,
    },
  ]}
/>
```

## 🎛️ DataTableFilter Props

| Prop              | Type                             | Default | Description             |
| ----------------- | -------------------------------- | ------- | ----------------------- |
| `children`        | `ReactNode`                      | -       | Filter components       |
| `table`           | `Table<any>`                     | -       | TanStack table instance |
| `onFiltersChange` | `(filters: FilterState) => void` | -       | Filter change callback  |
| `defaultFilters`  | `FilterState`                    | `{}`    | Default filter values   |
| `className`       | `string`                         | -       | Custom CSS classes      |
| `showHeader`      | `boolean`                        | `true`  | Show filter header      |
| `collapsible`     | `boolean`                        | `true`  | Allow collapse/expand   |
| `defaultExpanded` | `boolean`                        | `false` | Initially expanded      |

## 🎣 Hooks & Context

### useDataTableFilter

Access filter context from any child component.

```tsx
import { useDataTableFilter } from '@/components/data-table/filter';

function CustomComponent() {
  const {
    filterState,
    setFilter,
    resetFilter,
    resetAllFilters,
    hasActiveFilters,
    getActiveFilterCount,
    getFilterValue,
  } = useDataTableFilter();

  return (
    <div>
      <span>Active filters: {getActiveFilterCount()}</span>
      {hasActiveFilters() && <button onClick={resetAllFilters}>Reset All</button>}
    </div>
  );
}
```

### useFilter

Hook for individual filter components.

```tsx
import { useFilter } from '@/components/data-table/filter';

function CustomFilter({ filterKey }: { filterKey: string }) {
  const { value, setValue, reset } = useFilter<string>(filterKey);

  return <input value={value || ''} onChange={(e) => setValue(e.target.value)} onReset={reset} />;
}
```

## 🎨 Customization

### Custom Styling

Each filter component accepts a `className` prop for custom styling.

```tsx
<DataTableFilter className="border-0 shadow-none">
  <DataTableFilter.Search
    filterKey="search"
    className="md:col-span-2" // Span 2 columns on medium screens
  />
</DataTableFilter>
```

### Custom Layout

Disable header and collapsible behavior for inline layouts.

```tsx
<DataTableFilter showHeader={false} collapsible={false} className="border-0 bg-transparent">
  {/* Your filters */}
</DataTableFilter>
```

### Grid Layout

Filters automatically use CSS Grid with responsive columns:

- `sm:grid-cols-2` - 2 columns on small screens
- `lg:grid-cols-3` - 3 columns on large screens
- `xl:grid-cols-4` - 4 columns on extra large screens

## 🔧 Advanced Usage

### Creating Custom Filter Components

```tsx
import { useFilter } from '@/components/data-table/filter';

interface CustomFilterProps {
  filterKey: string;
  label?: string;
  // ... other props
}

export function CustomFilter({ filterKey, label }: CustomFilterProps) {
  const { value, setValue, reset } = useFilter<string>(filterKey);

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      {/* Your custom filter UI */}
      <YourCustomInput value={value} onChange={setValue} onClear={reset} />
    </div>
  );
}

// Use in DataTableFilter
<DataTableFilter>
  <CustomFilter filterKey="custom" label="Custom Filter" />
</DataTableFilter>;
```

### External Filter Controls

```tsx
function ExternalControls() {
  const { setFilter, resetAllFilters, hasActiveFilters } = useDataTableFilter();

  return (
    <div className="flex gap-2">
      <button onClick={() => setFilter('status', 'active')}>Show Active Only</button>
      {hasActiveFilters() && <button onClick={resetAllFilters}>Reset All</button>}
    </div>
  );
}

<DataTableFilter>
  {/* Regular filters */}
  <ExternalControls />
</DataTableFilter>;
```

## 🧪 Testing

### Testing Filter Components

```tsx
import { DataTableFilter } from '@/components/data-table/filter';
import { render, screen, fireEvent } from '@testing-library/react';

test('search filter updates value', () => {
  const handleChange = jest.fn();

  render(
    <DataTableFilter onFiltersChange={handleChange}>
      <DataTableFilter.Search filterKey="search" />
    </DataTableFilter>
  );

  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'test' } });

  expect(handleChange).toHaveBeenCalledWith({ search: 'test' });
});
```

### Testing with React Table

```tsx
import { useReactTable } from '@tanstack/react-table';

test('filters integrate with react table', () => {
  const table = useReactTable({
    data: mockData,
    columns: mockColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  render(
    <DataTableFilter table={table}>
      <DataTableFilter.Search filterKey="name" />
    </DataTableFilter>
  );

  // Test that table.getColumn('name').setFilterValue is called
});
```

## 🔍 Troubleshooting

### Common Issues

**Q: Filters not syncing with URL**

```tsx
// Ensure you're using the correct filterKey
<DataTableFilter.Search filterKey="search" /> // ✅ Correct
<DataTableFilter.Search key="search" />       // ❌ Wrong prop
```

**Q: TypeScript errors with filter values**

```tsx
// Use typed hooks for better type safety
const { value, setValue } = useFilter<string[]>('multiSelect');
```

**Q: Filters not updating table**

```tsx
// Pass table instance to DataTableFilter
<DataTableFilter table={table}>
```

**Q: Custom components not accessing context**

```tsx
// Ensure custom components are inside DataTableFilter
<DataTableFilter>
  <MyCustomFilter /> {/* ✅ Can access context */}
</DataTableFilter>
<MyCustomFilter /> {/* ❌ Cannot access context */}
```

## 📦 Dependencies

- React 18+
- TypeScript 4.9+
- `@tanstack/react-table`
- `nuqs` for URL state management
- `lucide-react` for icons
- `date-fns` for date formatting

## 🔮 Future Enhancements

- **Filter presets**: Save and load filter configurations
- **Advanced date ranges**: Calendar popup with advanced date selection
- **Filter groups**: Logical grouping with AND/OR operators
- **Filter validation**: Built-in validation for filter values
- **Filter persistence**: Local storage for user preferences
- **Performance optimizations**: Virtual scrolling for large option lists

## 📄 License

This filter system is part of the cloud-portal project and follows the same license terms.
