# Phase 6: Full Domain Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all remaining domains from legacy control files to the new data-driven architecture with Zod schemas, adapters, services, and delete all legacy code.

**Architecture:** Each resource gets: schema.ts (Zod), adapter.ts (API transformations), service.ts (business logic), queries.ts (React Query hooks). Legacy control files and interfaces are deleted after migration.

**Tech Stack:** Zod v4, React Query, TypeScript, @hey-api/client-axios

---

## Batch 1: Core Resources

### Task 1.1: Create Project Schema

**Files:**

- Create: `app/resources/projects/project.schema.ts`

**Step 1: Write project schema**

```typescript
import { resourceMetadataSchema, paginatedResponseSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const projectStatusSchema = z.enum(['Active', 'Pending', 'Deleting', 'Failed']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = resourceMetadataSchema.extend({
  organizationId: z.string(),
  status: z.any(), // Raw status object from API
  labels: z.record(z.string()).optional(),
  annotations: z.record(z.string()).optional(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectListSchema = paginatedResponseSchema(projectSchema);
export type ProjectList = z.infer<typeof projectListSchema>;

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(63, 'Name must be at most 63 characters')
    .regex(
      /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'Name must be lowercase, start with letter, use only letters, numbers, hyphens'
    ),
  description: z.string().max(500).optional(),
  organizationId: z.string().min(1, 'Organization ID is required'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  description: z.string().max(500).optional(),
  resourceVersion: z.string(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors in project.schema.ts

---

### Task 1.2: Create Project Adapter

**Files:**

- Create: `app/resources/projects/project.adapter.ts`

**Step 1: Write project adapter**

```typescript
import {
  projectSchema,
  type Project,
  type ProjectList,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project.schema';
import type {
  ComMiloapisResourcemanagerV1Alpha1Project,
  ComMiloapisResourcemanagerV1Alpha1ProjectList,
} from '@/modules/control-plane/resource-manager';
import { filterLabels } from '@/utils/helpers/object.helper';

export function toProject(raw: ComMiloapisResourcemanagerV1Alpha1Project): Project {
  const transformed = {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    displayName:
      raw.metadata?.annotations?.['kubernetes.io/description'] ?? raw.metadata?.name ?? '',
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    updatedAt: raw.metadata?.creationTimestamp,
    organizationId: raw.spec?.ownerRef?.name ?? '',
    status: raw.status ?? {},
    labels: filterLabels(raw.metadata?.labels ?? {}, ['resourcemanager']),
    annotations: raw.metadata?.annotations ?? {},
  };

  return projectSchema.parse(transformed);
}

export function toProjectList(raw: ComMiloapisResourcemanagerV1Alpha1ProjectList): ProjectList {
  const items = (raw.items ?? []).filter((p) => !p.metadata?.deletionTimestamp).map(toProject);

  return {
    items,
    nextCursor: raw.metadata?.continue ?? null,
    hasMore: !!raw.metadata?.continue,
  };
}

export function toCreatePayload(input: CreateProjectInput): any {
  return {
    apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
    kind: 'Project',
    metadata: {
      name: input.name,
      annotations: {
        'kubernetes.io/description': input.description ?? '',
      },
    },
    spec: {
      ownerRef: {
        kind: 'Organization',
        name: input.organizationId,
      },
    },
  };
}

export function toUpdatePayload(input: UpdateProjectInput): any {
  return {
    apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
    kind: 'Project',
    metadata: {
      annotations: {
        ...(input.description && { 'kubernetes.io/description': input.description }),
      },
    },
  };
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

---

### Task 1.3: Create Project Service

**Files:**

- Create: `app/resources/projects/project.service.ts`

**Step 1: Write project service**

```typescript
import { toProject, toProjectList, toCreatePayload, toUpdatePayload } from './project.adapter';
import {
  createProjectSchema,
  type Project,
  type ProjectList,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project.schema';
import {
  listResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1Project,
  createResourcemanagerMiloapisComV1Alpha1Project,
  patchResourcemanagerMiloapisComV1Alpha1Project,
  deleteResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1ProjectStatus,
  type ComMiloapisResourcemanagerV1Alpha1ProjectList,
} from '@/modules/control-plane/resource-manager';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import type { ServiceContext, ServiceOptions } from '@/resources/base/types';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (orgId: string, params?: PaginationParams) =>
    [...projectKeys.lists(), orgId, params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (name: string) => [...projectKeys.details(), name] as const,
};

const SERVICE_NAME = 'ProjectService';

export function createProjectService(ctx: ServiceContext) {
  const client = ctx.controlPlaneClient;
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  return {
    async list(
      orgId: string,
      params?: PaginationParams,
      _options?: ServiceOptions
    ): Promise<ProjectList> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(orgId, params);
        logger.service(SERVICE_NAME, 'list', {
          input: { orgId, params },
          duration: Date.now() - startTime,
        });
        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchList(orgId: string, params?: PaginationParams): Promise<ProjectList> {
      const response = await listResourcemanagerMiloapisComV1Alpha1Project({
        client,
        baseURL: `${baseUrl}/organizations/${orgId}/control-plane`,
        query: { limit: params?.limit ?? 100, continue: params?.cursor },
      });

      const data = response.data as ComMiloapisResourcemanagerV1Alpha1ProjectList;
      return toProjectList(data);
    },

    async get(name: string, _options?: ServiceOptions): Promise<Project> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(name);
        logger.service(SERVICE_NAME, 'get', { input: { name }, duration: Date.now() - startTime });
        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchOne(name: string): Promise<Project> {
      const response = await readResourcemanagerMiloapisComV1Alpha1Project({
        client,
        path: { name },
      });

      if (!response.data) throw new Error(`Project ${name} not found`);
      return toProject(response.data);
    },

    async getStatus(name: string) {
      const response = await readResourcemanagerMiloapisComV1Alpha1ProjectStatus({
        client,
        path: { name },
      });
      return transformControlPlaneStatus(response.data?.status);
    },

    async create(input: CreateProjectInput, options?: ServiceOptions): Promise<Project> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createProjectSchema, input, {
          message: 'Invalid project data',
          requestId: ctx.requestId,
        });

        const payload = toCreatePayload(validated);

        const response = await createResourcemanagerMiloapisComV1Alpha1Project({
          client,
          baseURL: `${baseUrl}/organizations/${validated.organizationId}/control-plane`,
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        if (!response.data) throw new Error('Failed to create project');

        const project = toProject(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { name: input.name },
          duration: Date.now() - startTime,
        });
        return project;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async update(
      name: string,
      input: UpdateProjectInput,
      options?: ServiceOptions
    ): Promise<Project> {
      const startTime = Date.now();

      try {
        const payload = toUpdatePayload(input);

        const response = await patchResourcemanagerMiloapisComV1Alpha1Project({
          client,
          path: { name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        if (!response.data) throw new Error('Failed to update project');

        const project = toProject(response.data);

        logger.service(SERVICE_NAME, 'update', {
          input: { name },
          duration: Date.now() - startTime,
        });
        return project;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async delete(name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteResourcemanagerMiloapisComV1Alpha1Project({
          client,
          path: { name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },
  };
}

export type ProjectService = ReturnType<typeof createProjectService>;
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

---

### Task 1.4: Create Project Queries

**Files:**

- Create: `app/resources/projects/project.queries.ts`

**Step 1: Write project queries**

```typescript
import type {
  Project,
  ProjectList,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.schema';
import { createProjectService, projectKeys } from './project.service';
import { useServiceContext } from '@/providers/service.provider';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useProjects(
  orgId: string,
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<ProjectList>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createProjectService(ctx);

  return useQuery({
    queryKey: projectKeys.list(orgId, params),
    queryFn: () => service.list(orgId, params),
    enabled: !!orgId,
    ...options,
  });
}

export function useProject(
  name: string,
  options?: Omit<UseQueryOptions<Project>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createProjectService(ctx);

  return useQuery({
    queryKey: projectKeys.detail(name),
    queryFn: () => service.get(name),
    enabled: !!name,
    ...options,
  });
}

export function useCreateProject(options?: UseMutationOptions<Project, Error, CreateProjectInput>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      await service.create(input, { dryRun: true });
      return service.create(input);
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(newProject.name), newProject);
    },
    ...options,
  });
}

export function useUpdateProject(
  name: string,
  options?: UseMutationOptions<Project, Error, UpdateProjectInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => service.update(name, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options,
  });
}

export function useDeleteProject(options?: UseMutationOptions<void, Error, string>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createProjectService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options,
  });
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

---

### Task 1.5: Create Project Index

**Files:**

- Create: `app/resources/projects/index.ts`

**Step 1: Write index file**

```typescript
export {
  projectSchema,
  projectListSchema,
  projectStatusSchema,
  createProjectSchema,
  updateProjectSchema,
  type Project,
  type ProjectList,
  type ProjectStatus,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project.schema';

export { toProject, toProjectList, toCreatePayload, toUpdatePayload } from './project.adapter';

export { createProjectService, projectKeys, type ProjectService } from './project.service';

export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './project.queries';
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

---

### Task 1.6: Migrate Project Routes

**Files:**

- Modify: `app/routes/project/detail/layout.tsx`
- Modify: `app/routes/org/detail/projects/index.tsx`
- Modify: `app/routes/api/projects/index.ts`
- Modify: `app/routes/api/projects/$id.ts`

**Step 1: Update routes to use new service**

Update all project routes to:

1. Import from `@/resources/projects` instead of legacy control
2. Use `createProjectService(ctx)` pattern
3. Pass `controlPlaneClient` in context

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

---

### Task 1.7: Delete Legacy Project Files

**Files:**

- Delete: `app/resources/control-plane/resource-manager/projects.control.ts`
- Delete: `app/resources/interfaces/project.interface.ts`
- Modify: `app/resources/control-plane/resource-manager/index.ts` (remove export)

**Step 1: Delete files**

```bash
rm app/resources/control-plane/resource-manager/projects.control.ts
rm app/resources/interfaces/project.interface.ts
```

**Step 2: Update index export**

Remove `createProjectsControl` export from index.

**Step 3: Run typecheck and fix imports**

Run: `bun run typecheck`
Fix any remaining imports.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(projects): migrate to data-driven architecture and delete legacy"
```

---

## Batch 2: DNS Resources

### Task 2.1: Create DNS Zone Schema

**Files:**

- Create: `app/resources/dns-zones/dns-zone.schema.ts`

```typescript
import { resourceMetadataSchema, paginatedResponseSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const dnsZoneSchema = resourceMetadataSchema.extend({
  domainName: z.string(),
  dnsZoneClassName: z.string(),
  status: z.any(),
  deletionTimestamp: z.coerce.date().optional(),
});

export type DnsZone = z.infer<typeof dnsZoneSchema>;

export const dnsZoneListSchema = paginatedResponseSchema(dnsZoneSchema);
export type DnsZoneList = z.infer<typeof dnsZoneListSchema>;

export const createDnsZoneSchema = z.object({
  domainName: z.string().min(1, 'Domain name is required'),
  description: z.string().max(500).optional(),
});

export type CreateDnsZoneInput = z.infer<typeof createDnsZoneSchema>;
```

---

### Task 2.2: Create DNS Zone Adapter

**Files:**

- Create: `app/resources/dns-zones/dns-zone.adapter.ts`

Implement adapter following the organization pattern.

---

### Task 2.3: Create DNS Zone Service

**Files:**

- Create: `app/resources/dns-zones/dns-zone.service.ts`

Implement service with:

- list(projectId)
- get(projectId, name)
- create(projectId, input)
- update(projectId, name, input)
- delete(projectId, name)
- listByDomainRef(projectId, domainRef)

---

### Task 2.4: Create DNS Zone Queries & Index

**Files:**

- Create: `app/resources/dns-zones/dns-zone.queries.ts`
- Create: `app/resources/dns-zones/index.ts`

---

### Task 2.5: Migrate DNS Zone Routes & Delete Legacy

Update routes, delete:

- `app/resources/control-plane/dns-networking/dns-zones.control.ts`
- Related interfaces

Commit: `feat(dns-zones): migrate to data-driven architecture`

---

## Batch 3: More DNS Resources

### Task 3.1-3.5: DNS Records (same pattern)

### Task 3.6-3.10: DNS Zone Discoveries (same pattern)

---

## Batch 4: Networking Resources

### Task 4.1-4.5: Domains (same pattern)

### Task 4.6-4.10: HTTP Proxies (same pattern)

---

## Batch 5: K8s Core Resources

### Task 5.1-5.5: Secrets (same pattern)

---

## Batch 6: Telemetry Resources

### Task 6.1-6.5: Export Policies (same pattern)

---

## Batch 7: IAM Resources

### Task 7.1-7.5: User (same pattern)

### Task 7.6-7.10: Members (same pattern)

### Task 7.11-7.15: Invitations (same pattern)

### Task 7.16-7.20: Roles (same pattern)

### Task 7.21-7.25: Groups (same pattern)

### Task 7.26-7.30: Policy Bindings (same pattern)

---

## Batch 8: Cleanup

### Task 8.1: Delete Remaining Legacy Files

Delete all remaining:

- `app/resources/control-plane/` directories (except index if needed)
- `app/resources/interfaces/` files
- Old schemas in `app/resources/schemas/` that are replaced

### Task 8.2: Update Exports

Update barrel exports to only include new data-driven resources.

### Task 8.3: Final Typecheck

Run: `bun run typecheck`
Fix all errors.

### Task 8.4: Final Commit

```bash
git add -A
git commit -m "chore: complete Phase 6 - full domain migration to data-driven architecture"
```

---

## Notes

1. **Pattern for each resource:**
   - schema.ts → adapter.ts → service.ts → queries.ts → index.ts
   - Update routes to use service
   - Delete legacy control + interface
   - Commit

2. **ServiceContext must include:**
   - requestId
   - controlPlaneClient

3. **Each service follows:**
   - Query keys for React Query
   - list/get/create/update/delete methods
   - Logging with duration
   - Error mapping

4. **Run typecheck after each file** to catch issues early.
