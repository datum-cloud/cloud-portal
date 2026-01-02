# Environment Separation Design

## Overview

Separate server-side and client-side environment variable handling to prevent `process.env is undefined` errors in the browser. Follow staff-portal's proven pattern.

## Problem

Files like `logger.config.ts` import `isProduction()` from `env.config.ts`, which uses `process.env.NODE_ENV`. When bundled for client-side, `process.env` is undefined causing browser errors.

## Solution

Use React Router/Vite's `.server.ts` suffix convention to exclude server-only code from client bundles.

## File Structure

```
app/utils/config/
├── env.server.ts      # Server-only: Zod validation, process.env, helpers
├── env.client.ts      # Client-only: window.ENV access with types
└── sentry.config.ts   # Unchanged (already server-only usage)
```

## Server Environment (`env.server.ts`)

```typescript
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  VERSION: z.string().optional(),

  // Auth
  AUTH_OIDC_ISSUER: z.string().url(),
  AUTH_OIDC_CLIENT_ID: z.string(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOG_FORMAT: z.enum(['json', 'pretty', 'compact']).optional(),

  // ... other server-only vars
});

// Parse once at startup, fail fast if invalid
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
};

// Helper functions
export const isProduction = () => env.isProd;
export const isDevelopment = () => env.isDev;
export const isTest = () => env.isTest;

// Client-safe subset
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

export function getClientEnv(): ClientEnv {
  return {
    DEBUG: toBoolean(process.env.DEBUG),
    DEV: env.isDev,
    PROD: env.isProd,
    SENTRY_ENV: env.SENTRY_ENV,
    SENTRY_DSN: env.SENTRY_DSN,
    VERSION: env.VERSION,
    FATHOM_ID: process.env.FATHOM_ID,
    HELPSCOUT_BEACON_ID: process.env.HELPSCOUT_BEACON_ID,
  };
}
```

## Client Environment (`env.client.ts`)

```typescript
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
    PROD: true,
  };
}

export const env: ClientEnv =
  typeof window !== 'undefined' ? (window.ENV ?? getDefaults()) : getDefaults();

export const isProduction = () => env.PROD;
export const isDevelopment = () => env.DEV;
export const isDebug = () => env.DEBUG;
```

## Import Patterns

```typescript
// Server-side code (loaders, services, middleware)
import { env, isProduction } from '@/utils/config/env.server';

// Client-side code (components, hooks)
import { env } from '@/utils/config/env.client';
```

## Migration Scope

### Server files to update (change `env.config` → `env.server`):

- `app/modules/logger/logger.config.ts`
- `app/server/entry.ts`
- `app/server/middleware/context.ts`
- `app/modules/control-plane/control-plane.factory.ts`
- `app/utils/auth/auth.service.ts`
- `app/utils/cookies/*.server.ts`
- All other server modules

### root.tsx update:

```typescript
import { getClientEnv } from '@/utils/config/env.server';

export async function loader() {
  return data({
    ENV: getClientEnv(),
    // ...
  });
}
```

## Validation

### Required vs Optional

| Variable         | Required | Reason                 |
| ---------------- | -------- | ---------------------- |
| `NODE_ENV`       | ✅       | Core behavior          |
| `APP_URL`        | ✅       | Auth redirects         |
| `API_URL`        | ✅       | Backend calls          |
| `SESSION_SECRET` | ✅       | Security               |
| `AUTH_OIDC_*`    | ✅       | Auth flow              |
| `SENTRY_DSN`     | ❌       | Optional observability |
| `LOG_LEVEL`      | ❌       | Defaults to info/debug |

### Behavior

- **Server**: Fail fast on missing required vars (process.exit)
- **Client**: Safe defaults if window.ENV missing (PROD=true, DEBUG=false)
