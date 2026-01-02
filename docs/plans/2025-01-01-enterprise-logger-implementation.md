# Enterprise Logger Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a centralized, context-aware logging system with full observability integration (Grafana Loki, Sentry, Jaeger tracing).

**Architecture:** Logger class with child context pattern. Formatters for pretty (dev) and JSON (prod) output. Sentry integration for breadcrumbs and context. Curl generator with token redaction.

**Tech Stack:** TypeScript, Hono middleware, Sentry SDK, Axios interceptors

---

## Phase 1: Logger Core

### Task 1.1: Update Logger Types

**Files:**

- Modify: `app/modules/logger/logger.types.ts`

**Step 1: Replace logger types with new interfaces**

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  // Correlation IDs (OpenTelemetry compatible)
  requestId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;

  // User context
  userId?: string;
  sessionId?: string;
  organizationId?: string;

  // Request context
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;

  // Log type for filtering
  type?: 'request' | 'api' | 'service' | 'log';

  // Extensible
  [key: string]: unknown;
}

export interface LogData {
  [key: string]: unknown;
}

export interface RequestLogData {
  status: number;
  duration: number;
}

export interface ApiLogData {
  method: string;
  url: string;
  status: number;
  duration?: number;
  curl?: string;
}

export interface ServiceLogData {
  duration: number;
  cached?: boolean;
  input?: unknown;
}
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors related to logger.types.ts

**Step 3: Commit**

```bash
git add app/modules/logger/logger.types.ts
git commit -m "refactor(logger): update types for enterprise logger"
```

---

### Task 1.2: Update Logger Config

**Files:**

- Modify: `app/modules/logger/logger.config.ts`

**Step 1: Add new environment-based configuration**

```typescript
import { isProduction, isDevelopment } from '@/utils/config/env.config';

export type LogFormat = 'json' | 'pretty' | 'compact';

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: LogFormat;
  logCurl: boolean;
  redactTokens: boolean;
  logPayloads: boolean;
  includeStackTrace: boolean;
}

function getLogLevel(): LoggerConfig['level'] {
  const env = process.env.LOG_LEVEL;
  if (env && ['debug', 'info', 'warn', 'error'].includes(env)) {
    return env as LoggerConfig['level'];
  }
  return isProduction() ? 'info' : 'debug';
}

function getLogFormat(): LogFormat {
  const env = process.env.LOG_FORMAT;
  if (env && ['json', 'pretty', 'compact'].includes(env)) {
    return env as LogFormat;
  }
  return isProduction() ? 'json' : 'pretty';
}

export const LOGGER_CONFIG: LoggerConfig = {
  level: getLogLevel(),
  format: getLogFormat(),
  logCurl: process.env.LOG_CURL !== 'false' && isDevelopment(),
  redactTokens: process.env.LOG_REDACT_TOKENS !== 'false' || isProduction(),
  logPayloads: process.env.LOG_PAYLOADS === 'true' || isDevelopment(),
  includeStackTrace: isDevelopment(),
};
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/logger.config.ts
git commit -m "refactor(logger): add environment-based config"
```

---

### Task 1.3: Create Formatters Directory

**Files:**

- Create: `app/modules/logger/formatters/pretty.ts`
- Create: `app/modules/logger/formatters/json.ts`
- Create: `app/modules/logger/formatters/index.ts`

**Step 1: Create pretty formatter**

```typescript
// app/modules/logger/formatters/pretty.ts
import type { LogLevel, LogContext } from '../logger.types';

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

export function formatPretty(level: LogLevel, message: string, context?: LogContext): string {
  const color = COLORS[level];
  const levelStr = level.toUpperCase().padEnd(5);
  const prefix = `${color}[${levelStr}]${RESET}`;

  let output = `${prefix} ${message}`;

  // Add curl on separate line if present
  if (context?.curl) {
    const { curl, ...rest } = context;
    if (Object.keys(rest).length > 0) {
      output += ` ${DIM}${JSON.stringify(rest)}${RESET}`;
    }
    output += `\n${DIM}  curl: ${curl}${RESET}`;
  } else if (context && Object.keys(context).length > 0) {
    output += ` ${DIM}${JSON.stringify(context)}${RESET}`;
  }

  return output;
}
```

**Step 2: Create JSON formatter**

```typescript
// app/modules/logger/formatters/json.ts
import { LOGGER_CONFIG } from '../logger.config';
import type { LogLevel, LogContext } from '../logger.types';

export function formatJson(level: LogLevel, message: string, context?: LogContext): string {
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...context,
  };

  // Redact tokens in curl commands
  if (entry.curl && LOGGER_CONFIG.redactTokens) {
    entry.curl = redactTokens(entry.curl as string);
  }

  return JSON.stringify(entry);
}

function redactTokens(str: string): string {
  // Redact Bearer tokens
  return str.replace(/(Authorization[:\s]*Bearer\s+)[^\s'"]*/gi, '$1[REDACTED]');
}
```

**Step 3: Create formatter index**

```typescript
// app/modules/logger/formatters/index.ts
import { LOGGER_CONFIG } from '../logger.config';
import type { LogLevel, LogContext } from '../logger.types';
import { formatJson } from './json';
import { formatPretty } from './pretty';

export function format(level: LogLevel, message: string, context?: LogContext): string {
  if (LOGGER_CONFIG.format === 'json') {
    return formatJson(level, message, context);
  }
  return formatPretty(level, message, context);
}

export { formatPretty, formatJson };
```

**Step 4: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add app/modules/logger/formatters/
git commit -m "feat(logger): add pretty and JSON formatters"
```

---

### Task 1.4: Create Sentry Integration

**Files:**

- Create: `app/modules/logger/integrations/sentry.ts`

**Step 1: Create Sentry helpers**

```typescript
// app/modules/logger/integrations/sentry.ts
import type { LogLevel, LogContext } from '../logger.types';
import * as Sentry from '@sentry/react-router';

const LEVEL_TO_SENTRY: Record<LogLevel, Sentry.SeverityLevel> = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

export function addBreadcrumb(
  level: LogLevel,
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  // Skip debug logs - too verbose for Sentry
  if (level === 'debug') return;

  Sentry.addBreadcrumb({
    category,
    message,
    level: LEVEL_TO_SENTRY[level],
    data,
  });
}

export function setLoggerContext(context: LogContext): void {
  if (context.requestId) {
    Sentry.setTag('requestId', context.requestId);
  }
  if (context.organizationId) {
    Sentry.setTag('organizationId', context.organizationId);
  }
  if (context.userId) {
    Sentry.setUser({ id: context.userId });
  }
  if (context.path || context.method) {
    Sentry.setContext('request', {
      path: context.path,
      method: context.method,
      userAgent: context.userAgent,
    });
  }
}

export function captureError(message: string, error: Error, context?: LogContext): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context as Record<string, unknown>);
    }
    scope.setLevel('error');
    Sentry.captureException(error, {
      extra: { message },
    });
  });
}
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/integrations/
git commit -m "feat(logger): add Sentry integration helpers"
```

---

### Task 1.5: Create Curl Generator

**Files:**

- Create: `app/modules/logger/integrations/curl.ts`

**Step 1: Create curl generator with redaction**

```typescript
// app/modules/logger/integrations/curl.ts
import { LOGGER_CONFIG } from '../logger.config';

export interface CurlOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export function generateCurl(options: CurlOptions): string {
  const { method, url, headers, body } = options;

  let curl = `curl -X ${method.toUpperCase()}`;

  // Add headers
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      let headerValue = value;

      // Redact authorization tokens in production
      if (LOGGER_CONFIG.redactTokens && key.toLowerCase() === 'authorization') {
        headerValue = value.replace(/Bearer\s+\S+/i, 'Bearer [REDACTED]');
      }

      // Use single quotes to prevent shell glob expansion
      const escapedValue = headerValue.replace(/'/g, "'\\''");
      curl += ` -H '${key}:${escapedValue}'`;
    }
  }

  // Add body
  if (body && method.toUpperCase() !== 'GET') {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const escapedBody = bodyStr.replace(/'/g, "'\\''");
    curl += ` --data '${escapedBody}'`;
  }

  // Add URL (double quotes for safety)
  curl += ` "${url}"`;

  return curl;
}
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/integrations/curl.ts
git commit -m "feat(logger): add curl generator with token redaction"
```

---

### Task 1.6: Create Logger Class

**Files:**

- Modify: `app/modules/logger/logger.ts`

**Step 1: Replace with Logger class implementation**

```typescript
// app/modules/logger/logger.ts
import { format } from './formatters';
import { addBreadcrumb, setLoggerContext, captureError } from './integrations/sentry';
import { LOGGER_CONFIG } from './logger.config';
import type {
  LogLevel,
  LogContext,
  LogData,
  RequestLogData,
  ApiLogData,
  ServiceLogData,
} from './logger.types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const merged = { ...this.context, ...context };
    const child = new Logger(merged);

    // Set Sentry context when creating request-scoped logger
    if (context.requestId) {
      setLoggerContext(merged);
    }

    return child;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOGGER_CONFIG.level];
  }

  private log(level: LogLevel, message: string, data?: LogData): void {
    if (!this.shouldLog(level)) return;

    const context = { ...this.context, ...data };
    const output = format(level, message, context);
    console.log(output);

    // Add breadcrumb for Sentry (except debug)
    if (level !== 'debug') {
      addBreadcrumb(level, message, context.type || 'log', data);
    }
  }

  debug(message: string, data?: LogData): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogData): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogData): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | LogData, data?: LogData): void {
    if (error instanceof Error) {
      const errorData: LogData = {
        error: error.message,
        ...(LOGGER_CONFIG.includeStackTrace && { stack: error.stack }),
        ...data,
      };
      this.log('error', message, errorData);
      captureError(message, error, { ...this.context, ...data });
    } else {
      this.log('error', message, { ...error, ...data });
    }
  }

  /**
   * Log incoming HTTP request
   */
  request(data: RequestLogData): void {
    const reqId = this.context.requestId ? `[${this.context.requestId.slice(0, 8)}] ` : '';
    const message = `${reqId}${this.context.method} ${this.context.path} ${data.status} ${data.duration}ms`;

    this.log('info', message, {
      type: 'request',
      status: data.status,
      duration: data.duration,
    });
  }

  /**
   * Log outgoing API call
   */
  api(data: ApiLogData): void {
    const durationStr = data.duration ? ` ${data.duration}ms` : '';
    const message = `→ ${data.method} ${data.url} ${data.status}${durationStr}`;

    this.log('info', message, {
      type: 'api',
      ...(data.curl && LOGGER_CONFIG.logCurl && { curl: data.curl }),
    });
  }

  /**
   * Log failed API call
   */
  apiError(data: ApiLogData & { error: Error }): void {
    const message = `→ ${data.method} ${data.url} ${data.status}`;

    this.error(message, data.error, {
      type: 'api',
      ...(data.curl && LOGGER_CONFIG.logCurl && { curl: data.curl }),
    });
  }

  /**
   * Log service layer operation
   */
  service(name: string, method: string, data: ServiceLogData): void {
    const cached = data.cached ? ' (cached)' : '';
    const message = `[${name}.${method}] ${data.duration}ms${cached}`;

    this.log('info', message, {
      type: 'service',
      duration: data.duration,
      cached: data.cached,
      ...(LOGGER_CONFIG.logPayloads && data.input && { input: data.input }),
    });
  }
}

// Default logger instance
export const logger = new Logger();
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/logger.ts
git commit -m "feat(logger): implement Logger class with context and Sentry"
```

---

### Task 1.7: Update Logger Index

**Files:**

- Modify: `app/modules/logger/index.ts`

**Step 1: Update exports**

```typescript
// app/modules/logger/index.ts
export { Logger, logger } from './logger';
export { LOGGER_CONFIG } from './logger.config';
export { generateCurl } from './integrations/curl';
export type {
  LogLevel,
  LogContext,
  LogData,
  RequestLogData,
  ApiLogData,
  ServiceLogData,
} from './logger.types';

// Utility: Create request-scoped logger
export function createRequestLogger(context: {
  requestId: string;
  traceId?: string;
  spanId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
}) {
  return new (require('./logger').Logger)(context);
}
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/logger/index.ts
git commit -m "feat(logger): update exports with utility functions"
```

---

## Phase 2: Integration

### Task 2.1: Update Hono Server Types

**Files:**

- Modify: `app/server/types.ts`

**Step 1: Add logger to Variables**

```typescript
// app/server/types.ts
import type { ControlPlaneClient } from '@/modules/control-plane/control-plane.factory';
import type { Logger } from '@/modules/logger';
import type { IAccessTokenSession } from '@/utils/auth/auth.types';

export interface Variables {
  requestId: string;
  secureHeadersNonce: string;
  session: IAccessTokenSession | null;
  controlPlaneClient: ControlPlaneClient;
  userScopedClient: ControlPlaneClient;
  logger: Logger; // Add logger
}
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/server/types.ts
git commit -m "refactor(server): add logger to Variables type"
```

---

### Task 2.2: Update Logger Middleware

**Files:**

- Modify: `app/server/middleware/logger.ts`

**Step 1: Replace with child logger pattern**

```typescript
// app/server/middleware/logger.ts
import { Logger } from '@/modules/logger';
import type { Variables } from '@/server/types';
import * as Sentry from '@sentry/react-router';
import { createMiddleware } from 'hono/factory';

export function loggerMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const start = Date.now();
    const requestId = c.get('requestId') ?? crypto.randomUUID();

    // Get trace context from Sentry
    const propagationContext = Sentry.getCurrentScope().getPropagationContext();

    // Create request-scoped logger
    const reqLogger = new Logger({
      requestId,
      traceId: propagationContext.traceId,
      spanId: propagationContext.spanId,
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP'),
    });

    c.set('logger', reqLogger);

    await next();

    const duration = Date.now() - start;

    reqLogger.request({
      status: c.res.status,
      duration,
    });
  });
}
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/server/middleware/logger.ts
git commit -m "refactor(middleware): use child logger pattern with tracing"
```

---

### Task 2.3: Update Control Plane Factory

**Files:**

- Modify: `app/modules/control-plane/control-plane.factory.ts`

**Step 1: Replace with logger integration**

```typescript
// app/modules/control-plane/control-plane.factory.ts
import { AxiosCurlLibrary } from './axios-curl';
import { logger as rootLogger, generateCurl } from '@/modules/logger';
import { LOGGER_CONFIG } from '@/modules/logger/logger.config';
import { AppError } from '@/utils/errors';
import { mapAxiosErrorToAppError } from '@/utils/errors/axios';
import { Client, ClientOptions, createClient, createConfig } from '@hey-api/client-axios';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const onRequest = (
  config: InternalAxiosRequestConfig,
  authToken?: string
): InternalAxiosRequestConfig => {
  // Add authorization header if available
  if (authToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Record start time for duration calculation
  (config as any).metadata = { startTime: Date.now() };

  // Generate curl command if enabled
  if (LOGGER_CONFIG.logCurl) {
    try {
      const curl = new AxiosCurlLibrary(config);
      (config as any).curlCommand = curl.generateCommand();
    } catch {
      // Silently ignore curl generation errors
    }
  }

  return config;
};

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error);
};

const onResponse = (response: AxiosResponse): AxiosResponse => {
  const config = response.config as any;
  const method = config?.method?.toUpperCase() || 'GET';
  const url = config?.url || 'unknown';
  const duration = config?.metadata?.startTime ? Date.now() - config.metadata.startTime : undefined;

  rootLogger.api({
    method,
    url,
    status: response.status,
    duration,
    curl: config?.curlCommand,
  });

  return response;
};

const onResponseError = (error: AxiosError): Promise<AppError> => {
  const config = error.config as any;
  const method = config?.method?.toUpperCase() || 'GET';
  const url = config?.url || 'unknown';
  const status = error.response?.status || 500;

  rootLogger.apiError({
    method,
    url,
    status,
    error: error as Error,
    curl: config?.curlCommand,
  });

  // Map to AppError and throw
  const appError = mapAxiosErrorToAppError(error);
  return Promise.reject(appError);
};

export const createControlPlaneClient = (authToken: string, baseUrl?: string): Client => {
  const httpControlPlane = createClient(
    createConfig<ClientOptions>({
      baseURL: baseUrl || process.env.API_URL,
      withCredentials: false,
      throwOnError: true,
    })
  );

  httpControlPlane.instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => onRequest(config, authToken),
    onRequestError
  );
  httpControlPlane.instance.interceptors.response.use(onResponse, onResponseError);

  return httpControlPlane;
};

/**
 * Creates a user-scoped control plane client.
 */
export const createUserScopedControlPlaneClient = (authToken: string, userId: string): Client => {
  const baseUrl = `${process.env.API_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`;
  return createControlPlaneClient(authToken, baseUrl);
};

export type ControlPlaneClient = ReturnType<typeof createControlPlaneClient>;
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/control-plane/control-plane.factory.ts
git commit -m "refactor(control-plane): integrate enterprise logger"
```

---

### Task 2.4: Add Logger to ServiceContext

**Files:**

- Modify: `app/resources/base/types.ts`

**Step 1: Add logger to ServiceContext**

Find the ServiceContext interface and add logger:

```typescript
import type { Logger } from '@/modules/logger';

export interface ServiceContext {
  controlPlaneClient: ControlPlaneClient;
  userScopedClient?: ControlPlaneClient;
  requestId: string;
  logger?: Logger; // Add optional logger
}
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/resources/base/types.ts
git commit -m "refactor(types): add logger to ServiceContext"
```

---

### Task 2.5: Update AppLoadContext

**Files:**

- Modify: `app/types.d.ts`

**Step 1: Add logger to AppLoadContext**

Find the AppLoadContext interface and add logger:

```typescript
import type { Logger } from '@/modules/logger';

// In AppLoadContext interface, add:
logger?: Logger;
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/types.d.ts
git commit -m "refactor(types): add logger to AppLoadContext"
```

---

### Task 2.6: Update Server Entry to Pass Logger

**Files:**

- Modify: `app/server/entry.ts`

**Step 1: Pass logger in getLoadContext**

In the `getLoadContext` function, add logger to the return object:

```typescript
// After creating reqLogger in middleware, pass it to context
// In getLoadContext, after buildContext:

const reqLogger = new Logger({
  requestId,
  path: c.req.path,
  method: c.req.method,
});

return {
  ...controlPlaneClient,
  requestId,
  cspNonce,
  session,
  controlPlaneClient,
  userScopedClient,
  logger: reqLogger, // Add this
};
```

**Step 2: Verify no type errors**

Run: `bun run typecheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add app/server/entry.ts
git commit -m "refactor(server): pass logger to AppLoadContext"
```

---

## Phase 3: Verification

### Task 3.1: Run Full Typecheck

**Step 1: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 2: If errors, fix them before proceeding**

---

### Task 3.2: Test Dev Server

**Step 1: Start dev server**

Run: `bun run dev`

**Step 2: Navigate to a page and verify logs appear**

Expected output format in terminal:

```
[INFO ] [a1b2c3d4] GET /account/organizations 200 143ms
[INFO ] → GET /apis/resourcemanager/v1alpha1/organizations 200 89ms
  curl: curl -X GET -H 'Authorization:Bearer eyJ...' 'https://...'
```

**Step 3: Verify colors appear correctly**

---

### Task 3.3: Final Commit

**Step 1: Commit any remaining changes**

```bash
git add -A
git commit -m "feat(logger): complete enterprise logger implementation

- Logger class with child context pattern
- Pretty formatter (dev) with colors
- JSON formatter (prod) for Loki
- Sentry integration (breadcrumbs, tags, context)
- Curl generator with token redaction
- OpenTelemetry compatible (traceId, spanId)
- Environment-configurable (LOG_LEVEL, LOG_FORMAT)"
```

---

## Summary

| Phase   | Tasks     | Description                                                  |
| ------- | --------- | ------------------------------------------------------------ |
| Phase 1 | 1.1 - 1.7 | Logger core (types, config, formatters, integrations, class) |
| Phase 2 | 2.1 - 2.6 | Integration (Hono, control-plane, service context)           |
| Phase 3 | 3.1 - 3.3 | Verification and final commit                                |

**Total: 16 tasks**
