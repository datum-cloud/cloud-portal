# DataTable Component - Modern React Data Table

A powerful, feature-rich data table component built with React, TypeScript, and @tanstack/react-table. Includes advanced filtering, sorting, pagination, and state management with excellent performance and developer experience.

## 🚀 Key Features

- **🎯 Unified Architecture**: Single provider for table and filter state management
- **⚡ High Performance**: Optimized rendering with smart memoization and virtualization
- **🔍 Advanced Filtering**: Debounced search, popover filters, and clean default layouts
- **📊 Rich Data Display**: Support for table and card view modes
- **🔗 URL State Management**: Automatic synchronization with browser URL using nuqs
- **📱 Responsive Design**: Mobile-friendly with adaptive layouts
- **♿ Accessibility**: Full keyboard navigation and screen reader support
- **🎨 Highly Customizable**: Flexible styling and component composition
- **🔧 TypeScript First**: Full type safety with excellent IntelliSense
- **📈 Scalable**: Handles large datasets efficiently

## 📚 Quick Start

### Basic Usage

```tsx
import { DataTable } from '@/components/data-table';
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
import { DataTable } from '@/components/data-table';
import { DataTableFilter } from '@/components/data-table/filter';

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

## 🔍 Filtering System

The DataTable integrates seamlessly with the advanced filtering system. See the [Filter Documentation](./filter/README.md) for detailed information.

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

### Server-Side Filtering

Sends filter changes to your API for server-side processing.

```tsx
<DataTable
  columns={columns}
  data={filteredData} // Filtered data from API
  isLoading={isLoading}
  serverSideFiltering={true}
  onFiltersChange={handleApiFiltering}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="search" debounceMs={500} />
      <DataTableFilter.Select filterKey="category" options={categoryOptions} />
    </DataTableFilter>
  }
/>
```

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
      <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>
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
import { useDataTable } from '@/components/data-table/data-table.context';

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
import { useDataTableFilter } from '@/components/data-table/filter';

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
import { DataTable } from '@/components/data-table';
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
├── filter/                      # Filter system
│   ├── README.md               # Filter documentation
│   ├── data-table-filter.tsx  # Main filter component
│   ├── components/             # Individual filter types
│   └── ...                     # Filter utilities and tests
├── hooks/                       # Custom hooks
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
