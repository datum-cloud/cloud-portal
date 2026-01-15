# Adding a New Resource

This guide walks through adding a new Kubernetes-based resource to the portal.

---

## Overview

Resources in the portal follow a domain-driven architecture:

```
app/resources/{resource-name}/
├── schema.ts           # Zod schema + TypeScript types
├── adapter.ts          # API response → domain model
├── service.ts          # API client methods
├── queries.ts          # React Query definitions
└── watch.ts            # Real-time subscription (optional)
```

---

## Prerequisites

1. OpenAPI spec available for the resource
2. Understanding of the K8s resource structure
3. Familiarity with React Query

---

## Step 1: Generate OpenAPI Types

### Fetch the OpenAPI Spec

```bash
# Determine the API endpoint for your resource
# User-scoped: /apis/{group}/v1alpha1/users/{userId}/control-plane/openapi/v3/apis/{group}/v1alpha1
# Org-scoped: /apis/{group}/v1alpha1/users/{userId}/organizations/{orgId}/control-plane/openapi/v3/apis/{group}/v1alpha1
# Project-scoped: Similar pattern with projectId

# Example: Fetch widgets spec
curl -H "Authorization: Bearer $TOKEN" \
  "$API_URL/apis/widgets.datum.net/v1alpha1/users/$USER_ID/control-plane/openapi/v3/apis/widgets.datum.net/v1alpha1" \
  > specs/widgets.json
```

### Add to Generation Config

```typescript
// openapi-ts.config.ts
export default [
  // ... existing configs
  {
    input: './specs/widgets.json',
    output: {
      path: './app/api/generated/widgets',
      format: 'prettier',
    },
    plugins: ['@hey-api/typescript', '@hey-api/sdk'],
  },
];
```

### Generate Types

```bash
bun run generate:api
```

---

## Step 2: Create the Schema

```typescript
// app/resources/widgets/schema.ts
import { z } from 'zod';

// K8s metadata schema (reusable)
const metadataSchema = z.object({
  name: z.string(),
  namespace: z.string().optional(),
  uid: z.string(),
  resourceVersion: z.string(),
  creationTimestamp: z.string(),
  labels: z.record(z.string()).optional(),
  annotations: z.record(z.string()).optional(),
});

// Widget spec schema
const widgetSpecSchema = z.object({
  displayName: z.string(),
  description: z.string().optional(),
  type: z.enum(['basic', 'advanced', 'premium']),
  config: z.object({
    enabled: z.boolean(),
    settings: z.record(z.unknown()).optional(),
  }),
});

// Widget status schema
const widgetStatusSchema = z.object({
  phase: z.enum(['Pending', 'Active', 'Failed', 'Terminating']),
  conditions: z.array(z.object({
    type: z.string(),
    status: z.enum(['True', 'False', 'Unknown']),
    reason: z.string().optional(),
    message: z.string().optional(),
    lastTransitionTime: z.string().optional(),
  })).optional(),
});

// Complete widget schema
export const widgetSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Widget'),
  metadata: metadataSchema,
  spec: widgetSpecSchema,
  status: widgetStatusSchema.optional(),
});

// List response schema
export const widgetListSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('WidgetList'),
  metadata: z.object({
    resourceVersion: z.string(),
  }),
  items: z.array(widgetSchema),
});

// Export types
export type Widget = z.infer<typeof widgetSchema>;
export type WidgetList = z.infer<typeof widgetListSchema>;
export type WidgetSpec = z.infer<typeof widgetSpecSchema>;
export type WidgetStatus = z.infer<typeof widgetStatusSchema>;
```

---

## Step 3: Create the Adapter

```typescript
// app/resources/widgets/adapter.ts
import type { Widget, WidgetList } from './schema';
import { widgetSchema, widgetListSchema } from './schema';

// Domain model (what components use)
export interface WidgetModel {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: 'basic' | 'advanced' | 'premium';
  enabled: boolean;
  status: 'pending' | 'active' | 'failed' | 'terminating';
  createdAt: Date;
  resourceVersion: string;
}

// Transform API response to domain model
export function toWidgetModel(widget: Widget): WidgetModel {
  return {
    id: widget.metadata.uid,
    name: widget.metadata.name,
    displayName: widget.spec.displayName,
    description: widget.spec.description,
    type: widget.spec.type,
    enabled: widget.spec.config.enabled,
    status: widget.status?.phase?.toLowerCase() as WidgetModel['status'] ?? 'pending',
    createdAt: new Date(widget.metadata.creationTimestamp),
    resourceVersion: widget.metadata.resourceVersion,
  };
}

// Transform list response
export function toWidgetModels(response: WidgetList): WidgetModel[] {
  return response.items.map(toWidgetModel);
}

// Validate and transform (for API responses)
export function parseWidget(data: unknown): WidgetModel {
  const validated = widgetSchema.parse(data);
  return toWidgetModel(validated);
}

export function parseWidgetList(data: unknown): WidgetModel[] {
  const validated = widgetListSchema.parse(data);
  return toWidgetModels(validated);
}
```

---

## Step 4: Create the Service

```typescript
// app/resources/widgets/service.ts
import { createApiClient } from '@/lib/api-client';
import { parseWidget, parseWidgetList, type WidgetModel } from './adapter';

interface WidgetServiceParams {
  orgId: string;
  projectId: string;
}

export function createWidgetService(params: WidgetServiceParams) {
  const { orgId, projectId } = params;
  const client = createApiClient();

  const basePath = `/apis/widgets.datum.net/v1alpha1/organizations/${orgId}/projects/${projectId}/widgets`;

  return {
    // List all widgets
    async list(): Promise<WidgetModel[]> {
      const response = await client.get(basePath);
      return parseWidgetList(response.data);
    },

    // Get single widget
    async get(name: string): Promise<WidgetModel> {
      const response = await client.get(`${basePath}/${name}`);
      return parseWidget(response.data);
    },

    // Create widget
    async create(spec: {
      name: string;
      displayName: string;
      description?: string;
      type: 'basic' | 'advanced' | 'premium';
      enabled: boolean;
    }): Promise<WidgetModel> {
      const response = await client.post(basePath, {
        apiVersion: 'widgets.datum.net/v1alpha1',
        kind: 'Widget',
        metadata: { name: spec.name },
        spec: {
          displayName: spec.displayName,
          description: spec.description,
          type: spec.type,
          config: { enabled: spec.enabled },
        },
      });
      return parseWidget(response.data);
    },

    // Update widget
    async update(name: string, spec: Partial<{
      displayName: string;
      description: string;
      type: 'basic' | 'advanced' | 'premium';
      enabled: boolean;
    }>): Promise<WidgetModel> {
      // Get current version for optimistic concurrency
      const current = await this.get(name);

      const response = await client.put(`${basePath}/${name}`, {
        apiVersion: 'widgets.datum.net/v1alpha1',
        kind: 'Widget',
        metadata: {
          name,
          resourceVersion: current.resourceVersion,
        },
        spec: {
          displayName: spec.displayName ?? current.displayName,
          description: spec.description ?? current.description,
          type: spec.type ?? current.type,
          config: { enabled: spec.enabled ?? current.enabled },
        },
      });
      return parseWidget(response.data);
    },

    // Delete widget
    async delete(name: string): Promise<void> {
      await client.delete(`${basePath}/${name}`);
    },
  };
}

export type WidgetService = ReturnType<typeof createWidgetService>;
```

---

## Step 5: Create Query Definitions

```typescript
// app/resources/widgets/queries.ts
import { queryOptions } from '@tanstack/react-query';
import { createWidgetService, type WidgetModel } from './service';

interface WidgetQueryParams {
  orgId: string;
  projectId: string;
}

export const widgetQueries = {
  // Query key factory
  all: (params: WidgetQueryParams) =>
    ['widgets', params.orgId, params.projectId] as const,

  lists: (params: WidgetQueryParams) =>
    [...widgetQueries.all(params), 'list'] as const,

  list: (params: WidgetQueryParams) =>
    queryOptions({
      queryKey: widgetQueries.lists(params),
      queryFn: () => createWidgetService(params).list(),
      staleTime: 30_000, // 30 seconds
    }),

  details: (params: WidgetQueryParams) =>
    [...widgetQueries.all(params), 'detail'] as const,

  detail: (params: WidgetQueryParams & { name: string }) =>
    queryOptions({
      queryKey: [...widgetQueries.details(params), params.name] as const,
      queryFn: () => createWidgetService(params).get(params.name),
      staleTime: 30_000,
    }),
};

// Mutation helpers
export function useWidgetMutations(params: WidgetQueryParams) {
  const service = createWidgetService(params);

  return {
    create: service.create,
    update: service.update,
    delete: service.delete,
  };
}
```

---

## Step 6: Add Watch Support (Optional)

```typescript
// app/resources/widgets/watch.ts
import { createWatchConnection, type WatchEvent } from '@/lib/watch';
import { parseWidget, type WidgetModel } from './adapter';

interface WidgetWatchParams {
  orgId: string;
  projectId: string;
  onEvent: (event: WatchEvent<WidgetModel>) => void;
  onError?: (error: Error) => void;
}

export function watchWidgets(params: WidgetWatchParams) {
  const { orgId, projectId, onEvent, onError } = params;

  const watchPath = `/apis/widgets.datum.net/v1alpha1/organizations/${orgId}/projects/${projectId}/widgets`;

  return createWatchConnection({
    path: `${watchPath}?watch=true`,
    onEvent: (rawEvent) => {
      const event: WatchEvent<WidgetModel> = {
        type: rawEvent.type,
        object: parseWidget(rawEvent.object),
      };
      onEvent(event);
    },
    onError,
  });
}
```

---

## Step 7: Create React Query Hook with Watch

```typescript
// app/resources/widgets/use-widgets.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { widgetQueries } from './queries';
import { watchWidgets } from './watch';
import type { WidgetModel } from './adapter';

interface UseWidgetsParams {
  orgId: string;
  projectId: string;
  watch?: boolean;
}

export function useWidgets({ orgId, projectId, watch = true }: UseWidgetsParams) {
  const queryClient = useQueryClient();
  const queryKey = widgetQueries.lists({ orgId, projectId });

  const query = useQuery(widgetQueries.list({ orgId, projectId }));

  // Set up watch subscription
  useEffect(() => {
    if (!watch) return;

    const unsubscribe = watchWidgets({
      orgId,
      projectId,
      onEvent: (event) => {
        queryClient.setQueryData<WidgetModel[]>(queryKey, (old = []) => {
          switch (event.type) {
            case 'ADDED':
              return [...old, event.object];
            case 'MODIFIED':
              return old.map((w) =>
                w.id === event.object.id ? event.object : w
              );
            case 'DELETED':
              return old.filter((w) => w.id !== event.object.id);
            default:
              return old;
          }
        });
      },
    });

    return unsubscribe;
  }, [orgId, projectId, watch, queryClient, queryKey]);

  return query;
}
```

---

## Step 8: Export from Index

```typescript
// app/resources/widgets/index.ts
export * from './schema';
export * from './adapter';
export * from './service';
export * from './queries';
export * from './watch';
export * from './use-widgets';
```

---

## Complete File Structure

```
app/resources/widgets/
├── index.ts              # Public exports
├── schema.ts             # Zod schemas + types
├── adapter.ts            # API → Domain transformation
├── service.ts            # API client methods
├── queries.ts            # React Query definitions
├── watch.ts              # Watch API subscription
└── use-widgets.ts        # React hook with watch
```

---

## Checklist

- [ ] OpenAPI spec fetched and added to generation
- [ ] Types generated with `bun run generate:api`
- [ ] Schema created with Zod validation
- [ ] Adapter transforms API response to domain model
- [ ] Service implements CRUD operations
- [ ] Query definitions use query key factory pattern
- [ ] Watch support added (if real-time needed)
- [ ] All exports in index.ts

---

## Related Documentation

- [Domain Modules](../architecture/domain-modules.md)
- [Watch API](../architecture/watch-api.md)
- [OpenAPI Generation](../development/openapi-generation.md)
