# DataTable Toolbar Migration Guide

This guide helps you migrate from the legacy DataTable API to the new unified filter system and compact toolbar layout.

## Overview

The DataTable component has been enhanced with a unified filter API:

### Key Changes

1. **Unified Filter API**: No more manual `<DataTableFilter>` wrapper needed
2. **Built-in Search**: Use `includeSearch` instead of separate `search` prop
3. **Auto-wrapping**: Filters are automatically wrapped in DataTableFilter context
4. **Two Layout Modes**:
   - **Stacked Layout** (Legacy): Traditional vertical layout with title, filters inline
   - **Compact Layout** (New): Horizontal toolbar with built-in search, smart filter display, and actions

## What's New

### ✨ New Features

1. **Unified Filter API**: Auto-wrapping of filters - no manual `<DataTableFilter>` wrapper needed
2. **Built-in Search**: Use `includeSearch` prop instead of `search`
3. **Global Search by Default**: Search now defaults to multi-column global search (client-side)
4. **Smart Filter Display**: Auto-collapse filters into dropdown on space constraints
5. **Compact Toolbar**: Horizontal layout with left (search/filters) and right (actions) sections
6. **Filter Dropdown**: Collapsible dropdown for secondary filters
7. **Responsive Design**: Auto-adapts to mobile screens

### 🔄 Breaking Changes

None! The old API continues to work with deprecation warnings. This is a **non-breaking** enhancement.

### ⚠️ Deprecated APIs

- `filterComponent` prop → Use `filters` prop instead
- `toolbar.search` → Use `toolbar.includeSearch` instead

---

## Migration Path

### Step 1: Understand Current Usage

#### Legacy API (Still Supported with Deprecation Warnings)

```tsx
<DataTable
  columns={columns}
  data={data}
  tableTitle={{
    title: 'Users',
    description: 'Manage your team',
    actions: <Button>Add User</Button>,
  }}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" placeholder="Search..." />
      <DataTableFilter.Select filterKey="status" options={statusOptions} />
      <DataTableFilter.DatePicker filterKey="date" />
    </DataTableFilter>
  }
/>
```

#### New Unified API (Recommended)

```tsx
<DataTable
  columns={columns}
  data={data}
  toolbar={{
    layout: 'compact',
    includeSearch: { placeholder: 'Search users...' },
    filtersDisplay: 'auto', // Smart: inline if ≤3, dropdown if >3
  }}
  tableTitle={{
    title: 'Users',
    description: 'Manage your team',
    actions: <Button>Add User</Button>,
  }}
  filters={
    <>
      {/* No DataTableFilter wrapper needed - auto-wrapped internally */}
      {/* No Search component needed - use includeSearch in toolbar */}
      <DataTableFilter.Select filterKey="status" options={statusOptions} />
      <DataTableFilter.DatePicker filterKey="date" />
    </>
  }
/>
```

---

## Step 2: Quick Migration Guide

### Option 1: Unified Filter API Only (Minimal Changes)

Simply replace `filterComponent` with `filters` and remove the manual `<DataTableFilter>` wrapper:

**Before:**

```tsx
<DataTable
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Select filterKey="status" />
      <DataTableFilter.DatePicker filterKey="date" />
    </DataTableFilter>
  }
/>
```

**After:**

```tsx
<DataTable
  filters={
    <>
      <DataTableFilter.Select filterKey="status" />
      <DataTableFilter.DatePicker filterKey="date" />
    </>
  }
/>
```

### Option 2: Add Built-in Search

Replace manual search filter with `includeSearch`:

**Before:**

```tsx
<DataTable
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" placeholder="Search..." />
      <DataTableFilter.Select filterKey="status" />
    </DataTableFilter>
  }
/>
```

**After:**

```tsx
<DataTable
  toolbar={{
    includeSearch: { placeholder: 'Search...', filterKey: 'q' },
  }}
  filters={
    <>
      {/* Search removed - now in toolbar */}
      <DataTableFilter.Select filterKey="status" />
    </>
  }
/>
```

### Option 3: Full Migration (Compact Layout + Unified API)

Adopt both compact layout and unified filter API:

**Before:**

```tsx
<DataTable
  tableTitle={{ title: 'Users', actions: <Button>Add</Button> }}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" />
      <DataTableFilter.Select filterKey="status" />
      <DataTableFilter.Select filterKey="role" />
      <DataTableFilter.DatePicker filterKey="date" />
    </DataTableFilter>
  }
/>
```

**After:**

```tsx
<DataTable
  tableTitle={{ title: 'Users', actions: <Button>Add</Button> }}
  toolbar={{
    layout: 'compact',
    includeSearch: { placeholder: 'Search users...' },
    filtersDisplay: 'auto',
    maxInlineFilters: 2,
  }}
  filters={
    <>
      <DataTableFilter.Select filterKey="status" />
      <DataTableFilter.Select filterKey="role" />
      <DataTableFilter.DatePicker filterKey="date" />
    </>
  }
/>
```

---

## Step 3: Detailed Migration Strategies

### Strategy A: Minimal Change (Keep Stacked Layout)

**No changes needed!** The default layout is `'stacked'`, which works exactly like before.

```tsx
// This continues to work without any changes
<DataTable
  tableTitle={{ title: 'Users', actions: <Button /> }}
  filterComponent={<DataTableFilter>...</DataTableFilter>}
/>
```

### Strategy B: Adopt Compact Layout (Recommended)

1. **Add toolbar config**
2. **Remove manual Search filter** (use built-in)
3. **Configure filter display**

**Before:**

```tsx
<DataTable
  tableTitle={{
    title: 'Users',
    description: 'Manage your users',
    actions: <Button>Add User</Button>,
  }}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" placeholder="Search users..." />
      <DataTableFilter.Select filterKey="status" options={statusOptions} />
      <DataTableFilter.Select filterKey="role" options={roleOptions} />
      <DataTableFilter.Select filterKey="department" options={deptOptions} />
      <DataTableFilter.DatePicker filterKey="createdAt" />
    </DataTableFilter>
  }
/>
```

**After:**

```tsx
<DataTable
  tableTitle={{
    title: 'Users',
    description: 'Manage your users',
    actions: <Button>Add User</Button>,
  }}
  toolbar={{
    layout: 'compact',
    search: {
      placeholder: 'Search users...',
      filterKey: 'q',
    },
    filtersDisplay: 'auto', // Auto-collapse extras to dropdown
    maxInlineFilters: 2, // Show first 2 inline, rest in dropdown
  }}
  filterComponent={
    <DataTableFilter>
      {/* Search is now built-in, remove it here */}
      <DataTableFilter.Select filterKey="status" options={statusOptions} />
      <DataTableFilter.Select filterKey="role" options={roleOptions} />
      <DataTableFilter.Select filterKey="department" options={deptOptions} />
      <DataTableFilter.DatePicker filterKey="createdAt" />
    </DataTableFilter>
  }
/>
```

---

## Step 3: Configuration Options

### Layout Modes

```tsx
toolbar={{
  layout: 'stacked',  // Legacy: vertical layout (default)
  // OR
  layout: 'compact',  // New: horizontal toolbar
}}
```

### Built-in Search

```tsx
// Simple (uses defaults)
toolbar={{
  search: true,  // filterKey='q', placeholder='Search...'
}}

// Customized
toolbar={{
  search: {
    placeholder: 'Search users...',
    filterKey: 'query',              // Custom filter key
    mode: 'global-search',           // Multi-column search
    searchableColumns: ['name', 'email'],
    debounce: 500,                   // Custom debounce (default: 300ms)
  }
}}

// Disabled
toolbar={{
  search: false,  // No search input
}}
```

### Filter Display Modes

```tsx
// Inline (legacy behavior)
toolbar={{
  filtersDisplay: 'inline',  // All filters visible
}}

// Dropdown (all filters in menu)
toolbar={{
  filtersDisplay: 'dropdown',  // All in dropdown
}}

// Auto (RECOMMENDED - smart behavior)
toolbar={{
  filtersDisplay: 'auto',
  maxInlineFilters: 3,  // Show first 3, rest in dropdown
}}
```

---

## Step 4: Visual Comparison

### Stacked Layout (Legacy)

```
┌────────────────────────────────────────┐
│ Users                        [Add User]│
│ Manage your team                       │
├────────────────────────────────────────┤
│ [Search...]                            │
│ [Status ▼] [Role ▼] [Date 📅]         │
└────────────────────────────────────────┘
```

### Compact Layout (New)

```
┌──────────────────────────────────────────────────────┐
│ [🔍 Search users...] [Status ▼]  [⚡ Filters] [Add] │
│ ← Left Section ────────────────→ Right Section ────→ │
└──────────────────────────────────────────────────────┘
Users - Manage your team
```

---

## Step 5: Common Migration Patterns

### Pattern 1: Simple Table with Search

**Before:**

```tsx
<DataTable
  columns={columns}
  data={data}
  tableTitle={{ title: 'Users' }}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" />
    </DataTableFilter>
  }
/>
```

**After:**

```tsx
<DataTable
  columns={columns}
  data={data}
  tableTitle={{ title: 'Users' }}
  toolbar={{
    layout: 'compact',
    search: true, // Built-in search
  }}
  // Remove filterComponent - no other filters needed
/>
```

### Pattern 2: Table with Search + 2-3 Filters

**Before:**

```tsx
<DataTable
  tableTitle={{ title: "Products", actions: <Button>Add</Button> }}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" />
      <DataTableFilter.Select filterKey="category" options={...} />
      <DataTableFilter.Select filterKey="status" options={...} />
    </DataTableFilter>
  }
/>
```

**After:**

```tsx
<DataTable
  tableTitle={{ title: "Products", actions: <Button>Add</Button> }}
  toolbar={{
    layout: 'compact',
    search: true,
    filtersDisplay: 'inline',  // 2 filters - show inline
  }}
  filterComponent={
    <DataTableFilter>
      {/* Search removed - now built-in */}
      <DataTableFilter.Select filterKey="category" options={...} />
      <DataTableFilter.Select filterKey="status" options={...} />
    </DataTableFilter>
  }
/>
```

### Pattern 3: Table with Many Filters

**Before:**

```tsx
<DataTable
  tableTitle={{ title: 'Orders' }}
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="q" />
      <DataTableFilter.Select filterKey="status" />
      <DataTableFilter.Select filterKey="customer" />
      <DataTableFilter.Select filterKey="product" />
      <DataTableFilter.DatePicker filterKey="orderDate" />
      <DataTableFilter.Select filterKey="paymentMethod" />
    </DataTableFilter>
  }
/>
```

**After:**

```tsx
<DataTable
  tableTitle={{ title: 'Orders' }}
  toolbar={{
    layout: 'compact',
    search: true,
    filtersDisplay: 'auto', // Auto-collapse to dropdown
    maxInlineFilters: 2, // Show first 2, rest in dropdown
    showFilterCount: true, // Show "(3)" badge on dropdown
  }}
  filterComponent={
    <DataTableFilter>
      {/* Search removed */}
      <DataTableFilter.Select filterKey="status" /> {/* Inline */}
      <DataTableFilter.Select filterKey="customer" /> {/* Inline */}
      <DataTableFilter.Select filterKey="product" /> {/* Dropdown */}
      <DataTableFilter.DatePicker filterKey="orderDate" /> {/* Dropdown */}
      <DataTableFilter.Select filterKey="paymentMethod" /> {/* Dropdown */}
    </DataTableFilter>
  }
/>
```

---

## Step 6: Advanced Configuration

### Responsive Behavior

```tsx
toolbar={{
  layout: 'compact',
  search: true,
  filtersDisplay: 'auto',
  responsive: true,  // Auto-collapse on mobile (default: true)
}}
```

### Primary Filters (Always Visible)

```tsx
toolbar={{
  layout: 'compact',
  filtersDisplay: 'auto',
  primaryFilters: ['status', 'category'],  // Always show these inline
  maxInlineFilters: 4,  // Other filters follow this limit
}}
```

### Custom Styling

```tsx
<DataTable
  toolbar={{
    layout: 'compact',
    search: true,
  }}
  // ... other props
/>

// Customize via CSS classes in DataTableToolbar if needed
```

---

## Step 7: Testing Checklist

After migration, verify:

- [ ] Search functionality works (if enabled)
- [ ] All filters are accessible (inline or dropdown)
- [ ] Filter state persists in URL
- [ ] Actions (buttons) appear correctly
- [ ] Table title and description display properly
- [ ] Responsive behavior works on mobile
- [ ] Filter dropdown opens/closes correctly
- [ ] "Clear all" filters button works
- [ ] Filter count badge shows correct number

---

## Step 8: Cleanup Deprecated Code

Once all tables are migrated, you can remove:

### Manual Search Filters

**Remove this pattern:**

```tsx
<DataTableFilter>
  <DataTableFilter.Search filterKey="q" /> {/* ← Remove */}
  <DataTableFilter.Select filterKey="status" />
</DataTableFilter>
```

**Keep only:**

```tsx
<DataTableFilter>
  <DataTableFilter.Select filterKey="status" />
</DataTableFilter>
```

### Old tableTitle Prop

**Eventually migrate from:**

```tsx
tableTitle={{ title: "Users", description: "...", actions: <Button /> }}
```

**To (optional, for consistency):**

```tsx
title="Users"
description="..."
actions={<Button />}
```

---

## Troubleshooting

### Issue: Search doesn't work

**Solution**: Ensure `filterKey` matches your API/filter state:

```tsx
toolbar={{
  search: { filterKey: 'q' }  // Must match your backend parameter
}}
```

### Issue: Filters don't appear in dropdown

**Solution**: Check `filtersDisplay` config:

```tsx
toolbar={{
  filtersDisplay: 'auto',  // or 'dropdown'
  maxInlineFilters: 2,
}}
```

### Issue: Title and actions overlap

**Solution**: Use compact layout for better space management:

```tsx
toolbar={{
  layout: 'compact',  // Horizontal layout prevents overlap
}}
```

### Issue: Need both layouts in different places

**Solution**: Keep them separate! Use stacked for some tables, compact for others:

```tsx
// Dashboard: compact
<DataTable toolbar={{ layout: 'compact' }} />

// Settings page: stacked
<DataTable toolbar={{ layout: 'stacked' }} />
```

---

## Migration Timeline Suggestion

### Phase 1 (Week 1-2): Low-Risk Tables

- Migrate simple tables (search only, no filters)
- Migrate tables with 1-2 filters

### Phase 2 (Week 3-4): Complex Tables

- Migrate tables with 3+ filters
- Test dropdown behavior thoroughly

### Phase 3 (Week 5): Cleanup

- Remove deprecated Search filters
- Verify all tables work correctly
- Update documentation

---

## Getting Help

- **Type Errors**: Check TypeScript definitions in `data-table.types.ts`
- **Layout Issues**: Try both `'stacked'` and `'compact'` to see which works better
- **Filter Behavior**: Use `filtersDisplay: 'inline'` first, then optimize with `'auto'`

---

## Summary Checklist

- [ ] Understand current DataTable usage patterns
- [ ] Choose migration strategy (keep stacked OR adopt compact)
- [ ] Add `toolbar` config to DataTable props
- [ ] Remove manual `DataTableFilter.Search` components
- [ ] Configure `filtersDisplay` mode
- [ ] Test search and filter functionality
- [ ] Verify responsive behavior
- [ ] Update related documentation
- [ ] Deploy and monitor for issues

---

**Questions?** Check the component source code or examples in the codebase.
