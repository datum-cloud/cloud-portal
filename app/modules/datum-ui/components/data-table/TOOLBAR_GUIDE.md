# DataTable Toolbar Quick Reference

## API Overview

### New Unified Filter API

**Key Changes:**

- Use `filters` prop instead of `filterComponent` (auto-wrapped)
- Use `toolbar.includeSearch` instead of `toolbar.search`
- No manual `<DataTableFilter>` wrapper needed

### Toolbar Configuration

```typescript
interface DataTableToolbarConfig {
  layout?: 'stacked' | 'compact';
  includeSearch?: boolean | DataTableSearchConfig; // New: replaces 'search'
  search?: boolean | DataTableSearchConfig; // Deprecated
  filtersDisplay?: 'inline' | 'dropdown' | 'auto';
  maxInlineFilters?: number;
  primaryFilters?: string[];
  showFilterCount?: boolean;
  responsive?: boolean;
}
```

## Quick Examples

### 1. Basic: Search Only

```tsx
<DataTable
  columns={columns}
  data={data}
  tableTitle={{ title: 'Users' }}
  toolbar={{
    layout: 'compact',
    includeSearch: true, // New: was 'search'
  }}
/>
```

**Result:**

```
Users

[🔍 Search...]
```

---

### 2. Search + Inline Filters

```tsx
<DataTable
  tableTitle={{ title: 'Users', actions: <Button>Add</Button> }}
  toolbar={{
    layout: 'compact',
    includeSearch: { placeholder: 'Search users...' }, // New: was 'search'
    filtersDisplay: 'inline',
  }}
  filters={
    // New: was 'filterComponent' with <DataTableFilter> wrapper
    <>
      <DataTableFilter.Select filterKey="status" label="Status" />
      <DataTableFilter.Select filterKey="role" label="Role" />
    </>
  }
/>
```

**Result:**

```
Users

[🔍 Search users...] [Status ▼] [Role ▼]    [Add]
```

---

### 3. Search + Auto Filters (Smart)

```tsx
<DataTable
  tableTitle={{ title: 'Orders', actions: <Button>Export</Button> }}
  toolbar={{
    layout: 'compact',
    includeSearch: true, // New: was 'search'
    filtersDisplay: 'auto',
    maxInlineFilters: 2,
  }}
  filters={
    // New: no wrapper needed
    <>
      <DataTableFilter.Select filterKey="status" /> {/* Inline */}
      <DataTableFilter.Select filterKey="customer" /> {/* Inline */}
      <DataTableFilter.DatePicker filterKey="date" /> {/* Dropdown */}
      <DataTableFilter.Select filterKey="payment" /> {/* Dropdown */}
    </>
  }
/>
```

**Result:**

```
Orders

[🔍 Search...] [Status ▼] [Customer ▼]    [⚡ Filters (2)] [Export]
```

---

### 4. Dropdown Only

```tsx
<DataTable
  tableTitle={{ title: 'Products', actions: <Button>Add</Button> }}
  toolbar={{
    layout: 'compact',
    includeSearch: { placeholder: 'Search products...' }, // New: was 'search'
    filtersDisplay: 'dropdown',
  }}
  filters={
    // New: auto-wrapped
    <>
      <DataTableFilter.Select filterKey="category" />
      <DataTableFilter.Select filterKey="status" />
      <DataTableFilter.DatePicker filterKey="created" />
    </>
  }
/>
```

**Result:**

```
Products

[🔍 Search products...]    [⚡ Filters] [Add]
```

---

### 5. Tag Filter (Inline Badges)

```tsx
<DataTable
  tableTitle={{ title: 'DNS Records' }}
  columns={[
    {
      accessorKey: 'type',
      filterFn: 'arrayOr', // Required for OR logic with multi-select
    },
    // ... other columns
  ]}
  toolbar={{
    layout: 'compact',
    includeSearch: { placeholder: 'Search records...' },
    filtersDisplay: 'dropdown',
  }}
  filters={
    <DataTableFilter.Tag
      filterKey="type"
      label="Record Type"
      options={[
        { label: 'A', value: 'A' },
        { label: 'AAAA', value: 'AAAA' },
        { label: 'CNAME', value: 'CNAME' },
        { label: 'MX', value: 'MX' },
      ]}
    />
  }
/>
```

**Result:**

```
DNS Records

[🔍 Search records...]    [⚡ Filters]

Inside dropdown:
Record Type
[A] [AAAA] [CNAME ✓ ✕] [MX ✓ ✕]
```

---

### 6. Global Search (Multi-column)

```tsx
<DataTable
  tableTitle={{ title: 'Users' }}
  toolbar={{
    layout: 'compact',
    includeSearch: {
      // New: was 'search'
      mode: 'global-search',
      placeholder: 'Search across all fields...',
      searchableColumns: ['name', 'email', 'role'],
      debounce: 500,
    },
  }}
/>
```

---

### 7. Stacked Layout (Legacy Compatible)

```tsx
<DataTable
  tableTitle={{
    title: 'Users',
    description: 'Manage your team members',
    actions: <Button>Add User</Button>,
  }}
  toolbar={{
    layout: 'stacked', // Traditional layout
    includeSearch: true, // Optional: built-in search
  }}
  filters={
    // New: no wrapper needed
    <>
      <DataTableFilter.Select filterKey="status" />
    </>
  }
/>
```

**Or keep using old API (with deprecation warnings):**

```tsx
<DataTable
  tableTitle={{
    title: 'Users',
    description: 'Manage your team members',
    actions: <Button>Add User</Button>,
  }}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" />
      <DataTableFilter.Select filterKey="status" />
    </DataTableFilter>
  }
/>
```

**Result:**

```
Users                                    [Add User]
Manage your team members

[Search...] [Status ▼]
```

---

## Configuration Matrix

| Feature               | Config                                      | Result                         |
| --------------------- | ------------------------------------------- | ------------------------------ |
| **No Search**         | `includeSearch: false` or omit              | No search input                |
| **Simple Search**     | `includeSearch: true`                       | Default search (filterKey='q') |
| **Custom Search**     | `includeSearch: { placeholder, filterKey }` | Customized search              |
| **All Inline**        | `filtersDisplay: 'inline'`                  | All filters visible            |
| **All Dropdown**      | `filtersDisplay: 'dropdown'`                | All filters in menu            |
| **Smart Display**     | `filtersDisplay: 'auto'`                    | Auto-collapse excess           |
| **Max 3 Inline**      | `maxInlineFilters: 3`                       | First 3 inline, rest dropdown  |
| **Auto-wrap Filters** | `filters={<>...</>}`                        | No manual wrapper needed       |
| **OR Filter Logic**   | Column: `filterFn: 'arrayOr'`               | Multi-select uses OR matching  |

---

## Layout Comparison

### Stacked (Default)

- ✅ Traditional, familiar
- ✅ All filters always visible
- ❌ Uses more vertical space
- ❌ Actions far from filters

### Compact (New)

- ✅ Title/description at top
- ✅ Toolbar below title
- ✅ Built-in search
- ✅ Actions on same row as search
- ⚠️ Some filters may be hidden in dropdown
- ✅ Modern, space-efficient look

---

## Common Patterns

### Pattern: Dashboard Table

```tsx
toolbar={{
  layout: 'compact',
  includeSearch: true,  // New
  filtersDisplay: 'dropdown',  // Keep clean
}}
filters={<>...</>}  // New: auto-wrapped
```

### Pattern: Admin Table (Many Filters)

```tsx
toolbar={{
  layout: 'compact',
  includeSearch: { placeholder: 'Search...' },  // New
  filtersDisplay: 'auto',
  maxInlineFilters: 2,
  primaryFilters: ['status'],  // Always visible
}}
filters={<>...</>}  // New: auto-wrapped
```

### Pattern: Simple List

```tsx
toolbar={{
  layout: 'compact',
  includeSearch: true,  // New
  // No other filters
}}
```

### Pattern: Legacy/Traditional (Still Works)

```tsx
toolbar={{
  layout: 'stacked',
  // Keep current behavior
}}
filterComponent={<DataTableFilter>...</DataTableFilter>}  // Old API
```

---

## Props Reference

### DataTable Props

```typescript
interface DataTableProps {
  // New unified filter API
  filters?: ReactNode; // New: auto-wrapped filters

  // New toolbar config
  toolbar?: DataTableToolbarConfig;

  // Legacy (still supported with deprecation warnings)
  tableTitle?: {
    title?: string;
    description?: string;
    actions?: ReactNode;
  };

  filterComponent?: ReactNode; // Deprecated: use 'filters' instead
}
```

### Search Config

```typescript
interface DataTableSearchConfig {
  placeholder?: string; // Default: 'Search...'
  filterKey?: string; // Default: 'q' (only used for single-column search)
  mode?: 'search' | 'global-search'; // Default: 'global-search'
  searchableColumns?: string[]; // For global-search mode
  debounce?: number; // Default: 300ms
}
```

**Note:** The default mode is now `'global-search'` which searches across all searchable columns client-side. Use `mode: 'search'` for single-column server-side search, or set `serverSideFiltering: true` in DataTable props.

### Toolbar Config

```typescript
interface DataTableToolbarConfig {
  layout?: 'stacked' | 'compact';
  includeSearch?: boolean | DataTableSearchConfig; // New
  search?: boolean | DataTableSearchConfig; // Deprecated
  filtersDisplay?: 'inline' | 'dropdown' | 'auto';
  maxInlineFilters?: number;
  primaryFilters?: string[];
  showFilterCount?: boolean;
  responsive?: boolean;
}
```

---

## Tips

1. **Start Simple**: Use `includeSearch: true` and `filtersDisplay: 'auto'`
2. **Test Mobile**: The responsive mode auto-collapses filters
3. **Filter Count**: The badge shows active filters in dropdown
4. **Performance**: Use `debounce` for slow backends (default: 300ms)
5. **Backwards Compatible**: Old API still works - migrate gradually
6. **Multi-Select Filters**: Add `filterFn: 'arrayOr'` to column for OR logic
7. **URL Persistence**: Filters sync with URL automatically (works on page refresh)

---

## Examples in Codebase

Check these files for real examples:

- `app/features/activity-log/list.tsx` - Current implementation
- `app/features/workload/instances-table.tsx` - Table with filters
- `app/routes/org/detail/team/index.tsx` - Simple table

---

## Need Help?

1. Check [MIGRATION.md](./MIGRATION.md) for detailed migration guide
2. Review type definitions in [data-table.types.ts](./data-table.types.ts)
3. Look at component source in [data-table-toolbar.tsx](./data-table-toolbar.tsx)
