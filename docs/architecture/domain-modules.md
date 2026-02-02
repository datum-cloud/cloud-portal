# Domain-Driven Resource Modules

This document describes the structure and patterns for resource modules in `app/resources/`.

---

## Overview

Each API resource has a dedicated module with co-located files following a consistent pattern. This design was adopted in [ADR-002](./adrs/002-domain-driven-resource-modules.md).

### Benefits

- **Co-location**: All resource code in one folder
- **Consistency**: Same pattern for every resource
- **Discoverability**: Easy to find and understand
- **Type safety**: Zod schemas provide types AND validation

---

## Module Structure

Every resource module follows this structure:

```
app/resources/{resource-name}/
├── {resource}.schema.ts      # Zod schemas + TypeScript types
├── {resource}.adapter.ts     # API response → Domain model
├── {resource}.service.ts     # Business logic, API calls (REST)
├── {resource}.queries.ts     # React Query hooks (REST)
├── {resource}.gql-service.ts # GraphQL service (optional)
├── {resource}.gql-queries.ts # React Query hooks for GraphQL (optional)
├── {resource}.watch.ts       # K8s Watch hook (optional)
└── index.ts                  # Public exports
```

### Example: Organizations

```
app/resources/organizations/
├── organization.schema.ts
├── organization.adapter.ts
├── organization.service.ts      # REST service
├── organization.queries.ts      # REST hooks
├── organization.gql-service.ts  # GraphQL service
├── organization.gql-queries.ts  # GraphQL hooks
└── index.ts
```

---

## File Responsibilities

### 1. Schema (`*.schema.ts`)

Defines Zod schemas and infers TypeScript types:

```typescript
// organization.schema.ts
import { z } from 'zod';

// Main resource schema
export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended', 'deleted']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer TypeScript type from schema
export type Organization = z.infer<typeof OrganizationSchema>;

// Create/Update input schemas
export const CreateOrganizationSchema = z.object({
  name: z.string().min(3).max(63),
  displayName: z.string().min(1).max(100),
});

export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial();
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;
```

**Key points:**

- Zod schema IS the type definition (no duplication)
- Use `.pick()`, `.omit()`, `.partial()` to derive schemas
- Export both schema and inferred type

### 2. Adapter (`*.adapter.ts`)

Transforms API responses to domain models:

```typescript
// organization.adapter.ts
import type { Organization } from './organization.schema';
import type { OrganizationApiResponse } from '@/modules/control-plane/iam';

/**
 * Transform API response to domain model
 */
export function toOrganization(response: OrganizationApiResponse): Organization {
  return {
    id: response.metadata.uid,
    name: response.metadata.name,
    displayName: response.spec.displayName,
    slug: response.spec.slug,
    status: response.status?.phase ?? 'active',
    createdAt: response.metadata.creationTimestamp,
    updatedAt: response.metadata.updatedTimestamp ?? response.metadata.creationTimestamp,
  };
}

/**
 * Transform array of responses
 */
export function toOrganizations(responses: OrganizationApiResponse[]): Organization[] {
  return responses.map(toOrganization);
}
```

**Key points:**

- Isolates API structure from domain model
- Handles null/undefined with defaults
- One function per transformation direction

### 3. Service (`*.service.ts`)

Contains business logic and API calls:

```typescript
// organization.service.ts
import { toOrganization, toOrganizations } from './organization.adapter';
import type { CreateOrganization, Organization, UpdateOrganization } from './organization.schema';
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/modules/control-plane/iam';

export async function list(): Promise<Organization[]> {
  const response = await listOrganizations();
  return toOrganizations(response.data?.items ?? []);
}

export async function getById(id: string): Promise<Organization | null> {
  try {
    const response = await getOrganization({ path: { id } });
    return response.data ? toOrganization(response.data) : null;
  } catch {
    return null;
  }
}

export async function create(data: CreateOrganization): Promise<Organization> {
  const response = await createOrganization({
    body: {
      metadata: { name: data.name },
      spec: { displayName: data.displayName },
    },
  });
  return toOrganization(response.data!);
}

export async function update(id: string, data: UpdateOrganization): Promise<Organization> {
  const response = await updateOrganization({
    path: { id },
    body: { spec: data },
  });
  return toOrganization(response.data!);
}

export async function remove(id: string): Promise<void> {
  await deleteOrganization({ path: { id } });
}
```

**Key points:**

- Uses generated API clients
- Calls adapters to transform responses
- Handles errors appropriately
- Returns domain types, not API types

### 4. Queries (`*.queries.ts`)

React Query hooks for data fetching:

```typescript
// organization.queries.ts
import type { CreateOrganization, Organization, UpdateOrganization } from './organization.schema';
import * as service from './organization.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export const organizationKeys = {
  all: ['organizations'] as const,
  list: () => [...organizationKeys.all, 'list'] as const,
  detail: (id: string) => [...organizationKeys.all, 'detail', id] as const,
};

// List query
export function useOrganizations(options?: { initialData?: Organization[] }) {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: service.list,
    initialData: options?.initialData,
  });
}

// Detail query
export function useOrganization(id: string, options?: { initialData?: Organization }) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => service.getById(id),
    enabled: !!id,
    initialData: options?.initialData,
  });
}

// Create mutation
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganization) => service.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
    },
  });
}

// Update mutation
export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrganization) => service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
    },
  });
}

// Delete mutation with optimistic update
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => service.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: organizationKeys.list() });
      const previous = queryClient.getQueryData<Organization[]>(organizationKeys.list());

      queryClient.setQueryData<Organization[]>(
        organizationKeys.list(),
        (old) => old?.filter((org) => org.id !== id) ?? []
      );

      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(organizationKeys.list(), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
    },
  });
}
```

**Key points:**

- Query keys factory for consistency
- Support for SSR initial data
- Optimistic updates for better UX
- Cache invalidation on mutations

### 5. Watch (`*.watch.ts`) - Optional

Real-time updates via K8s Watch API:

```typescript
// organization.watch.ts
import { toOrganization } from './organization.adapter';
import { organizationKeys } from './organization.queries';
import type { Organization } from './organization.schema';
import { useWatch } from '@/modules/watch';
import { useQueryClient } from '@tanstack/react-query';

export function useOrganizationsWatch() {
  const queryClient = useQueryClient();

  return useWatch({
    endpoint: '/apis/iam.miloapis.com/v1alpha1/organizations',
    queryKey: organizationKeys.list(),
    onEvent: (event) => {
      const organization = toOrganization(event.object);

      queryClient.setQueryData<Organization[]>(organizationKeys.list(), (old = []) => {
        switch (event.type) {
          case 'ADDED':
            return [...old, organization];
          case 'MODIFIED':
            return old.map((o) => (o.id === organization.id ? organization : o));
          case 'DELETED':
            return old.filter((o) => o.id !== organization.id);
          default:
            return old;
        }
      });
    },
  });
}
```

### 6. Index (`index.ts`)

Public exports for the module:

```typescript
// index.ts

// Types
export type { Organization, CreateOrganization, UpdateOrganization } from './organization.schema';
export {
  OrganizationSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
} from './organization.schema';

// Adapter
export { toOrganization, toOrganizations } from './organization.adapter';

// Service
export * as organizationService from './organization.service';

// Queries
export {
  organizationKeys,
  useOrganizations,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from './organization.queries';

// Watch (if exists)
export { useOrganizationsWatch } from './organization.watch';
```

---

## Existing Resource Modules

| Resource        | Location                     | Has Watch |
| --------------- | ---------------------------- | --------- |
| Organizations   | `resources/organizations/`   | No        |
| Projects        | `resources/projects/`        | No        |
| Members         | `resources/members/`         | No        |
| Groups          | `resources/groups/`          | No        |
| Roles           | `resources/roles/`           | No        |
| Invitations     | `resources/invitations/`     | No        |
| DNS Zones       | `resources/dns-zones/`       | Yes       |
| DNS Records     | `resources/dns-records/`     | Yes       |
| Domains         | `resources/domains/`         | Yes       |
| Secrets         | `resources/secrets/`         | Yes       |
| HTTP Proxies    | `resources/http-proxies/`    | Yes       |
| Policy Bindings | `resources/policy-bindings/` | No        |
| Export Policies | `resources/export-policies/` | No        |

---

## Creating a New Resource

See [Adding a New Resource](../guides/adding-new-resource.md) for step-by-step instructions.

---

## Related Documentation

- [ADR-002: Domain-Driven Resource Modules](./adrs/002-domain-driven-resource-modules.md)
- [Data Flow](./data-flow.md)
- [Watch API](./watch-api.md)
