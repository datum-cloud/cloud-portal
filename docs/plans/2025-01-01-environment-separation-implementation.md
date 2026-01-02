# Environment Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate server/client environment handling to fix `process.env is undefined` browser errors.

**Architecture:** Use `.server.ts` suffix convention for server-only code. Server uses Zod-validated `env` object, client reads from `window.ENV` with typed interface. Root loader bridges via `getClientEnv()`.

**Tech Stack:** Zod v3, React Router v7, Vite

---

## Task 1: Create env.server.ts

**Files:**

- Create: `app/utils/config/env.server.ts`
- Reference: `app/utils/config/env.config.ts` (will be deleted in Task 3)

**Step 1: Create the server environment file**

```typescript
// app/utils/config/env.server.ts
import { z } from 'zod';

// Helper to convert string to boolean
function toBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

const schema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  VERSION: z.string().optional(),

  // Auth
  AUTH_OIDC_ISSUER: z.string().url(),
  AUTH_OIDC_CLIENT_ID: z.string(),

  // Cloud Valid
  CLOUDVALID_API_URL: z.string().optional(),
  CLOUDVALID_API_KEY: z.string().optional(),
  CLOUDVALID_TEMPLATE_ID: z.string().optional(),

  // Analytics
  FATHOM_ID: z.string().optional(),
  HELPSCOUT_BEACON_ID: z.string().optional(),
  HELPSCOUT_SECRET_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().optional(),
  TELEMETRY_URL: z.string().optional(),
  PROMETHEUS_URL: z.string().optional(),

  // Logging
  DEBUG: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOG_FORMAT: z.enum(['json', 'pretty', 'compact']).optional(),
  LOG_CURL: z.string().optional(),
  LOG_REDACT_TOKENS: z.string().optional(),
  LOG_PAYLOADS: z.string().optional(),
});

type EnvSchema = z.infer<typeof schema>;

// Parse at module load - fail fast if invalid
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const data = parsed.data;

/**
 * Server environment configuration
 * Validated at startup, safe to use throughout server code
 */
export const env = {
  ...data,
  isDev: data.NODE_ENV === 'development',
  isProd: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  isDebug: toBoolean(data.DEBUG),
  isCacheEnabled: toBoolean(data.CACHE_ENABLED),
  isSentryEnabled: !!data.SENTRY_DSN,
} as const;

export type Env = typeof env;

// Helper functions for compatibility with existing code
export const isProduction = (): boolean => env.isProd;
export const isDevelopment = (): boolean => env.isDev;
export const isTest = (): boolean => env.isTest;

/**
 * Client-safe environment subset
 * Only expose non-sensitive values
 */
export interface ClientEnv {
  DEBUG: boolean;
  DEV: boolean;
  PROD: boolean;
  SENTRY_ENV?: string;
  SENTRY_DSN?: string;
  VERSION?: string;
  FATHOM_ID?: string;
  HELPSCOUT_BEACON_ID?: string;
}

/**
 * Get client-safe environment variables
 * Used by root.tsx loader to inject into window.ENV
 */
export function getClientEnv(): ClientEnv {
  return {
    DEBUG: env.isDebug,
    DEV: env.isDev,
    PROD: env.isProd,
    SENTRY_ENV: env.SENTRY_ENV,
    SENTRY_DSN: env.SENTRY_DSN,
    VERSION: env.VERSION,
    FATHOM_ID: env.FATHOM_ID,
    HELPSCOUT_BEACON_ID: env.HELPSCOUT_BEACON_ID,
  };
}

/**
 * Singleton pattern for server-side instances
 */
export function singleton<Value>(name: string, value: () => Value): Value {
  const globalStore = global as unknown as {
    __singletons?: Record<string, Value>;
  };
  globalStore.__singletons ??= {};
  globalStore.__singletons[name] ??= value();
  return globalStore.__singletons[name];
}
```

**Step 2: Verify it compiles**

Run: `bun run typecheck`
Expected: No errors related to env.server.ts

**Step 3: Commit**

```bash
git add app/utils/config/env.server.ts
git commit -m "feat: add env.server.ts with Zod validation"
```

---

## Task 2: Create env.client.ts

**Files:**

- Create: `app/utils/config/env.client.ts`

**Step 1: Create the client environment file**

```typescript
// app/utils/config/env.client.ts

/**
 * Client-safe environment variables
 * Injected by root.tsx via window.ENV
 */
export interface ClientEnv {
  DEBUG: boolean;
  DEV: boolean;
  PROD: boolean;
  SENTRY_ENV?: string;
  SENTRY_DSN?: string;
  VERSION?: string;
  FATHOM_ID?: string;
  HELPSCOUT_BEACON_ID?: string;
}

declare global {
  interface Window {
    ENV?: ClientEnv;
  }
}

function getDefaults(): ClientEnv {
  return {
    DEBUG: false,
    DEV: false,
    PROD: true, // Safe default assumption
  };
}

/**
 * Client environment configuration
 * Reads from window.ENV injected by root.tsx
 * Falls back to safe defaults during SSR or if not hydrated
 */
export const env: ClientEnv =
  typeof window !== 'undefined' ? (window.ENV ?? getDefaults()) : getDefaults();

// Helper functions matching server API
export const isProduction = (): boolean => env.PROD;
export const isDevelopment = (): boolean => env.DEV;
export const isDebug = (): boolean => env.DEBUG;
```

**Step 2: Verify it compiles**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/utils/config/env.client.ts
git commit -m "feat: add env.client.ts for browser environment access"
```

---

## Task 3: Update root.tsx to use getClientEnv

**Files:**

- Modify: `app/root.tsx`

**Step 1: Update imports and loader**

Change:

```typescript
import { getSharedEnvs } from '@/utils/config/env.config';
```

To:

```typescript
import { getClientEnv } from '@/utils/config/env.server';
```

Change the loader from:

```typescript
const sharedEnv = getSharedEnvs();
// ...
ENV: {
  FATHOM_ID: sharedEnv.FATHOM_ID,
  HELPSCOUT_BEACON_ID: sharedEnv.HELPSCOUT_BEACON_ID,
  DEBUG: sharedEnv.isDebug,
  DEV: sharedEnv.isDev,
  PROD: sharedEnv.isProd,
  SENTRY_ENV: sharedEnv.SENTRY_ENV,
  SENTRY_DSN: sharedEnv.SENTRY_DSN,
  VERSION: sharedEnv.VERSION,
},
```

To:

```typescript
ENV: getClientEnv(),
```

**Step 2: Verify it compiles**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/root.tsx
git commit -m "refactor(root): use getClientEnv from env.server"
```

---

## Task 4: Update logger.config.ts

**Files:**

- Modify: `app/modules/logger/logger.config.ts`

**Step 1: Update imports**

Change:

```typescript
import { isProduction, isDevelopment } from '@/utils/config/env.config';
```

To:

```typescript
import { env, isProduction, isDevelopment } from '@/utils/config/env.server';
```

**Step 2: Update process.env references**

Change:

```typescript
const env = process.env.LOG_LEVEL;
```

To:

```typescript
const level = env.LOG_LEVEL;
```

And:

```typescript
const env = process.env.LOG_FORMAT;
```

To:

```typescript
const format = env.LOG_FORMAT;
```

Full updated file:

```typescript
import { env, isProduction, isDevelopment } from '@/utils/config/env.server';

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
  if (env.LOG_LEVEL && ['debug', 'info', 'warn', 'error'].includes(env.LOG_LEVEL)) {
    return env.LOG_LEVEL as LoggerConfig['level'];
  }
  return isProduction() ? 'info' : 'debug';
}

function getLogFormat(): LogFormat {
  if (env.LOG_FORMAT && ['json', 'pretty', 'compact'].includes(env.LOG_FORMAT)) {
    return env.LOG_FORMAT as LogFormat;
  }
  return isProduction() ? 'json' : 'pretty';
}

export const LOGGER_CONFIG: LoggerConfig = {
  level: getLogLevel(),
  format: getLogFormat(),
  logCurl: env.LOG_CURL !== 'false' && isDevelopment(),
  redactTokens: env.LOG_REDACT_TOKENS !== 'false' || isProduction(),
  logPayloads: env.LOG_PAYLOADS === 'true' || isDevelopment(),
  includeStackTrace: isDevelopment(),
};
```

**Step 3: Verify it compiles**

Run: `bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add app/modules/logger/logger.config.ts
git commit -m "refactor(logger): use env.server instead of process.env"
```

---

## Task 5: Update remaining server files

**Files to modify:**

- `app/server/entry.ts`
- `app/server/middleware/context.ts`
- `app/modules/control-plane/control-plane.factory.ts`
- `app/utils/auth/auth.service.ts`
- `app/utils/auth/auth.config.ts`
- `app/modules/auth/strategies/zitadel.server.ts`
- `app/modules/rbac/rbac.middleware.ts`
- `app/server/routes/preferences.ts`
- `app/server/routes/grafana.ts`
- `app/server/routes/cloudvalid.ts`
- `app/server/routes/prometheus.ts`
- `app/modules/loki/client.ts`
- `app/utils/cookies/*.server.ts` (all cookie files)

**Step 1: Update each file**

For each file, change:

```typescript
import { ... } from '@/utils/config/env.config';
```

To:

```typescript
import { ... } from '@/utils/config/env.server';
```

And change any direct `process.env.X` to `env.X`.

**Step 2: Verify it compiles**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: migrate all server files to env.server"
```

---

## Task 6: Delete env.config.ts

**Files:**

- Delete: `app/utils/config/env.config.ts`

**Step 1: Verify no remaining imports**

Run: `grep -r "env.config" app/`
Expected: No results (or only in node_modules)

**Step 2: Delete the file**

```bash
rm app/utils/config/env.config.ts
```

**Step 3: Verify it compiles**

Run: `bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete legacy env.config.ts"
```

---

## Task 7: Final Verification

**Step 1: Run full typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 2: Run the dev server**

Run: `bun run dev`
Expected: Server starts without errors

**Step 3: Test in browser**

1. Open http://localhost:3000
2. Open browser console
3. Type `window.ENV`
   Expected: Object with DEBUG, DEV, PROD, etc.

**Step 4: Verify no process.env errors**

Check browser console for any `process.env is undefined` errors.
Expected: None

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any remaining env issues"
```
