# Data-Driven Architecture Refactor

> Design document for refactoring the cloud-portal data management layer.
> Clean break approach - no backward compatibility, remove all unused code.

## Summary

| Aspect      | Current                       | New                                  |
| ----------- | ----------------------------- | ------------------------------------ |
| Server      | Express 5.1.0                 | Hono (via react-router-hono-server)  |
| Runtime     | Bun (with Express)            | Bun (native Hono support)            |
| HTTP Client | @hey-api/client-axios         | @hey-api/client-axios (keep)         |
| Schema      | Zod v3 (fragmented)           | Zod v4 (domain-driven)               |
| Data Layer  | BFF API routes                | Thin Service Layer                   |
| State       | Loaders + limited React Query | React Query (hybrid SSR/CSR)         |
| Caching     | Unstorage LRU (in-memory)     | React Query (client-side only)       |
| Errors      | Scattered patterns            | Unified AppError + Zod v4            |
| Auth        | remix-auth + Express          | remix-auth + Hono (keep AuthService) |
| Logging     | morgan + console              | Structured logger with CURL          |

---

## Architecture Overview

### New Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │ React Query │◄──►│ Service Hooks │◄──►│ UI Components   │    │
│  │   Cache     │    │ (CSR calls)   │    │                 │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ /api/proxy/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HONO SERVER (Bun)                          │
│  ┌──────────────┐    ┌──────────────┐                          │
│  │ React Router │───►│   Services   │                          │
│  │   Loaders    │    │ (thin layer) │                          │
│  │ (prefetch)   │    └──────┬───────┘                          │
│  └──────────────┘           │                                   │
│                             ▼                                   │
│                    ┌──────────────────┐                        │
│                    │    Adapters      │                        │
│                    │ (API → Domain)   │                        │
│                    └────────┬─────────┘                        │
│                             ▼                                   │
│                    ┌──────────────────┐                        │
│                    │ @hey-api/client  │                        │
│                    │    -axios        │                        │
│                    └────────┬─────────┘                        │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Control Plane   │
                    │  (Kubernetes)    │
                    └──────────────────┘
```

### Key Benefits

- No internal HTTP hops (loaders call services directly)
- Client-side caching with React Query for optimal performance
- K8s Watch API for real-time updates (no polling needed)
- Type-safe end-to-end with Zod v4
- Structured logging with request correlation

---

## Directory Structure

### New Structure

```
/app
├── server/                        # Hono server
│   ├── entry.ts                   # Main Hono app
│   ├── types.ts                   # Server types
│   ├── sentry.server.ts           # Sentry init
│   ├── adapters/
│   │   └── bun.ts                 # Bun runtime adapter
│   ├── middleware/
│   │   ├── auth.ts                # Authentication
│   │   ├── error-handler.ts       # Global error handler
│   │   ├── logger.ts              # Request/response logging
│   │   ├── rate-limit.ts          # Rate limiting
│   │   └── sentry-tracing.ts      # Sentry tracing
│   └── routes/
│       └── proxy.ts               # Client-side API proxy
│
├── resources/                     # Centralized data-driven management
│   ├── base/                      # Shared utilities
│   │   ├── base.schema.ts         # Base schemas (pagination, metadata)
│   │   ├── context.ts             # Service context
│   │   ├── query-error-handler.ts # React Query error handler
│   │   └── types.ts               # Shared types
│   ├── organizations/             # Organization resource (all-in-one)
│   │   ├── organization.schema.ts   # Zod v4 domain schema
│   │   ├── organization.adapter.ts  # API → Domain transformer
│   │   ├── organization.service.ts  # Service functions
│   │   ├── organization.queries.ts  # React Query hooks
│   │   └── index.ts
│   ├── projects/                  # Project resource (all-in-one)
│   │   ├── project.schema.ts
│   │   ├── project.adapter.ts
│   │   ├── project.service.ts
│   │   ├── project.queries.ts
│   │   └── index.ts
│   └── ... (other resources)
│
├── modules/
│   ├── control-plane/             # Keep existing (auto-generated)
│   │   └── axios-curl.interceptor.ts  # Add CURL logging
│   ├── auth/                      # Keep existing
│   ├── logger/                    # New structured logger
│   │   ├── logger.ts
│   │   ├── logger.config.ts
│   │   ├── logger.types.ts
│   │   ├── curl.generator.ts
│   │   ├── formatters/
│   │   │   ├── dev.formatter.ts
│   │   │   └── prod.formatter.ts
│   │   └── index.ts
│   └── ... (keep other modules)
│
├── providers/
│   ├── app.provider.tsx           # Keep existing
│   └── service.provider.tsx       # New service context
│
├── utils/
│   ├── auth/                      # Keep existing (AuthService, etc.)
│   ├── config/                    # Keep existing
│   ├── cookies/
│   │   └── session.server.ts      # Simplified
│   └── errors/                    # New unified error system
│       ├── app-error.ts
│       ├── error-formatter.ts
│       ├── error-mapper.ts
│       └── index.ts
│
├── routes/                        # Simplified routes
└── ... (keep components, features, hooks, layouts, styles)
```

### Files to Remove

```
# Old server
server.ts                          # Express server entry

# Old BFF API routes (after migration)
app/routes/api/                    # All BFF routes

# Old schema patterns
app/resources/schemas/             # Replaced by resources/{resource}/*.schema.ts
app/resources/interfaces/          # Replaced by z.infer<>
app/resources/control-plane/       # Replaced by resources/{resource}/

# Old middleware (Express-specific)
app/utils/middlewares/             # Replaced by Hono middleware
```

### Files to Keep (Unchanged)

```
app/components/                    # UI components
app/features/                      # Feature components
app/hooks/                         # Custom hooks
app/layouts/                       # Layouts
app/styles/                        # Styling
app/modules/control-plane/         # Auto-generated clients
app/modules/auth/                  # Auth module
app/modules/rbac/                  # RBAC module
app/utils/auth/                    # AuthService, auth.config
app/utils/config/                  # Env config
app/utils/helpers/                 # Helper functions
```

---

## Implementation Details

### 1. Hono Server Entry

```typescript
// app/server/entry.ts
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { loggerMiddleware } from './middleware/logger';
import { rateLimiter } from './middleware/rate-limit';
import { sentryTracingMiddleware } from './middleware/sentry-tracing';
import { initSentry, Sentry } from './sentry.server';
import type { Variables } from './types';
import { prometheus } from '@hono/prometheus';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { createHonoServer } from 'react-router-hono-server/bun';
import { createControlPlaneClient } from '~/modules/control-plane';
import { AuthService } from '~/utils/auth/auth.service';

initSentry();

const app = new Hono<{ Variables: Variables }>();

// Global middleware
app.use('*', sentryTracingMiddleware());
app.use(requestId());
app.use('*', loggerMiddleware());

app.use('*', async (c, next) => {
  const nonce = crypto.randomUUID();
  c.set('cspNonce', nonce);

  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'strict-dynamic'", `'nonce-${nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.API_URL ?? ''],
    },
  })(c, next);
});

app.use('/api/*', rateLimiter());
app.onError(errorHandler);

// Public routes
app.get('/_healthz', (c) => c.json({ status: 'ok' }));
app.get('/_readyz', (c) => c.json({ status: 'ready' }));

const { printMetrics, registerMetrics } = prometheus();
app.use('*', registerMetrics);
app.get('/metrics', printMetrics);

// API proxy (authenticated)
app.use('/api/proxy/*', authMiddleware());
app.all('/api/proxy/*', async (c) => {
  const path = c.req.path.replace('/api/proxy', '');
  const session = c.get('session');

  const response = await fetch(`${process.env.API_URL}${path}`, {
    method: c.req.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': c.req.header('Content-Type') ?? 'application/json',
      'X-Request-ID': c.get('requestId'),
    },
    body: c.req.method !== 'GET' ? await c.req.text() : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
});

// React Router SSR
export default createHonoServer({
  app,

  getLoadContext: async (c) => {
    const requestId = c.get('requestId');
    const cspNonce = c.get('cspNonce');
    const cookieHeader = c.req.header('Cookie') ?? null;

    const { session, headers } = await AuthService.getValidSession(cookieHeader);

    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        c.header('Set-Cookie', value, { append: true });
      }
    });

    const controlPlaneClient = createControlPlaneClient({
      baseURL: process.env.API_URL,
      accessToken: session?.accessToken,
      requestId,
    });

    return {
      requestId,
      cspNonce,
      session,
      controlPlaneClient,
    };
  },
});
```

### 2. Server Types

```typescript
// app/server/types.ts
import type { Client } from '@hey-api/client-axios';
import type { IAccessTokenSession } from '~/utils/auth/auth.types';

export interface Variables {
  requestId: string;
  cspNonce: string;
  session: IAccessTokenSession | null;
}

declare module 'react-router' {
  interface AppLoadContext {
    requestId: string;
    cspNonce: string;
    session: IAccessTokenSession | null;
    controlPlaneClient: Client;
  }
}
```

### 3. Domain Schema (Zod v4)

```typescript
// app/resources/base/base.schema.ts
import { z } from 'zod';

export const paginationParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullish(),
    hasMore: z.boolean(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const resourceMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});

export type ResourceMetadata = z.infer<typeof resourceMetadataSchema>;
```

```typescript
// app/resources/organizations/organization.schema.ts
import { z } from 'zod';
import { resourceMetadataSchema, paginatedResponseSchema } from '~/resources/base/base.schema';

export const organizationTypeSchema = z.enum(['Personal', 'Standard', 'Enterprise']);
export type OrganizationType = z.infer<typeof organizationTypeSchema>;

export const organizationStatusSchema = z.enum(['Active', 'Suspended', 'Pending', 'Deleting']);
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;

export const organizationSchema = resourceMetadataSchema.extend({
  type: organizationTypeSchema,
  status: organizationStatusSchema,
  memberCount: z.number().optional(),
  projectCount: z.number().optional(),
});

export type Organization = z.infer<typeof organizationSchema>;

export const organizationListSchema = paginatedResponseSchema(organizationSchema);
export type OrganizationList = z.infer<typeof organizationListSchema>;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(63, 'Name must be at most 63 characters')
    .regex(
      /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'Name must be lowercase, start with letter, use only letters, numbers, hyphens'
    ),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  type: organizationTypeSchema.default('Standard'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  resourceVersion: z.string(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
```

### 4. Adapter

```typescript
// app/resources/organizations/organization.adapter.ts
import {
  organizationSchema,
  organizationListSchema,
  type Organization,
  type OrganizationList,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from './organization.schema';
import type {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1OrganizationList,
} from '~/modules/control-plane/resource-manager';

export function toOrganization(raw: ComMiloapisResourcemanagerV1Alpha1Organization): Organization {
  const transformed = {
    id: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    displayName:
      raw.metadata?.annotations?.['kubernetes.io/display-name'] ?? raw.metadata?.name ?? '',
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    updatedAt: raw.metadata?.creationTimestamp,
    type: mapType(raw.spec?.type),
    status: mapStatus(raw.status?.state),
    memberCount: raw.status?.memberCount,
    projectCount: raw.status?.projectCount,
  };

  return organizationSchema.parse(transformed);
}

export function toOrganizationList(
  raw: ComMiloapisResourcemanagerV1Alpha1OrganizationList
): OrganizationList {
  const items = raw.items?.map(toOrganization) ?? [];

  return organizationListSchema.parse({
    items,
    nextCursor: raw.metadata?.continue ?? null,
    hasMore: !!raw.metadata?.continue,
  });
}

export function toCreatePayload(
  input: CreateOrganizationInput
): ComMiloapisResourcemanagerV1Alpha1Organization {
  return {
    metadata: {
      name: input.name,
      annotations: {
        'kubernetes.io/display-name': input.displayName,
        ...(input.description && {
          'kubernetes.io/description': input.description,
        }),
      },
    },
    spec: {
      type: input.type,
    },
  };
}

export function toUpdatePayload(
  input: UpdateOrganizationInput
): Partial<ComMiloapisResourcemanagerV1Alpha1Organization> {
  return {
    metadata: {
      resourceVersion: input.resourceVersion,
      annotations: {
        ...(input.displayName && {
          'kubernetes.io/display-name': input.displayName,
        }),
        ...(input.description && {
          'kubernetes.io/description': input.description,
        }),
      },
    },
  };
}

function mapType(type?: string): Organization['type'] {
  switch (type) {
    case 'Personal':
      return 'Personal';
    case 'Enterprise':
      return 'Enterprise';
    default:
      return 'Standard';
  }
}

function mapStatus(state?: string): Organization['status'] {
  switch (state) {
    case 'Ready':
      return 'Active';
    case 'Suspended':
      return 'Suspended';
    case 'Deleting':
      return 'Deleting';
    default:
      return 'Pending';
  }
}
```

### 5. Service Layer (No Server-Side Caching)

```typescript
// app/resources/organizations/organization.service.ts
import {
  toOrganization,
  toOrganizationList,
  toCreatePayload,
  toUpdatePayload,
} from './organization.adapter';
import {
  createOrganizationSchema,
  type Organization,
  type OrganizationList,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from './organization.schema';
import {
  listResourcemanagerMiloapisComV1Alpha1Organization,
  readResourcemanagerMiloapisComV1Alpha1Organization,
  createResourcemanagerMiloapisComV1Alpha1Organization,
  patchResourcemanagerMiloapisComV1Alpha1Organization,
  deleteResourcemanagerMiloapisComV1Alpha1Organization,
} from '~/modules/control-plane/resource-manager';
import { logger } from '~/modules/logger';
import type { PaginationParams } from '~/resources/base/base.schema';
import type { ServiceContext, ServiceOptions } from '~/resources/base/types';
import { parseOrThrow } from '~/utils/errors/error-formatter';
import { mapApiError } from '~/utils/errors/error-mapper';

// Query Keys (for React Query)
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...organizationKeys.lists(), params] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (name: string) => [...organizationKeys.details(), name] as const,
};

const SERVICE_NAME = 'OrganizationService';

export function createOrganizationService(ctx: ServiceContext) {
  return {
    async list(params?: PaginationParams, _options?: ServiceOptions): Promise<OrganizationList> {
      const startTime = Date.now();

      try {
        const response = await listResourcemanagerMiloapisComV1Alpha1Organization({
          query: {
            limit: params?.limit ?? 20,
            continue: params?.cursor,
          },
        });

        if (!response.data) {
          throw new Error('Failed to fetch organizations');
        }

        const result = toOrganizationList(response.data);

        logger.service(SERVICE_NAME, 'list', {
          input: params,
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async get(name: string, _options?: ServiceOptions): Promise<Organization> {
      const startTime = Date.now();

      try {
        const response = await readResourcemanagerMiloapisComV1Alpha1Organization({
          path: { name },
        });

        if (!response.data) {
          throw new Error(`Organization ${name} not found`);
        }

        const result = toOrganization(response.data);

        logger.service(SERVICE_NAME, 'get', {
          input: { name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async create(input: CreateOrganizationInput, options?: ServiceOptions): Promise<Organization> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createOrganizationSchema, input, {
          message: 'Invalid organization data',
          requestId: ctx.requestId,
        });

        const payload = toCreatePayload(validated);

        const response = await createResourcemanagerMiloapisComV1Alpha1Organization({
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        if (!response.data) {
          throw new Error('Failed to create organization');
        }

        const org = toOrganization(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { name: input.name, type: input.type },
          duration: Date.now() - startTime,
        });

        return org;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async update(
      name: string,
      input: UpdateOrganizationInput,
      options?: ServiceOptions
    ): Promise<Organization> {
      const startTime = Date.now();

      try {
        const payload = toUpdatePayload(input);

        const response = await patchResourcemanagerMiloapisComV1Alpha1Organization({
          path: { name },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        if (!response.data) {
          throw new Error('Failed to update organization');
        }

        const org = toOrganization(response.data);

        logger.service(SERVICE_NAME, 'update', {
          input: { name },
          duration: Date.now() - startTime,
        });

        return org;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async delete(name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteResourcemanagerMiloapisComV1Alpha1Organization({
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

export type OrganizationService = ReturnType<typeof createOrganizationService>;
```

### 6. React Query Hooks (Client-Side Caching)

```typescript
// app/resources/organizations/organization.queries.ts
import type {
  Organization,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import { createOrganizationService, organizationKeys } from './organization.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useServiceContext } from '~/providers/service.provider';
import type { PaginationParams } from '~/resources/base/base.schema';

export function useOrganizations(
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<OrganizationList>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createOrganizationService(ctx);

  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => service.list(params),
    ...options,
  });
}

export function useOrganizationsInfinite(params?: { limit?: number }) {
  const ctx = useServiceContext();
  const service = createOrganizationService(ctx);

  return useInfiniteQuery({
    queryKey: organizationKeys.lists(),
    queryFn: ({ pageParam }) => service.list({ cursor: pageParam, limit: params?.limit ?? 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  });
}

export function useOrganization(
  name: string,
  options?: Omit<UseQueryOptions<Organization>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createOrganizationService(ctx);

  return useQuery({
    queryKey: organizationKeys.detail(name),
    queryFn: () => service.get(name),
    enabled: !!name,
    ...options,
  });
}

export function useCreateOrganization(
  options?: UseMutationOptions<Organization, Error, CreateOrganizationInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createOrganizationService(ctx);

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      await service.create(input, { dryRun: true });
      return service.create(input);
    },
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.setQueryData(organizationKeys.detail(newOrg.name), newOrg);
    },
    ...options,
  });
}

export function useUpdateOrganization(
  name: string,
  options?: UseMutationOptions<Organization, Error, UpdateOrganizationInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createOrganizationService(ctx);

  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => service.update(name, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: organizationKeys.detail(name),
      });

      const previous = queryClient.getQueryData<Organization>(organizationKeys.detail(name));

      if (previous) {
        queryClient.setQueryData(organizationKeys.detail(name), {
          ...previous,
          displayName: input.displayName ?? previous.displayName,
          description: input.description ?? previous.description,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(organizationKeys.detail(name), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(name),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.lists(),
      });
    },
    ...options,
  });
}

export function useDeleteOrganization(options?: UseMutationOptions<void, Error, string>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createOrganizationService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: organizationKeys.detail(name),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.lists(),
      });
    },
    ...options,
  });
}
```

### 7. Error System

```typescript
// app/utils/errors/app-error.ts
import * as Sentry from '@sentry/bun';

export interface ErrorDetail {
  path: string[];
  message: string;
  code?: string;
}

export interface SerializedError {
  code: string;
  message: string;
  status: number;
  details?: ErrorDetail[];
  requestId?: string;
  sentryEventId?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: ErrorDetail[];
  public readonly requestId?: string;
  public readonly sentryEventId?: string;

  constructor(
    message: string,
    options: {
      code?: string;
      status?: number;
      details?: ErrorDetail[];
      requestId?: string;
      cause?: unknown;
      captureToSentry?: boolean;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.status = options.status ?? 500;
    this.details = options.details;
    this.requestId = options.requestId;

    if (options.captureToSentry ?? this.status >= 500) {
      this.sentryEventId = this.captureToSentry();
    }
  }

  private captureToSentry(): string {
    return Sentry.captureException(this, {
      tags: {
        error_code: this.code,
        request_id: this.requestId,
      },
      extra: {
        details: this.details,
        status: this.status,
      },
      fingerprint: [this.code, this.message],
    });
  }

  toJSON(): SerializedError {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
      requestId: this.requestId,
      sentryEventId: this.sentryEventId,
    };
  }

  toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[], requestId?: string) {
    super(message, {
      code: 'VALIDATION_ERROR',
      status: 400,
      details,
      requestId,
      captureToSentry: false,
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', requestId?: string) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      status: 401,
      requestId,
      captureToSentry: false,
    });
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied', requestId?: string) {
    super(message, {
      code: 'AUTHORIZATION_ERROR',
      status: 403,
      requestId,
      captureToSentry: false,
    });
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, requestId?: string) {
    const message = identifier ? `${resource} '${identifier}' not found` : `${resource} not found`;
    super(message, {
      code: 'NOT_FOUND',
      status: 404,
      requestId,
      captureToSentry: false,
    });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, requestId?: string) {
    super(message, {
      code: 'CONFLICT',
      status: 409,
      requestId,
      captureToSentry: false,
    });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number, requestId?: string) {
    super('Too many requests', {
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      requestId,
      captureToSentry: false,
    });
    this.name = 'RateLimitError';
  }
}
```

```typescript
// app/utils/errors/error-formatter.ts
import { ValidationError, type ErrorDetail } from './app-error';
import { z } from 'zod';

export function formatZodError(error: z.ZodError): ErrorDetail[] {
  return error.errors.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
    code: issue.code,
  }));
}

export function fromZodError(
  error: z.ZodError,
  message = 'Validation failed',
  requestId?: string
): ValidationError {
  const details = formatZodError(error);
  return new ValidationError(message, details, requestId);
}

export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  data: unknown,
  options?: { message?: string; requestId?: string }
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw fromZodError(result.error, options?.message ?? 'Validation failed', options?.requestId);
  }

  return result.data;
}
```

### 8. Simplified Session Server

```typescript
// app/utils/cookies/session.server.ts
import { redirect } from 'react-router';
import { AuthService, sessionStorage } from '~/utils/auth';
import type { IAccessTokenSession } from '~/utils/auth';

export { sessionStorage };

export async function getValidSession(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  return AuthService.getValidSession(cookieHeader);
}

export async function getSession(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  return AuthService.getSession(cookieHeader);
}

export interface RequireAuthOptions {
  redirectTo?: string;
}

export async function requireAuth(
  request: Request,
  options: RequireAuthOptions = {}
): Promise<{ session: IAccessTokenSession; headers: Headers }> {
  const { redirectTo = '/auth/login' } = options;

  const { session, headers } = await AuthService.getValidSession(request.headers.get('Cookie'));

  if (!session) {
    const url = new URL(request.url);
    const returnTo = url.pathname + url.search;
    const loginUrl = `${redirectTo}?returnTo=${encodeURIComponent(returnTo)}`;

    throw redirect(loginUrl, { headers });
  }

  return { session, headers };
}

export async function redirectIfAuthenticated(
  request: Request,
  redirectTo = '/dashboard'
): Promise<void> {
  const { session, headers } = await AuthService.getValidSession(request.headers.get('Cookie'));

  if (session) {
    throw redirect(redirectTo, { headers });
  }
}

export async function setSession(
  request: Request,
  sessionData: IAccessTokenSession
): Promise<Headers> {
  const cookieHeader = request.headers.get('Cookie');
  return AuthService.setSession(cookieHeader, sessionData);
}

export async function logout(
  request: Request,
  options: { redirectTo?: string; idToken?: string } = {}
): Promise<never> {
  const { redirectTo = '/auth/login', idToken } = options;

  const cookieHeader = request.headers.get('Cookie');
  const headers = await AuthService.logout(cookieHeader, idToken);

  throw redirect(redirectTo, { headers });
}

export async function destroySession(request: Request): Promise<Headers> {
  const cookieHeader = request.headers.get('Cookie');
  return AuthService.destroySession(cookieHeader);
}
```

### 9. Logger Module

```typescript
// app/modules/logger/logger.config.ts
import { isProduction, isDevelopment } from '~/utils/config/env.config';

export const LOGGER_CONFIG = {
  level: isProduction() ? 'info' : 'debug',
  format: isProduction() ? 'json' : 'pretty',
  logPayloads: isDevelopment(),
  maxPayloadSize: 10_000,
  redactFields: ['password', 'secret'],
  includeStackTrace: isDevelopment(),
  logCurl: isDevelopment(),
} as const;
```

```typescript
// app/modules/logger/curl.generator.ts
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export interface CurlOptions {
  prettyPrint?: boolean;
}

export function generateCurl(
  config: AxiosRequestConfig | InternalAxiosRequestConfig,
  options: CurlOptions = {}
): string {
  const { prettyPrint = true } = options;

  const parts: string[] = ['curl'];

  const method = (config.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    parts.push(`-X ${method}`);
  }

  const url = buildUrl(config);
  parts.push(`'${url}'`);

  const headers = config.headers ?? {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    parts.push(`-H '${key}: ${value}'`);
  }

  if (config.data) {
    let body: string;

    if (typeof config.data === 'string') {
      body = config.data;
    } else {
      body = prettyPrint ? JSON.stringify(config.data, null, 2) : JSON.stringify(config.data);
    }

    body = body.replace(/'/g, "'\\''");

    if (prettyPrint && body.includes('\n')) {
      parts.push(`-d $'${body}'`);
    } else {
      parts.push(`-d '${body}'`);
    }
  }

  return parts.join(' \\\n  ');
}

function buildUrl(config: AxiosRequestConfig | InternalAxiosRequestConfig): string {
  let url = config.url ?? '';

  if (config.baseURL && !url.startsWith('http')) {
    url = `${config.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  if (config.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  return url;
}
```

### 10. Auth Middleware (Hono)

```typescript
// app/server/middleware/auth.ts
import * as Sentry from '@sentry/bun';
import { createMiddleware } from 'hono/factory';
import type { Variables } from '~/server/types';
import { AuthService } from '~/utils/auth/auth.service';
import { AuthenticationError } from '~/utils/errors/app-error';

export function authMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const requestId = c.get('requestId');
    const cookieHeader = c.req.header('Cookie') ?? null;

    const { session, headers, refreshed } = await AuthService.getValidSession(cookieHeader);

    if (!session) {
      throw new AuthenticationError('Authentication required', requestId);
    }

    c.set('session', session);

    if (refreshed) {
      headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          c.header('Set-Cookie', value, { append: true });
        }
      });
    }

    Sentry.setUser({ id: session.sub });

    await next();
  });
}

export function optionalAuthMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const cookieHeader = c.req.header('Cookie') ?? null;

    const { session, headers, refreshed } = await AuthService.getValidSession(cookieHeader);

    if (session) {
      c.set('session', session);

      if (refreshed) {
        headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') {
            c.header('Set-Cookie', value, { append: true });
          }
        });
      }

      Sentry.setUser({ id: session.sub });
    }

    await next();
  });
}
```

---

## Migration Phases

### Phase 1: Foundation

```bash
# Install dependencies
bun add hono @hono/node-server react-router-hono-server zod@next
```

Tasks:

- [x] Create `app/server/` directory structure
- [x] Create logger module (`app/modules/logger/`)
- [x] Create error system (`app/utils/errors/`)
- [x] Create base utilities (`app/resources/base/`)

### Phase 2: Organization Resource

Tasks:

- [ ] Create `app/resources/organizations/organization.schema.ts`
- [ ] Create `app/resources/organizations/organization.adapter.ts`
- [ ] Create `app/resources/organizations/organization.service.ts`
- [ ] Create `app/resources/organizations/organization.queries.ts`
- [ ] Create `app/resources/organizations/index.ts`
- [ ] Simplify `app/utils/cookies/session.server.ts`

### Phase 3: Project Resource

Tasks:

- [ ] Create `app/resources/projects/project.schema.ts`
- [ ] Create `app/resources/projects/project.adapter.ts`
- [ ] Create `app/resources/projects/project.service.ts`
- [ ] Create `app/resources/projects/project.queries.ts`
- [ ] Create `app/resources/projects/index.ts`
- [ ] Create `app/providers/service.provider.tsx`
- [ ] Update `app/root.tsx` with QueryClientProvider

### Phase 4: Hono Server

Tasks:

- [ ] Create `app/server/entry.ts`
- [ ] Create `app/server/types.ts`
- [ ] Create `app/server/sentry.server.ts`
- [ ] Create `app/server/middleware/` (auth, logger, error-handler, rate-limit, sentry-tracing)
- [ ] Update `vite.config.ts` with react-router-hono-server plugin

### Phase 5: Route Migration

Tasks:

- [ ] Update organization routes to use services
- [ ] Update project routes to use services
- [ ] Test SSR prefetch + CSR hydration

### Phase 6: Expand to All Domains

Priority order:

1. DNS zones, DNS records
2. Compute (workloads, instances, deployments)
3. Networking (gateways, routes, load-balancers)
4. Others (quotas, telemetry, metrics)

### Phase 7: Cleanup

Remove files:

- [ ] `server.ts` (old Express entry)
- [ ] `app/routes/api/` (all BFF routes)
- [ ] `app/resources/schemas/` (old Zod schemas)
- [ ] `app/resources/interfaces/` (old interfaces)
- [ ] `app/resources/control-plane/` (old control operations)
- [ ] `app/utils/middlewares/` (old Express middleware)

Remove packages:

```bash
bun remove express @types/express helmet morgan compression express-rate-limit @react-router/express
```

Update scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "bun ./build/server/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  }
}
```

Update `vite.config.ts`:

```typescript
import { reactRouter } from '@react-router/dev/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouterHonoServer({ runtime: 'bun' }), reactRouter()],
});
```

---

## Decisions Summary

| Decision           | Choice                            | Rationale                      |
| ------------------ | --------------------------------- | ------------------------------ |
| Migration strategy | Clean break                       | Avoid two-system complexity    |
| SSR/CSR balance    | Hybrid prefetch                   | Best of both worlds            |
| Schema layer       | Domain-driven + adapters          | Decouples UI from K8s API      |
| HTTP client        | Keep @hey-api/client-axios        | Minimize changes               |
| BFF pattern        | Thin service layer                | Direct calls, no HTTP overhead |
| Pagination         | Hybrid (server for orgs/projects) | Scalable where needed          |
| Caching            | React Query (client-side only)    | Per-user isolation             |
| Errors             | Unified AppError + Zod v4         | Single error pattern           |
| Auth               | remix-hono + existing AuthService | Smooth migration               |
| External API       | Minimal (health, metrics)         | No CRUD exposure               |
| Logging            | Structured + CURL (dev)           | Easy debugging                 |
