# Adding a New Resource

This guide walks through adding a new Kubernetes-based resource to the portal. The examples are taken from `app/resources/secrets/`, which has every file a resource module can have. Open it next to this guide.

---

## Overview

Each resource has a folder under `app/resources/`, named with the plural resource name. Files are prefixed with the singular name:

```
app/resources/secrets/
├── index.ts                # Public exports
├── secret.schema.ts        # Zod schemas + domain types
├── secret.adapter.ts       # API response ↔ domain model
├── secret.adapter.test.ts  # Vitest unit tests, next to the source
├── secret.service.ts       # Query keys + API calls
├── secret.queries.ts       # TanStack Query hooks (useX)
└── secret.watch.ts         # Watch hooks (optional)
```

Not every module needs every file. `app/resources/networks/` is read-only and has only `network.service.ts`, `network.queries.ts` and `index.ts`; it returns the raw API type, so it has no schema or adapter.

Import shared code through the `@/` alias, which maps to `app/`. It is the only path alias.

### Layering

`pnpm depcruise` enforces the layers in `.dependency-cruiser.cjs`: resources must not import from `app/routes/` or `app/features/`. Features and routes import resources.

---

## Prerequisites

1. OpenAPI spec available for the resource
2. Understanding of the K8s resource structure
3. Familiarity with TanStack Query

---

## Step 1: Generate OpenAPI Types

If the API group has no client in `app/modules/control-plane/` yet, generate one:

```bash
pnpm openapi
```

This will:

1. Prompt for the API URL (prefilled from `API_URL`, default `https://api.datum.net`)
2. Prompt for a Bearer token (prefilled from `API_TOKEN`)
3. Show all available API resources
4. Let you select your resource's API group
5. Ask for a folder name and generate the client to `app/modules/control-plane/{folder}/`

If the folder already exists, the script asks before overwriting it. Keep the existing folder name for an API group that is already generated, so the app does not end up with two copies.

### Getting a Bearer Token

Get your token from:

1. Browser DevTools (Network tab → Authorization header)
2. Or by logging in and checking the session

See [OpenAPI Generation](../development/openapi-generation.md) for details.

---

## Step 2: Create the Schema

`{resource}.schema.ts` holds the domain type (what components use), the input types for the service, and the form validation schemas.

```typescript
// app/resources/secrets/secret.schema.ts (shortened)
import { metadataSchema } from '@/resources/base';
import { createNameSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

// Domain model: a flat shape, not the raw K8s object
export const secretResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  deletionTimestamp: z.coerce.date().optional(),
  data: z.array(z.string()).optional(),
  type: z.enum(SECRET_TYPES).optional(),
  labels: labelSchema.optional(),
  annotations: labelSchema.optional(),
});

export type Secret = z.infer<typeof secretResourceSchema>;

// Input types for service operations
export type CreateSecretInput = {
  name: string;
  type: SecretType;
  variables: SecretVariable[];
  labels?: string[];
  annotations?: string[];
};

// Form validation schema
export const secretCreateSchema = z.object({
  name: createNameSchema(),
  // ...
});
```

`@/resources/base` exports shared pieces: `metadataSchema` and `nameSchema` for forms, `paginationParamsSchema`, the `ServiceOptions` type and the scoped base-URL helpers used in Step 4.

---

## Step 3: Create the Adapter

`{resource}.adapter.ts` converts between the generated API types and the domain model. Keep the functions pure, so they are easy to test.

```typescript
// app/resources/secrets/secret.adapter.ts (shortened)
import type { Secret, SecretList, SecretType, CreateSecretInput } from './secret.schema';
import { IoK8sApiCoreV1Secret } from '@/modules/control-plane/k8s-core';

/** Transform raw API Secret to domain Secret type */
export function toSecret(raw: IoK8sApiCoreV1Secret): Secret {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion,
    createdAt: raw.metadata?.creationTimestamp,
    deletionTimestamp: raw.metadata?.deletionTimestamp,
    data: Object.keys(raw.data ?? {}),
    type: raw.type as SecretType,
    labels: raw.metadata?.labels ?? {},
    annotations: raw.metadata?.annotations ?? {},
  };
}

/** Terminating items are dropped: they stay in LIST responses until finalizers run. */
export function toSecretList(items: IoK8sApiCoreV1Secret[], nextCursor?: string): SecretList {
  return {
    items: items.filter((secret) => !secret.metadata?.deletionTimestamp).map(toSecret),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/** Transform CreateSecretInput to API payload */
export function toCreateSecretPayload(input: CreateSecretInput) {
  // ...
}
```

Add `{resource}.adapter.test.ts` next to it. Unit tests are Vitest:

```typescript
// app/resources/secrets/secret.adapter.test.ts (shortened)
import { toSecret } from './secret.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'vitest';

describe('toSecret', () => {
  it('exposes only the data keys (never the values) and maps metadata', () => {
    const raw = {
      metadata: rawMetadata({ uid: 's-1', name: 'db-creds' }),
      data: { username: 'YWRtaW4=', password: 'cGFzcw==' },
      type: 'Opaque',
    };

    const secret = toSecret(raw as never);

    expect(secret.name).toBe('db-creds');
    expect(secret.data).toEqual(['username', 'password']);
  });
});
```

```bash
pnpm exec vitest run app/resources/secrets
```

---

## Step 4: Create the Service

`{resource}.service.ts` exports the query key factory (`{resource}Keys`) and a `create{Resource}Service()` factory. The service calls the generated SDK functions, not a hand-written HTTP client.

```typescript
// app/resources/secrets/secret.service.ts (shortened)
import { toSecret, toSecretList, toCreateSecretPayload } from './secret.adapter';
import type { Secret, CreateSecretInput } from './secret.schema';
import {
  listCoreV1NamespacedSecret,
  readCoreV1NamespacedSecret,
  createCoreV1NamespacedSecret,
  type IoK8sApiCoreV1SecretList,
  type IoK8sApiCoreV1Secret,
} from '@/modules/control-plane/k8s-core';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { getProjectScopedBase } from '@/resources/base/utils';
import { NotFoundError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';

export const secretKeys = {
  all: ['secrets'] as const,
  lists: () => [...secretKeys.all, 'list'] as const,
  list: (projectId: string) => [...secretKeys.lists(), projectId] as const,
  details: () => [...secretKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) => [...secretKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'SecretService';

export function createSecretService() {
  return {
    async list(projectId: string, _options?: ServiceOptions): Promise<Secret[]> {
      const startTime = Date.now();

      try {
        const response = await listCoreV1NamespacedSecret({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
        });
        const data = response.data as IoK8sApiCoreV1SecretList;
        const result = toSecretList(data?.items ?? []).items;

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, name: string): Promise<Secret> {
      // readCoreV1NamespacedSecret(...), throw new NotFoundError('Secret', name) when empty
    },

    async create(projectId: string, input: CreateSecretInput, options?: ServiceOptions) {
      // createCoreV1NamespacedSecret({ ..., body: toCreateSecretPayload(input),
      //   query: options?.dryRun ? { dryRun: 'All' } : undefined })
    },

    // update(...) uses patchCoreV1NamespacedSecret with
    // 'Content-Type': 'application/merge-patch+json'; delete(...) uses deleteCoreV1NamespacedSecret
  };
}

export type SecretService = ReturnType<typeof createSecretService>;
```

Every method follows the same shape:

- pick the scope with `getProjectScopedBase(projectId)`, `getOrgScopedBase(orgId)` or `getUserScopedBase()`
- convert the response with the adapter
- log success with `logger.service` and failures with `logger.error`
- rethrow through `mapApiError`

The same service runs in loaders on the server and in hooks in the browser. `setup.server.ts` and `setup.client.ts` in `app/modules/control-plane/` configure the shared client for each side.

---

## Step 5: Create the Query Hooks

`{resource}.queries.ts` exports `useX` hooks. Query keys come from the service file.

```typescript
// app/resources/secrets/secret.queries.ts (shortened)
import type { Secret, CreateSecretInput } from './secret.schema';
import { SECRET_SYNC_KIND, createSecretService, secretKeys } from './secret.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { useQuery, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';

export function useSecrets(
  projectId: string,
  options?: Omit<UseQueryOptions<Secret[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: secretKeys.list(projectId),
    queryFn: () => createSecretService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useSecret(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<Secret>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: secretKeys.detail(projectId, name),
    queryFn: () => createSecretService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}
```

### Mutations

Mutations on project-scoped resources use `useGuardedMutation` in place of `useMutation`, with `operation: 'write'` or `'delete'`. It stops the request when the project is read-only. See [Gating Write Actions](./gating-write-actions.md).

`defineResourceMutations` supplies the optimistic cache handlers (pending rows, rollback on failure). Set `watched: true` when the list has a watch hook: the watch then updates the cache and mutations do not invalidate it. With `watched: false`, mutations invalidate the list and detail queries when they settle.

```typescript
/** Secrets are watched: mutations write the list and never invalidate it. */
export function secretMutations(projectId: string) {
  return defineResourceMutations<Secret>({
    kind: SECRET_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: secretKeys.list(projectId),
      detail: (name) => secretKeys.detail(projectId, name),
    },
    getName: (secret) => secret.name,
    getMeta: (secret) => ({
      name: secret.name,
      resourceVersion: secret.resourceVersion,
      deletionTimestamp: secret.deletionTimestamp,
    }),
    watched: true,
  });
}

export function useDeleteSecret(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createSecretService().delete(projectId, name),
    ...withResourceHandlers(
      secretMutations(projectId).remove<string>((name) => name),
      options
    ),
  });
}
```

`useGuardedMutation` lives in `app/features/`, so importing it from a resource crosses the layering rule from the Overview. The existing imports are recorded in `.dependency-cruiser-known-violations.json`, which `pnpm depcruise` skips. An import from a new resource file is not in that baseline and fails the check, so raise it in review before regenerating the baseline.

---

## Step 6: Export from Index

`index.ts` is the module's public API. Routes and features import from `@/resources/secrets`.

```typescript
// app/resources/secrets/index.ts (shortened)
export { secretResourceSchema, type Secret, type CreateSecretInput } from './secret.schema';

export { toSecret, toSecretList, toCreateSecretPayload } from './secret.adapter';

export {
  createSecretService,
  secretKeys,
  SECRET_SYNC_KIND,
  type SecretService,
} from './secret.service';

export {
  useSecrets,
  useSecret,
  useCreateSecret,
  useUpdateSecret,
  useDeleteSecret,
} from './secret.queries';

export * from './secret.watch';
```

---

## Step 7 (Optional): Add Watch

`{resource}.watch.ts` exports hooks built on `useResourceWatch` from `@/modules/watch`. The hook subscribes to the K8s Watch API through the portal's SSE endpoint and writes events into the TanStack Query cache under the query key you pass.

```typescript
// app/resources/secrets/secret.watch.ts
import { toSecret } from './secret.adapter';
import type { Secret } from './secret.schema';
import { SECRET_SYNC_KIND, secretKeys } from './secret.service';
import type { IoK8sApiCoreV1Secret } from '@/modules/control-plane/k8s-core';
import { useResourceWatch } from '@/modules/watch';
import type { CacheItemMeta } from '@/modules/watch/resource-cache';

export const secretListCache = {
  getItemKey: (secret: Secret) => secret.name,
  getMeta: (secret: Secret): CacheItemMeta => ({
    name: secret.name,
    resourceVersion: secret.resourceVersion,
    deletionTimestamp: secret.deletionTimestamp,
  }),
};

/** Watch secrets list for real-time updates. */
export function useSecretsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Secret>({
    resourceType: 'api/v1/secrets',
    projectId,
    namespace: 'default',
    queryKey: secretKeys.list(projectId),
    transform: (item) => toSecret(item as IoK8sApiCoreV1Secret),
    enabled: options?.enabled ?? true,
    syncKind: SECRET_SYNC_KIND,
    syncScope: projectId,
    ...secretListCache,
  });
}

/** Watch a single secret for real-time updates. */
export function useSecretWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Secret>({
    resourceType: 'api/v1/secrets',
    projectId,
    namespace: 'default',
    name,
    queryKey: secretKeys.detail(projectId, name),
    transform: (item) => toSecret(item as IoK8sApiCoreV1Secret),
    enabled: options?.enabled ?? true,
  });
}
```

`resourceType` is the K8s API path: `api/<version>/<resource>` for core resources, `apis/<group>/<version>/<resource>` for the rest (for example `apis/networking.datumapis.com/v1alpha/domains`). See [Watch API](../architecture/watch-api.md).

---

## Step 8: Use It in a Route

A list route gates access on the server, seeds the query cache from the loader, then reads through the hooks:

```typescript
// app/routes/project/detail/secrets/index.tsx (shortened)
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import {
  createSecretService,
  secretKeys,
  useSecrets,
  useSecretsWatch,
  type Secret,
} from '@/resources/secrets';

const route = defineResourceRoute<Secret[]>({
  type: 'list',
  resource: 'secrets',
  restrictedMessage: "You don't have permission to view secrets.",
  metaTitle: 'Secrets',
  seedCache: ({ data, projectId }) => [[secretKeys.list(projectId), data]] as never,
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<Secret[]>(args, {
    resource: 'secrets',
    group: '',
    scope: 'project',
    fetch: ({ projectId }) => createSecretService().list(projectId!),
  });

export const meta = route.meta;

export default route.Page(({ data: initialData }) => <SecretsInner initialData={initialData} />);

function SecretsInner({ initialData }: { initialData: Secret[] }) {
  const { projectId } = useParams();

  useSecretsWatch(projectId ?? '');
  const { data } = useSecrets(projectId ?? '', { initialData });
  // ...
}
```

Register the route file in `app/routes.ts`. For permissions inside the page (`useResourcePermissions`, `<PermissionButton>`, `<PermissionGate>`) follow `app/modules/rbac/CONVENTIONS.md`, which also has the detail-route variant and its own checklist for new resources. See [Adding a New Page](./adding-new-page.md) for the page itself.

---

## Checklist

- [ ] Control-plane client exists in `app/modules/control-plane/` (`pnpm openapi`)
- [ ] `{resource}.schema.ts` defines the domain type and input types
- [ ] `{resource}.adapter.ts` converts API types to the domain model, with a `.test.ts` next to it
- [ ] `{resource}.service.ts` exports `{resource}Keys` and `create{Resource}Service()`
- [ ] `{resource}.queries.ts` exports `useX` hooks; project-scoped mutations use `useGuardedMutation`
- [ ] `{resource}.watch.ts` added if the page needs real-time updates
- [ ] Everything public is exported from `index.ts`
- [ ] `pnpm typecheck`, `pnpm depcruise` and the module's Vitest tests pass

---

## Related Documentation

- [Domain Modules](../architecture/domain-modules.md)
- [Watch API](../architecture/watch-api.md)
- [OpenAPI Generation](../development/openapi-generation.md)
- [Gating Write Actions](./gating-write-actions.md)
- [Adding a New Page](./adding-new-page.md)
