# Data-Driven Architecture Refactor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor cloud-portal from Express to Hono with centralized data management using React Query and Zod v4 domain schemas.

**Architecture:** Hono server (via react-router-hono-server) with thin service layer. Each resource (organizations, projects, etc.) has its own folder containing schema, adapter, service, and React Query hooks. React Query provides client-side caching with K8s Watch for real-time updates.

**Tech Stack:** Hono, React Router v7, React Query, Zod v4, Sentry, Bun runtime

---

## Phase 1: Foundation

### Task 1.1: Install Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install Hono and server dependencies**

Run:

```bash
bun add hono @hono/prometheus react-router-hono-server
```

Expected: Dependencies added to package.json

**Step 2: Install Zod v4**

Run:

```bash
bun add zod@next
```

Expected: Zod 4.x added (check version is 4.x)

**Step 3: Verify installation**

Run:

```bash
bun pm ls | grep -E "hono|zod"
```

Expected: Both packages listed

**Step 4: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add Hono and Zod v4 dependencies"
```

---

### Task 1.2: Create Error System - AppError Class

**Files:**

- Create: `app/utils/errors/app-error.ts`

**Step 1: Create the errors directory**

Run:

```bash
mkdir -p /Users/yahya/Works/datum/cloud-portal/app/utils/errors
```

**Step 2: Write AppError class**

Create `app/utils/errors/app-error.ts`:

```typescript
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

**Step 3: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors in app-error.ts

**Step 4: Commit**

```bash
git add app/utils/errors/app-error.ts
git commit -m "feat(errors): add unified AppError class with Sentry integration"
```

---

### Task 1.3: Create Error System - Error Formatter

**Files:**

- Create: `app/utils/errors/error-formatter.ts`

**Step 1: Write error formatter**

Create `app/utils/errors/error-formatter.ts`:

```typescript
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

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/utils/errors/error-formatter.ts
git commit -m "feat(errors): add Zod error formatter utilities"
```

---

### Task 1.4: Create Error System - Error Mapper

**Files:**

- Create: `app/utils/errors/error-mapper.ts`

**Step 1: Write error mapper**

Create `app/utils/errors/error-mapper.ts`:

```typescript
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ValidationError,
} from './app-error';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: Array<{ path: string[]; message: string }>;
}

export function mapApiError(error: unknown, requestId?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 500;
    const data = error.response?.data as ApiErrorResponse | undefined;
    const message = data?.message ?? error.message ?? 'An error occurred';

    switch (status) {
      case 400:
        return new ValidationError(message, data?.details, requestId);
      case 401:
        return new AuthenticationError(message, requestId);
      case 403:
        return new AuthorizationError(message, requestId);
      case 404:
        return new NotFoundError('Resource', undefined, requestId);
      case 409:
        return new ConflictError(message, requestId);
      case 429:
        return new RateLimitError(undefined, requestId);
      default:
        return new AppError(message, {
          code: data?.code ?? 'API_ERROR',
          status,
          requestId,
          cause: error,
        });
    }
  }

  if (error instanceof Error) {
    return new AppError(error.message, {
      code: 'INTERNAL_ERROR',
      status: 500,
      requestId,
      cause: error,
    });
  }

  return new AppError('An unexpected error occurred', {
    code: 'UNKNOWN_ERROR',
    status: 500,
    requestId,
    cause: error,
  });
}
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/utils/errors/error-mapper.ts
git commit -m "feat(errors): add API error mapper for Axios errors"
```

---

### Task 1.5: Create Error System - Index Export

**Files:**

- Create: `app/utils/errors/index.ts`

**Step 1: Write index file**

Create `app/utils/errors/index.ts`:

```typescript
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  type ErrorDetail,
  type SerializedError,
} from './app-error';

export { formatZodError, fromZodError, parseOrThrow } from './error-formatter';

export { mapApiError } from './error-mapper';
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/utils/errors/index.ts
git commit -m "feat(errors): add barrel export for error utilities"
```

---

### Task 1.6: (Not applicable)

The architecture uses React Query for client-side caching. Services make direct API calls to the control plane. K8s Watch provides real-time updates.

---

### Task 1.7: Create Logger Module - Config

**Files:**

- Create: `app/modules/logger/logger.config.ts`

**Step 1: Create the logger directory**

Run:

```bash
mkdir -p /Users/yahya/Works/datum/cloud-portal/app/modules/logger
```

**Step 2: Write logger config**

Create `app/modules/logger/logger.config.ts`:

```typescript
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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

**Step 3: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 4: Commit**

```bash
git add app/modules/logger/logger.config.ts
git commit -m "feat(logger): add logger configuration"
```

---

### Task 1.8: Create Logger Module - CURL Generator

**Files:**

- Create: `app/modules/logger/curl.generator.ts`

**Step 1: Write CURL generator**

Create `app/modules/logger/curl.generator.ts`:

```typescript
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

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/curl.generator.ts
git commit -m "feat(logger): add CURL command generator for API debugging"
```

---

### Task 1.9: Create Logger Module - Logger Types

**Files:**

- Create: `app/modules/logger/logger.types.ts`

**Step 1: Write logger types**

Create `app/modules/logger/logger.types.ts`:

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface ServiceLogData {
  input?: unknown;
  duration: number;
}

export interface RequestLogData {
  method: string;
  path: string;
  status: number;
  duration: number;
  userAgent?: string;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  service(name: string, method: string, data: ServiceLogData): void;
  request(data: RequestLogData): void;
}
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/logger.types.ts
git commit -m "feat(logger): add logger type definitions"
```

---

### Task 1.10: Create Logger Module - Main Logger

**Files:**

- Create: `app/modules/logger/logger.ts`

**Step 1: Write main logger**

Create `app/modules/logger/logger.ts`:

```typescript
import { LOGGER_CONFIG, type LogLevel } from './logger.config';
import type { Logger, LogContext, ServiceLogData, RequestLogData } from './logger.types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOGGER_CONFIG.level as LogLevel];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();

  if (LOGGER_CONFIG.format === 'json') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...context,
    });
  }

  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${prefix} ${message}${contextStr}`;
}

function formatServiceLog(name: string, method: string, data: ServiceLogData): string {
  if (LOGGER_CONFIG.format === 'json') {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'service',
      service: name,
      method,
      duration: data.duration,
      input: LOGGER_CONFIG.logPayloads ? data.input : undefined,
    });
  }

  return `[${name}.${method}] ${data.duration}ms`;
}

function formatRequestLog(data: RequestLogData): string {
  if (LOGGER_CONFIG.format === 'json') {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'request',
      ...data,
    });
  }

  return `${data.method} ${data.path} ${data.status} ${data.duration}ms`;
}

export const logger: Logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, error?: Error, context?: LogContext): void {
    if (shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error?.message,
        stack: LOGGER_CONFIG.includeStackTrace ? error?.stack : undefined,
      };
      console.error(formatMessage('error', message, errorContext));
    }
  },

  service(name: string, method: string, data: ServiceLogData): void {
    if (shouldLog('info')) {
      console.info(formatServiceLog(name, method, data));
    }
  },

  request(data: RequestLogData): void {
    if (shouldLog('info')) {
      console.info(formatRequestLog(data));
    }
  },
};
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/logger.ts
git commit -m "feat(logger): add structured logger implementation"
```

---

### Task 1.11: Create Logger Module - Index Export

**Files:**

- Create: `app/modules/logger/index.ts`

**Step 1: Write index file**

Create `app/modules/logger/index.ts`:

```typescript
export { logger } from './logger';
export { LOGGER_CONFIG } from './logger.config';
export { generateCurl } from './curl.generator';
export type { Logger, LogLevel, LogContext, ServiceLogData, RequestLogData } from './logger.types';
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/index.ts
git commit -m "feat(logger): add barrel export for logger module"
```

---

### Task 1.12: Create Resources Base - Types

**Files:**

- Create: `app/resources/base/types.ts`

**Step 1: Create the resources/base directory**

Run:

```bash
mkdir -p /Users/yahya/Works/datum/cloud-portal/app/resources/base
```

**Step 2: Write base types**

Create `app/resources/base/types.ts`:

```typescript
import type { ControlPlaneClient } from '~/modules/control-plane';

export interface ServiceContext {
  requestId: string;
  controlPlaneClient: ControlPlaneClient;
  accessToken?: string;
}

export interface ServiceOptions {
  dryRun?: boolean;
}
```

**Step 3: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 4: Commit**

```bash
git add app/resources/base/types.ts
git commit -m "feat(resources): add base service types"
```

---

### Task 1.13: Cache utilities

Services make direct API calls to the control plane. React Query handles all caching client-side. K8s Watch provides real-time updates.

---

### Task 1.14: Create Resources Base - Base Schema

**Files:**

- Create: `app/resources/base/base.schema.ts`

**Step 1: Write base schema**

Create `app/resources/base/base.schema.ts`:

```typescript
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

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/resources/base/base.schema.ts
git commit -m "feat(resources): add base Zod schemas for pagination and metadata"
```

---

### Task 1.15: Create Resources Base - Index Export

**Files:**

- Create: `app/resources/base/index.ts`

**Step 1: Write index file**

Create `app/resources/base/index.ts`:

```typescript
export type { ServiceContext, ServiceOptions } from './types';

export {
  paginationParamsSchema,
  paginatedResponseSchema,
  resourceMetadataSchema,
  type PaginationParams,
  type PaginatedResponse,
  type ResourceMetadata,
} from './base.schema';
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/resources/base/index.ts
git commit -m "feat(resources): add barrel export for base utilities"
```

---

### Task 1.16: Run Full Typecheck and Verify Phase 1

**Step 1: Run full typecheck**

Run:

```bash
bun run typecheck
```

Expected: No type errors related to new files

**Step 2: Run lint**

Run:

```bash
bun run lint
```

Expected: No lint errors (fix any that appear)

**Step 3: Commit phase completion**

```bash
git add -A
git commit -m "chore: complete Phase 1 - Foundation setup"
```

---

## Phase 2: Organization Resource

### Task 2.1: Create Organization Schema

**Files:**

- Create: `app/resources/organizations/organization.schema.ts`

**Step 1: Create the organizations directory**

Run:

```bash
mkdir -p /Users/yahya/Works/datum/cloud-portal/app/resources/organizations
```

**Step 2: Write organization schema**

Create `app/resources/organizations/organization.schema.ts`:

```typescript
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

**Step 3: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 4: Commit**

```bash
git add app/resources/organizations/organization.schema.ts
git commit -m "feat(organizations): add Zod v4 organization schemas"
```

---

### Task 2.2: Create Organization Adapter

**Files:**

- Create: `app/resources/organizations/organization.adapter.ts`

**Step 1: Write organization adapter**

Create `app/resources/organizations/organization.adapter.ts`:

```typescript
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

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors (may need to adjust types based on actual control-plane types)

**Step 3: Commit**

```bash
git add app/resources/organizations/organization.adapter.ts
git commit -m "feat(organizations): add API to domain adapter"
```

---

### Task 2.3: Create Organization Service

**Files:**

- Create: `app/resources/organizations/organization.service.ts`

**Step 1: Write organization service**

Create `app/resources/organizations/organization.service.ts`:

```typescript
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
  const client = ctx.controlPlaneClient;

  return {
    async list(params?: PaginationParams, _options?: ServiceOptions): Promise<OrganizationList> {
      const startTime = Date.now();

      try {
        const response = await listResourcemanagerMiloapisComV1Alpha1Organization({
          client,
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
          client,
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
          client,
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
          client,
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

export type OrganizationService = ReturnType<typeof createOrganizationService>;
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors (may need adjustments based on control-plane API)

**Step 3: Commit**

```bash
git add app/resources/organizations/organization.service.ts
git commit -m "feat(organizations): add organization service layer"
```

---

### Task 2.4: Create Organization React Query Hooks

**Files:**

- Create: `app/resources/organizations/organization.queries.ts`

**Step 1: Write React Query hooks**

Create `app/resources/organizations/organization.queries.ts`:

```typescript
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

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: Errors about missing service.provider.tsx (we'll create it next phase)

**Step 3: Commit**

```bash
git add app/resources/organizations/organization.queries.ts
git commit -m "feat(organizations): add React Query hooks for organizations"
```

---

### Task 2.5: Create Organization Index Export

**Files:**

- Create: `app/resources/organizations/index.ts`

**Step 1: Write index file**

Create `app/resources/organizations/index.ts`:

```typescript
// Schema exports
export {
  organizationSchema,
  organizationListSchema,
  organizationTypeSchema,
  organizationStatusSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  type Organization,
  type OrganizationList,
  type OrganizationType,
  type OrganizationStatus,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from './organization.schema';

// Adapter exports
export {
  toOrganization,
  toOrganizationList,
  toCreatePayload,
  toUpdatePayload,
} from './organization.adapter';

// Service exports
export {
  createOrganizationService,
  organizationKeys,
  type OrganizationService,
} from './organization.service';

// Query hook exports
export {
  useOrganizations,
  useOrganizationsInfinite,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from './organization.queries';
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: May have errors until service.provider.tsx is created

**Step 3: Commit**

```bash
git add app/resources/organizations/index.ts
git commit -m "feat(organizations): add barrel export for organization resource"
```

---

## Phase 3: Service Provider & React Query Setup

### Task 3.1: Create Service Provider

**Files:**

- Create: `app/providers/service.provider.tsx`

**Step 1: Write service provider**

Create `app/providers/service.provider.tsx`:

```typescript
import { createContext, useContext, type ReactNode } from 'react';
import type { ServiceContext } from '~/resources/base/types';

const ServiceContextValue = createContext<ServiceContext | null>(null);

interface ServiceProviderProps {
  context: ServiceContext;
  children: ReactNode;
}

export function ServiceProvider({ context, children }: ServiceProviderProps) {
  return (
    <ServiceContextValue.Provider value={context}>
      {children}
    </ServiceContextValue.Provider>
  );
}

export function useServiceContext(): ServiceContext {
  const context = useContext(ServiceContextValue);

  if (!context) {
    throw new Error('useServiceContext must be used within a ServiceProvider');
  }

  return context;
}
```

**Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add app/providers/service.provider.tsx
git commit -m "feat(providers): add ServiceProvider for resource context"
```

---

### Task 3.2: Run Full Typecheck for Phase 2 & 3

**Step 1: Run full typecheck**

Run:

```bash
bun run typecheck
```

Expected: No type errors

**Step 2: Run lint**

Run:

```bash
bun run lint
```

Expected: No lint errors

**Step 3: Commit phase completion**

```bash
git add -A
git commit -m "chore: complete Phase 2 & 3 - Organization resource and providers"
```

---

## Remaining Phases (Summary)

The remaining phases follow the same pattern. Each creates:

### Phase 4: Hono Server

- `app/server/types.ts`
- `app/server/sentry.server.ts`
- `app/server/middleware/auth.ts`
- `app/server/middleware/logger.ts`
- `app/server/middleware/error-handler.ts`
- `app/server/middleware/rate-limit.ts`
- `app/server/middleware/sentry-tracing.ts`
- `app/server/entry.ts`
- Update `vite.config.ts`

### Phase 5: Route Migration

- Update organization routes to use new services
- Update project routes to use new services
- Test SSR prefetch + CSR hydration

### Phase 6: Expand to All Domains

- DNS zones/records
- Compute resources
- Networking resources
- Other resources

### Phase 7: Cleanup

- Remove `server.ts` (old Express server)
- Remove `app/routes/api/` (BFF routes)
- Remove old schemas and interfaces
- Remove Express packages
- Update package.json scripts

---

## Notes for Implementation

1. **Run typecheck after each file** - Catch errors early
2. **Commit frequently** - Small, focused commits
3. **Test in dev** - Run `bun run dev` periodically to verify
4. **Control-plane types** - May need adjustments based on actual API types
5. **Client-side caching** - React Query handles all caching in the browser
6. **Real-time updates** - K8s Watch API provides real-time updates
