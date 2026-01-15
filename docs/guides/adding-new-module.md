# Adding a New Module

This guide walks through adding a new feature module to the portal.

---

## Overview

The portal uses a feature-based module structure:

```
app/features/{feature-name}/
├── components/           # Feature-specific components
├── hooks/               # Feature-specific hooks
├── utils/               # Feature utilities
├── types.ts             # Feature types
└── index.ts             # Public exports
```

---

## When to Create a Module

Create a new feature module when:

- Building a **new product feature** (DNS, Compute, Storage)
- Feature has **multiple pages** and **shared components**
- Feature needs **isolated state** and **business logic**
- Components won't be reused outside this feature

---

## Step 1: Create Module Structure

```bash
# Create the feature directory
mkdir -p app/features/widgets
mkdir -p app/features/widgets/components
mkdir -p app/features/widgets/hooks
mkdir -p app/features/widgets/utils
```

### Basic Structure

```
app/features/widgets/
├── components/
│   ├── widget-card.tsx
│   ├── widget-form.tsx
│   ├── widget-list.tsx
│   └── index.ts
├── hooks/
│   ├── use-widget-actions.ts
│   └── index.ts
├── utils/
│   ├── widget-helpers.ts
│   └── index.ts
├── types.ts
└── index.ts
```

---

## Step 2: Define Types

```typescript
// app/features/widgets/types.ts
import type { WidgetModel } from '@/resources/widgets';

// Feature-specific types
export interface WidgetCardProps {
  widget: WidgetModel;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface WidgetFormValues {
  name: string;
  displayName: string;
  description?: string;
  type: 'basic' | 'advanced' | 'premium';
  enabled: boolean;
}

export interface WidgetListFilters {
  search?: string;
  type?: string;
  status?: string;
}
```

---

## Step 3: Create Components

### Widget Card

```tsx
// app/features/widgets/components/widget-card.tsx
import { Card, CardHeader, CardContent, CardFooter } from '@shadcn/ui/card';
import { Badge } from '@datum-ui/components';
import { Button } from '@shadcn/ui/button';
import { MoreHorizontal, Edit, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@shadcn/ui/dropdown-menu';
import type { WidgetCardProps } from '../types';

const statusVariants = {
  active: 'success',
  pending: 'warning',
  failed: 'error',
  terminating: 'default',
} as const;

export function WidgetCard({ widget, onEdit, onDelete }: WidgetCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h3 className="font-semibold">{widget.displayName}</h3>
          <p className="text-sm text-muted-foreground">{widget.name}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <p className="text-sm">{widget.description || 'No description'}</p>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Badge variant={statusVariants[widget.status]}>
          {widget.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {widget.type}
        </span>
      </CardFooter>
    </Card>
  );
}
```

### Widget Form

```tsx
// app/features/widgets/components/widget-form.tsx
import { Form } from '@datum-ui/components/new-form';
import { z } from 'zod';
import type { WidgetFormValues } from '../types';

const schema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  type: z.enum(['basic', 'advanced', 'premium']),
  enabled: z.boolean().default(true),
});

interface WidgetFormProps {
  defaultValues?: Partial<WidgetFormValues>;
  onSubmit: (values: WidgetFormValues) => Promise<void>;
  isEditing?: boolean;
}

export function WidgetForm({
  defaultValues,
  onSubmit,
  isEditing = false,
}: WidgetFormProps) {
  return (
    <Form.Root
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      <div className="space-y-4">
        <Form.Field name="name" label="Name" required disabled={isEditing}>
          <Form.Input placeholder="my-widget" />
        </Form.Field>

        <Form.Field name="displayName" label="Display Name" required>
          <Form.Input placeholder="My Widget" />
        </Form.Field>

        <Form.Field name="description" label="Description">
          <Form.Textarea placeholder="Optional description" rows={3} />
        </Form.Field>

        <Form.Field name="type" label="Type" required>
          <Form.Select placeholder="Select type">
            <Form.SelectItem value="basic">Basic</Form.SelectItem>
            <Form.SelectItem value="advanced">Advanced</Form.SelectItem>
            <Form.SelectItem value="premium">Premium</Form.SelectItem>
          </Form.Select>
        </Form.Field>

        <Form.Field name="enabled" label="Enabled">
          <Form.Switch />
        </Form.Field>

        <Form.Submit loadingText="Saving...">
          {isEditing ? 'Update Widget' : 'Create Widget'}
        </Form.Submit>
      </div>
    </Form.Root>
  );
}
```

### Widget List

```tsx
// app/features/widgets/components/widget-list.tsx
import { DataTable } from '@datum-ui/components/data-table';
import { DataTableFilter } from '@datum-ui/components/data-table/features/filter';
import { Badge } from '@datum-ui/components';
import type { WidgetModel } from '@/resources/widgets';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<WidgetModel>[] = [
  {
    accessorKey: 'displayName',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.displayName}</p>
        <p className="text-xs text-muted-foreground">{row.original.name}</p>
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'active' ? 'success' : 'default'}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => row.original.createdAt.toLocaleDateString(),
  },
];

interface WidgetListProps {
  widgets: WidgetModel[];
}

export function WidgetList({ widgets }: WidgetListProps) {
  return (
    <DataTable
      columns={columns}
      data={widgets}
      tableTitle="Widgets"
      filterComponent={
        <DataTableFilter>
          <DataTableFilter.Search
            filterKey="displayName"
            placeholder="Search widgets..."
          />
          <DataTableFilter.Select
            filterKey="type"
            placeholder="Type"
            options={[
              { label: 'Basic', value: 'basic' },
              { label: 'Advanced', value: 'advanced' },
              { label: 'Premium', value: 'premium' },
            ]}
          />
          <DataTableFilter.Select
            filterKey="status"
            placeholder="Status"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Pending', value: 'pending' },
              { label: 'Failed', value: 'failed' },
            ]}
          />
        </DataTableFilter>
      }
    />
  );
}
```

### Component Exports

```typescript
// app/features/widgets/components/index.ts
export { WidgetCard } from './widget-card';
export { WidgetForm } from './widget-form';
export { WidgetList } from './widget-list';
```

---

## Step 4: Create Hooks

```typescript
// app/features/widgets/hooks/use-widget-actions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createWidgetService, widgetQueries } from '@/resources/widgets';
import type { WidgetFormValues } from '../types';

interface UseWidgetActionsParams {
  orgId: string;
  projectId: string;
}

export function useWidgetActions({ orgId, projectId }: UseWidgetActionsParams) {
  const queryClient = useQueryClient();
  const service = createWidgetService({ orgId, projectId });
  const queryKey = widgetQueries.lists({ orgId, projectId });

  const createMutation = useMutation({
    mutationFn: (values: WidgetFormValues) => service.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Widget created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create widget', {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, values }: { name: string; values: Partial<WidgetFormValues> }) =>
      service.update(name, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Widget updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update widget', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => service.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Widget deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete widget', {
        description: error.message,
      });
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

### Hook Exports

```typescript
// app/features/widgets/hooks/index.ts
export { useWidgetActions } from './use-widget-actions';
```

---

## Step 5: Create Utilities

```typescript
// app/features/widgets/utils/widget-helpers.ts
import type { WidgetModel } from '@/resources/widgets';

export function getWidgetStatusColor(status: WidgetModel['status']) {
  const colors = {
    active: 'text-green-500',
    pending: 'text-yellow-500',
    failed: 'text-red-500',
    terminating: 'text-gray-500',
  };
  return colors[status];
}

export function formatWidgetType(type: WidgetModel['type']) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function sortWidgetsByCreated(widgets: WidgetModel[]) {
  return [...widgets].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}
```

### Utility Exports

```typescript
// app/features/widgets/utils/index.ts
export * from './widget-helpers';
```

---

## Step 6: Create Module Index

```typescript
// app/features/widgets/index.ts
// Components
export * from './components';

// Hooks
export * from './hooks';

// Utilities
export * from './utils';

// Types
export * from './types';
```

---

## Step 7: Create Routes

Create corresponding routes in `app/routes/`:

```
app/routes/_auth/organizations/$orgId/projects/$projectId/widgets/
├── _layout.tsx      # Optional layout
├── index.tsx        # List page
├── new.tsx          # Create page
└── $widgetName.tsx  # Detail/edit page
```

---

## Complete Module Structure

```
app/features/widgets/
├── components/
│   ├── widget-card.tsx       # Card display
│   ├── widget-form.tsx       # Create/edit form
│   ├── widget-list.tsx       # Table list
│   └── index.ts              # Component exports
├── hooks/
│   ├── use-widget-actions.ts # CRUD mutations
│   └── index.ts              # Hook exports
├── utils/
│   ├── widget-helpers.ts     # Helper functions
│   └── index.ts              # Utility exports
├── types.ts                  # Feature types
└── index.ts                  # Public API
```

---

## Usage in Routes

```tsx
// app/routes/_auth/.../widgets/index.tsx
import { WidgetList, useWidgetActions } from '@/features/widgets';
import { useWidgets } from '@/resources/widgets';

export default function WidgetsPage() {
  const { orgId, projectId } = useParams();
  const { data: widgets } = useWidgets({ orgId, projectId });

  return <WidgetList widgets={widgets} />;
}
```

---

## Checklist

- [ ] Module directory created in `app/features/`
- [ ] Types defined in `types.ts`
- [ ] Components created and exported
- [ ] Hooks created for mutations
- [ ] Utilities for shared logic
- [ ] Index file exports public API
- [ ] Routes created for pages

---

## Related Documentation

- [Adding New Resource](./adding-new-resource.md) - Resource layer
- [Adding New Page](./adding-new-page.md) - Route setup
- [Project Structure](../development/project-structure.md) - Overall structure
