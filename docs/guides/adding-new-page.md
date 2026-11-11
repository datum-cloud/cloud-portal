# Adding a New Page

This guide walks through creating a new page in the cloud portal.

---

## Overview

Pages in the portal follow React Router v7 conventions:

- **File-based routing** in `app/routes/`
- **Loaders** for server-side data fetching
- **Actions** for form submissions
- **Meta exports** for page metadata

---

## Step 1: Create the Route File

### Route Location

Routes are organized by feature:

```
app/routes/
├── _auth/                    # Auth-protected routes
│   ├── organizations/        # Organization routes
│   │   └── $orgId/
│   │       └── projects/
│   │           └── $projectId/
│   │               └── your-feature/
│   │                   ├── _layout.tsx      # Layout wrapper
│   │                   ├── index.tsx        # List page
│   │                   └── $resourceId.tsx  # Detail page
```

### Route File Naming

| Pattern        | Route           | Example                 |
| -------------- | --------------- | ----------------------- |
| `index.tsx`    | Index route     | `/organizations`        |
| `$param.tsx`   | Dynamic param   | `/organizations/:orgId` |
| `_layout.tsx`  | Layout (no URL) | Wraps children          |
| `resource.tsx` | Static segment  | `/resource`             |

---

## Step 2: Basic Page Structure

```tsx
// app/routes/_auth/organizations/$orgId/projects/$projectId/widgets/index.tsx
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData } from 'react-router';

// Meta function for page title
export const meta: MetaFunction = () => {
  return [
    { title: 'Widgets | Datum Cloud' },
    { name: 'description', content: 'Manage your widgets' },
  ];
};

// Loader for data fetching
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { orgId, projectId } = params;

  // Fetch data server-side
  const widgets = await fetchWidgets(orgId, projectId);

  return { widgets, orgId, projectId };
}

// Page component
export default function WidgetsPage() {
  const { widgets, orgId, projectId } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Widgets</h1>
      <p>Organization: {orgId}</p>
      <p>Project: {projectId}</p>
      {/* Render widgets */}
    </div>
  );
}
```

---

## Step 3: Add Data Fetching

### Using React Query

```tsx
import { widgetQueries } from '@/features/widgets/queries';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { orgId, projectId } = params;

  // Return query options for client hydration
  return {
    orgId,
    projectId,
  };
}

export default function WidgetsPage() {
  const { orgId, projectId } = useLoaderData<typeof loader>();

  // Use suspense query (data required)
  const { data: widgets } = useSuspenseQuery(widgetQueries.list({ orgId, projectId }));

  return (
    <div>
      {widgets.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} />
      ))}
    </div>
  );
}
```

### Loading Data on the Server and Seeding the Cache

Loaders do not get a `QueryClient` from the server context. A resource route
fetches through the resource's service in its server `loader`, returns the
data, and the page seeds React Query with it. Use the RBAC route helpers so
permission checks, not-found handling and cache seeding stay consistent. See
`app/routes/project/detail/secrets/index.tsx` for a complete list route.

```tsx
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { createWidgetService, widgetKeys, useWidgets, type Widget } from '@/resources/widgets';
import { createProjectListClientLoaderFromQueryKey } from '@/utils/helpers/project-list-client-loader';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { type LoaderFunctionArgs, useParams } from 'react-router';

const route = defineResourceRoute<Widget[]>({
  type: 'list',
  resource: 'widgets',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view widgets.",
  metaTitle: 'Widgets',
  // Writes the loader data into the React Query cache under this key
  seedCache: ({ data, projectId }) => [[widgetKeys.list(projectId), data as Widget[]]] as never,
});

// Server loader: permission check plus a fetch through the service
export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<Widget[]>(args, {
    resource: 'widgets',
    group: 'example.datumapis.com',
    scope: 'project',
    fetch: ({ projectId }) => createWidgetService().list(projectId!),
  });

export const meta = route.meta;
export const shouldRevalidate = skipRevalidateWithinSameProject;

// On client navigation, serve the cached list instead of calling the server loader again
export const clientLoader = createProjectListClientLoaderFromQueryKey<Widget[]>((projectId) =>
  widgetKeys.list(projectId)
);

export default route.Page(({ data: initialData }) => {
  const { projectId } = useParams();
  const { data: widgets } = useWidgets(projectId ?? '', {
    initialData: initialData ?? [],
    initialDataUpdatedAt: Date.now(),
  });

  return <WidgetList widgets={widgets ?? []} />;
});
```

Detail routes follow the same shape with `type: 'detail'`, `paramName` and
`runDetailLoader` (see `app/routes/project/detail/secrets/detail/layout.tsx`).
To warm other queries from the client, call `queryClient.prefetchQuery` from a
component through `useQueryClient()`, as `app/routes/org/detail/layout.tsx`
does.

---

## Step 4: Add Page Layout

### Using Shared Components

```tsx
import { PageHeader } from '@/components/page-header';
import { Button } from '@shadcn/ui/button';
import { Plus } from 'lucide-react';

export default function WidgetsPage() {
  const { widgets } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Widgets"
        description="Manage your project widgets"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Widget
          </Button>
        }
      />

      <div className="grid gap-4">
        {widgets.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} />
        ))}
      </div>
    </div>
  );
}
```

### Empty State

```tsx
import { EmptyState } from '@/components/empty-state';

export default function WidgetsPage() {
  const { widgets } = useLoaderData<typeof loader>();

  if (widgets.length === 0) {
    return (
      <EmptyState
        icon={<WidgetIcon />}
        title="No widgets yet"
        description="Create your first widget to get started"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
        }
      />
    );
  }

  return (
    // ... render widgets
  );
}
```

---

## Step 5: Add Actions

### Form Action

```tsx
import { ActionFunctionArgs, redirect } from 'react-router';
import { z } from 'zod';

const createWidgetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function action({ params, request }: ActionFunctionArgs) {
  const { orgId, projectId } = params;
  const formData = await request.formData();

  // Validate
  const result = createWidgetSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { errors: result.error.flatten() };
  }

  // Create widget
  const widget = await createWidget({
    orgId,
    projectId,
    ...result.data,
  });

  // Redirect to new widget
  return redirect(`/organizations/${orgId}/projects/${projectId}/widgets/${widget.id}`);
}
```

### Using with Form Component

```tsx
import { Form } from '@datum-ui/components/form';

export default function CreateWidgetPage() {
  return (
    <Form.Root schema={createWidgetSchema} method="POST">
      <Form.Field name="name" label="Widget Name" required>
        <Form.Input placeholder="My Widget" />
      </Form.Field>

      <Form.Field name="description" label="Description">
        <Form.Textarea placeholder="Optional description" />
      </Form.Field>

      <Form.Submit>Create Widget</Form.Submit>
    </Form.Root>
  );
}
```

---

## Step 6: Add to Navigation (if needed)

### Sidebar Navigation

```tsx
// Update navigation configuration
// app/config/navigation.ts
export const projectNavigation = [
  // ... existing items
  {
    title: 'Widgets',
    href: '/widgets',
    icon: WidgetIcon,
  },
];
```

---

## Complete Example

```tsx
// app/routes/_auth/organizations/$orgId/projects/$projectId/widgets/index.tsx
import { columns } from './columns';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { widgetQueries } from '@/features/widgets/queries';
import { DataTable } from '@datum-ui/components/data-table';
import { Button } from '@shadcn/ui/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus, Widget } from 'lucide-react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, Link } from 'react-router';

export const meta: MetaFunction = () => {
  return [{ title: 'Widgets | Datum Cloud' }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { orgId, projectId } = params;
  return { orgId: orgId!, projectId: projectId! };
}

export default function WidgetsPage() {
  const { orgId, projectId } = useLoaderData<typeof loader>();

  const { data: widgets } = useSuspenseQuery(widgetQueries.list({ orgId, projectId }));

  if (widgets.length === 0) {
    return (
      <EmptyState
        icon={<Widget className="h-12 w-12" />}
        title="No widgets yet"
        description="Create your first widget to get started"
        action={
          <Button asChild>
            <Link to="new">
              <Plus className="mr-2 h-4 w-4" />
              Create Widget
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Widgets"
        description="Manage your project widgets"
        actions={
          <Button asChild>
            <Link to="new">
              <Plus className="mr-2 h-4 w-4" />
              Create Widget
            </Link>
          </Button>
        }
      />

      <DataTable columns={columns} data={widgets} tableTitle="Widgets" />
    </div>
  );
}
```

---

## Checklist

- [ ] Route file created in correct location
- [ ] Loader fetches required data
- [ ] Meta function sets page title
- [ ] Page uses shared layout components
- [ ] Empty state handled
- [ ] Actions for mutations (if needed)
- [ ] Navigation updated (if needed)
- [ ] TypeScript types correct

---

## Related Documentation

- [Adding New Resource](./adding-new-resource.md)
- [Project Structure](../development/project-structure.md)
- [Data Flow](../architecture/data-flow.md)
