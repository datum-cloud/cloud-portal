# datum-ui Component Guide

This document covers Datum's component library built on shadcn/ui primitives.

---

## What is datum-ui?

datum-ui is Datum's design system containing:

- Composed components (DataTable, Form)
- Datum-specific variants (Badge, Alert)
- Business logic components (Stepper, Grid)

**Future:** Will be extracted to `@datum/ui` npm package for sharing across portals.

---

## Location

```
app/modules/datum-ui/
├── components/
│   ├── alert/
│   ├── avatar-stack/
│   ├── badge/
│   ├── button/
│   ├── calendar/
│   ├── card/
│   ├── data-table/          # Complex - has own README
│   ├── dialog/
│   ├── dropdown/
│   ├── form/                 # Legacy form
│   ├── grid/
│   ├── input-number/
│   ├── input-with-addons/
│   ├── new-form/             # New form library
│   ├── nprogress/
│   ├── sidebar/
│   ├── stepper/
│   ├── tabs/
│   ├── tag-input/
│   ├── toast/
│   └── tooltip/
├── datum-ui.css
└── index.ts
```

---

## Import Patterns

```typescript
// Named imports from components
import { Badge, Alert, Button } from '@datum-ui/components';
// Direct component imports (for complex components)
import { DataTable } from '@datum-ui/components/data-table';
import { Row, Col } from '@datum-ui/components/grid';
import { Form } from '@datum-ui/components/new-form';
```

---

## Key Components

### DataTable

Full-featured data table with filtering, sorting, and pagination.

```tsx
import { DataTable } from '@datum-ui/components/data-table';
import { DataTableFilter } from '@datum-ui/components/data-table/features/filter';

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
];

<DataTable
  columns={columns}
  data={data}
  tableTitle="Organizations"
  filterComponent={
    <DataTableFilter>
      <DataTableFilter.Search filterKey="name" placeholder="Search..." />
      <DataTableFilter.Select
        filterKey="status"
        options={[
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ]}
      />
    </DataTableFilter>
  }
/>;
```

**Features:**

- Client-side and server-side filtering
- URL state synchronization
- Sorting with custom labels
- Pagination
- Row actions
- Card mode for mobile

→ Full docs: `app/modules/datum-ui/components/data-table/README.md`

### Form Library

Compound component form with Conform.js + Zod validation.

```tsx
import { Form } from '@datum-ui/components/new-form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

<Form.Root schema={schema} onSubmit={handleSubmit}>
  <Form.Field name="name" label="Name" required>
    <Form.Input />
  </Form.Field>

  <Form.Field name="email" label="Email" required>
    <Form.Input type="email" />
  </Form.Field>

  <Form.Submit>Save</Form.Submit>
</Form.Root>;
```

**Features:**

- Schema-based validation
- Auto error display
- Loading states
- Multi-step forms
- Field arrays
- Conditional fields

→ Full docs: `app/modules/datum-ui/components/new-form/README.md`
→ See also: [Forms Guide](./forms.md)

### Badge

Status badges with semantic variants.

```tsx
import { Badge } from '@datum-ui/components';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">Processing</Badge>
<Badge variant="default">Draft</Badge>
```

### Alert

Alert messages with variants.

```tsx
import { Alert } from '@datum-ui/components';

<Alert variant="info" title="Information">
  This is an informational message.
</Alert>

<Alert variant="warning" title="Warning">
  Please review before continuing.
</Alert>

<Alert variant="error" title="Error">
  Something went wrong.
</Alert>

<Alert variant="success" title="Success">
  Operation completed successfully.
</Alert>
```

### Grid System

Responsive grid layout based on 24-column grid.

```tsx
import { Row, Col } from '@datum-ui/components/grid';

<Row gutter={16}>
  <Col span={24} md={12} lg={6}>
    Quarter on large screens
  </Col>
  <Col span={24} md={12} lg={6}>
    Quarter on large screens
  </Col>
  <Col span={24} md={12} lg={6}>
    Quarter on large screens
  </Col>
  <Col span={24} md={12} lg={6}>
    Quarter on large screens
  </Col>
</Row>;
```

**Breakpoints:**

- `xs`: < 576px
- `sm`: ≥ 576px
- `md`: ≥ 768px
- `lg`: ≥ 992px
- `xl`: ≥ 1200px
- `xxl`: ≥ 1600px

### Stepper

Step indicator for multi-step flows.

```tsx
import { Stepper } from '@datum-ui/components/stepper';

<Stepper
  steps={[
    { id: 'details', label: 'Details' },
    { id: 'config', label: 'Configuration' },
    { id: 'review', label: 'Review' },
  ]}
  currentStep="config"
/>;
```

### Toast Notifications

Toast notifications via Sonner.

```tsx
import { toast } from 'sonner';

// Success
toast.success('Organization created');

// Error
toast.error('Failed to save');

// With description
toast.success('DNS Zone Created', {
  description: 'Your zone is now active.',
});

// Promise toast
toast.promise(saveData(), {
  loading: 'Saving...',
  success: 'Saved!',
  error: 'Failed to save',
});
```

### AvatarStack

Stacked avatars for showing multiple users.

```tsx
import { AvatarStack } from '@datum-ui/components';

<AvatarStack
  avatars={[
    { name: 'John Doe', src: '/avatars/john.jpg' },
    { name: 'Jane Smith', src: '/avatars/jane.jpg' },
    { name: 'Bob Wilson' }, // Fallback to initials
  ]}
  max={3}
/>;
```

---

## When to Add to datum-ui

### ✅ Add to datum-ui when:

- Component is **reusable across portals** (cloud-portal, staff-portal)
- Has **Datum-specific variants** or business logic
- **Extends shadcn** with additional functionality
- Needs **consistent behavior** across the ecosystem

### ❌ Keep in app/components when:

- **Page-specific** component
- **Cloud-portal only** functionality
- **One-off** usage
- Contains **app-specific** business logic

---

## Creating New datum-ui Components

### Folder Structure

```
app/modules/datum-ui/components/{component-name}/
├── index.ts              # Exports
├── {component}.tsx       # Main component
├── {component}.types.ts  # TypeScript types (optional)
└── README.md             # Documentation (recommended)
```

### Example: StatusIndicator

```typescript
// app/modules/datum-ui/components/status-indicator/status-indicator.tsx
import { cn } from '@shadcn/lib/utils';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'pending' | 'error';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  pending: 'bg-yellow-500',
  error: 'bg-red-500',
};

const sizes = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusIndicator({
  status,
  label,
  size = 'md',
}: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'rounded-full',
          statusColors[status],
          sizes[size]
        )}
      />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
```

```typescript
// app/modules/datum-ui/components/status-indicator/index.ts
export { StatusIndicator } from './status-indicator';
export type { StatusIndicatorProps } from './status-indicator';
```

### Add to Components Index

```typescript
// app/modules/datum-ui/components/index.ts
export * from './status-indicator';
```

---

## Component Documentation

Complex components have their own README:

- `data-table/README.md` - DataTable with filtering
- `data-table/TOOLBAR_GUIDE.md` - Toolbar customization
- `new-form/README.md` - Form library
- `grid/README.md` - Grid system
- `badge/README.md` - Badge variants

Always check these before using complex components.

---

## Related Documentation

- [UI Overview](./overview.md) - Component hierarchy
- [shadcn Rules](./shadcn-rules.md) - Base primitives
- [Forms Guide](./forms.md) - Form patterns
- [Adding New Component](../guides/adding-new-component.md)
