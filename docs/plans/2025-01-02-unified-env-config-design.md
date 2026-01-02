# Unified Environment Configuration Design

## Overview

Centralized environment variable handling for React Router v7 with clean server/client separation, type safety, and single-import convenience.

## Problem

Current structure has gaps:

- `env.server.ts` - Full env with secrets
- `env.client.ts` - Reads from `window.ENV`
- `window.ENV` (ClientEnv) - Only ~8 values, missing logging config
- Shared code uses workarounds like custom `getEnvVar()` functions

## Solution

Unified `env` namespace that works everywhere with clear public/server separation.

## Structure

```
app/utils/env/
├── index.ts          # Universal: exports env, isProd, isDev
├── env.server.ts     # Server: validation, env.public + env.server
├── env.client.ts     # Client: window.ENV reader
└── types.ts          # Shared types (PublicEnv, ServerEnv)
```

## API Design

### Namespaced Access

```ts
// Shared/client code
import { env } from '@/utils/env';
env.public.logLevel   // ✅ Works everywhere
env.isDev             // ✅ Works everywhere
env.public.apiUrl     // ❌ Throws on client

// Server code
import { env } from '@/utils/env/env.server';
env.public.logLevel   // ✅ Public values
env.public.apiUrl     // ✅ Server secrets
```

### Type Safety

- `env.public.*` - Typed, available everywhere
- `env.server.*` - Typed, server-only (throws on client)
- Zod validation at server startup (fail-fast)

## Schema Split

### Public Schema (safe for client)

| Variable            | Type                                      | Default         |
| ------------------- | ----------------------------------------- | --------------- |
| NODE_ENV            | `'production' \| 'development' \| 'test'` | `'development'` |
| VERSION             | `string?`                                 | -               |
| DEBUG               | `string?`                                 | -               |
| SENTRY_DSN          | `string?`                                 | -               |
| SENTRY_ENV          | `string?`                                 | -               |
| FATHOM_ID           | `string?`                                 | -               |
| HELPSCOUT_BEACON_ID | `string?`                                 | -               |
| LOG_LEVEL           | `'debug' \| 'info' \| 'warn' \| 'error'`  | `'info'`        |
| LOG_FORMAT          | `'json' \| 'pretty' \| 'compact'`         | `'pretty'`      |
| LOG_CURL            | `string?`                                 | -               |
| LOG_REDACT_TOKENS   | `string?`                                 | -               |
| LOG_PAYLOADS        | `string?`                                 | -               |
| OTEL_ENABLED        | `string?`                                 | -               |
| OTEL_LOG_LEVEL      | `'debug' \| 'info' \| 'warn' \| 'error'`  | -               |

### Server Schema (secrets, never exposed)

| Variable                    | Type              | Required |
| --------------------------- | ----------------- | -------- |
| APP_URL                     | `string (url)`    | Yes      |
| API_URL                     | `string (url)`    | Yes      |
| SESSION_SECRET              | `string (min 32)` | Yes      |
| AUTH_OIDC_ISSUER            | `string (url)`    | Yes      |
| AUTH_OIDC_CLIENT_ID         | `string`          | Yes      |
| TELEMETRY_URL               | `string?`         | No       |
| PROMETHEUS_URL              | `string?`         | No       |
| GRAFANA_URL                 | `string?`         | No       |
| CLOUDVALID_API_URL          | `string?`         | No       |
| CLOUDVALID_API_KEY          | `string?`         | No       |
| CLOUDVALID_TEMPLATE_ID      | `string?`         | No       |
| HELPSCOUT_SECRET_KEY        | `string?`         | No       |
| OTEL_EXPORTER_OTLP_ENDPOINT | `string?`         | No       |
| OTEL_EXPORTER_TIMEOUT       | `string?`         | No       |

## File Implementations

### types.ts

```ts
export interface PublicEnv {
  nodeEnv: 'production' | 'development' | 'test';
  version?: string;
  debug: boolean;
  sentryDsn?: string;
  sentryEnv?: string;
  fathomId?: string;
  helpscoutBeaconId?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'pretty' | 'compact';
  logCurl: boolean;
  logRedactTokens: boolean;
  logPayloads: boolean;
  otelEnabled: boolean;
  otelLogLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ServerEnv {
  appUrl: string;
  apiUrl: string;
  sessionSecret: string;
  authOidcIssuer: string;
  authOidcClientId: string;
  telemetryUrl?: string;
  prometheusUrl?: string;
  grafanaUrl?: string;
  cloudvalidApiUrl?: string;
  cloudvalidApiKey?: string;
  cloudvalidTemplateId?: string;
  helpscoutSecretKey?: string;
  otelExporterEndpoint?: string;
  otelExporterTimeout?: string;
}

export interface Env {
  public: PublicEnv;
  server: ServerEnv;
  isProd: boolean;
  isDev: boolean;
  isTest: boolean;
}
```

### env.server.ts

```ts
import type { Env, PublicEnv, ServerEnv } from './types';
import { z } from 'zod';

const publicSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  VERSION: z.string().optional(),
  DEBUG: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().optional(),
  FATHOM_ID: z.string().optional(),
  HELPSCOUT_BEACON_ID: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOG_FORMAT: z.enum(['json', 'pretty', 'compact']).optional(),
  LOG_CURL: z.string().optional(),
  LOG_REDACT_TOKENS: z.string().optional(),
  LOG_PAYLOADS: z.string().optional(),
  OTEL_ENABLED: z.string().optional(),
  OTEL_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

const serverSchema = z.object({
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  AUTH_OIDC_ISSUER: z.string().url(),
  AUTH_OIDC_CLIENT_ID: z.string(),
  TELEMETRY_URL: z.string().optional(),
  PROMETHEUS_URL: z.string().optional(),
  GRAFANA_URL: z.string().optional(),
  CLOUDVALID_API_URL: z.string().optional(),
  CLOUDVALID_API_KEY: z.string().optional(),
  CLOUDVALID_TEMPLATE_ID: z.string().optional(),
  HELPSCOUT_SECRET_KEY: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_TIMEOUT: z.string().optional(),
});

const fullSchema = publicSchema.merge(serverSchema);
const parsed = fullSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const data = parsed.data;

export const env: Env = {
  public: {
    nodeEnv: data.NODE_ENV,
    version: data.VERSION,
    debug: data.DEBUG === 'true' || data.DEBUG === '1',
    sentryDsn: data.SENTRY_DSN,
    sentryEnv: data.SENTRY_ENV,
    fathomId: data.FATHOM_ID,
    helpscoutBeaconId: data.HELPSCOUT_BEACON_ID,
    logLevel: data.LOG_LEVEL ?? (data.NODE_ENV === 'production' ? 'info' : 'debug'),
    logFormat: data.LOG_FORMAT ?? (data.NODE_ENV === 'production' ? 'json' : 'pretty'),
    logCurl: data.LOG_CURL !== 'false' && data.NODE_ENV === 'development',
    logRedactTokens: data.LOG_REDACT_TOKENS !== 'false' || data.NODE_ENV === 'production',
    logPayloads: data.LOG_PAYLOADS === 'true' || data.NODE_ENV === 'development',
    otelEnabled: data.OTEL_ENABLED === 'true' && !!data.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelLogLevel: data.OTEL_LOG_LEVEL,
  },
  server: {
    appUrl: data.APP_URL,
    apiUrl: data.API_URL,
    sessionSecret: data.SESSION_SECRET,
    authOidcIssuer: data.AUTH_OIDC_ISSUER,
    authOidcClientId: data.AUTH_OIDC_CLIENT_ID,
    telemetryUrl: data.TELEMETRY_URL,
    prometheusUrl: data.PROMETHEUS_URL,
    grafanaUrl: data.GRAFANA_URL,
    cloudvalidApiUrl: data.CLOUDVALID_API_URL,
    cloudvalidApiKey: data.CLOUDVALID_API_KEY,
    cloudvalidTemplateId: data.CLOUDVALID_TEMPLATE_ID,
    helpscoutSecretKey: data.HELPSCOUT_SECRET_KEY,
    otelExporterEndpoint: data.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelExporterTimeout: data.OTEL_EXPORTER_TIMEOUT,
  },
  isProd: data.NODE_ENV === 'production',
  isDev: data.NODE_ENV === 'development',
  isTest: data.NODE_ENV === 'test',
};

export type { Env, PublicEnv, ServerEnv };
```

### env.client.ts

```ts
import type { PublicEnv } from './types';

declare global {
  interface Window {
    ENV?: PublicEnv;
  }
}

const defaults: PublicEnv = {
  nodeEnv: 'production',
  version: undefined,
  debug: false,
  sentryDsn: undefined,
  sentryEnv: undefined,
  fathomId: undefined,
  helpscoutBeaconId: undefined,
  logLevel: 'info',
  logFormat: 'pretty',
  logCurl: false,
  logRedactTokens: true,
  logPayloads: false,
  otelEnabled: false,
  otelLogLevel: undefined,
};

const publicEnv: PublicEnv = typeof window !== 'undefined' ? (window.ENV ?? defaults) : defaults;

export const env = {
  public: publicEnv,

  get server(): never {
    throw new Error(
      'env.server is not available on client. Import from @/utils/env/env.server instead.'
    );
  },

  get isProd() {
    return this.public.nodeEnv === 'production';
  },
  get isDev() {
    return this.public.nodeEnv === 'development';
  },
  get isTest() {
    return this.public.nodeEnv === 'test';
  },
} as const;

export type { PublicEnv };
```

### index.ts (Universal)

```ts
import type { PublicEnv, ServerEnv, Env } from './types';

function createEnv(): Omit<Env, 'server'> & { server: ServerEnv | never } {
  if (typeof window === 'undefined') {
    return require('./env.server').env;
  }
  return require('./env.client').env;
}

export const env = createEnv();

export const isProd = () => env.isProd;
export const isDev = () => env.isDev;
export const isTest = () => env.isTest;

export type { PublicEnv, ServerEnv, Env };
```

## root.tsx Changes

```tsx
// Before
import { getClientEnv } from '@/utils/config/env.server';
// ...
ENV: getClientEnv(),

// After
import { env } from '@/utils/env/env.server';
// ...
ENV: env.public,
```

## Migration Checklist

### Phase 1: Create New Files

- [ ] `app/utils/env/types.ts`
- [ ] `app/utils/env/env.server.ts`
- [ ] `app/utils/env/env.client.ts`
- [ ] `app/utils/env/index.ts`

### Phase 2: Update Imports (from @/utils/config/env\*)

| File                                          | Before                                  | After                        |
| --------------------------------------------- | --------------------------------------- | ---------------------------- |
| `app/root.tsx`                                | `getClientEnv()`                        | `env.public`                 |
| `app/layouts/private.layout.tsx`              | `getClientEnv()`                        | `env.public`                 |
| `app/modules/logger/logger.config.ts`         | `isClient, isDevelopment, isProduction` | `env.public.*`, `env.isDev`  |
| `app/server/entry.ts`                         | `env` (old)                             | `env.server.*`               |
| `app/server/routes/preferences.ts`            | `isProduction`                          | `env.isProd`                 |
| `app/utils/cookies/theme.server.ts`           | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/cookies/toast.server.ts`           | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/cookies/workload.server.ts`        | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/cookies/id-token.server.ts`        | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/cookies/csrf.server.ts`            | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/cookies/redirect-intent.server.ts` | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/cookies/org.server.ts`             | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/cookies/alert.server.ts`           | `env, isProduction`                     | `env.server.*`, `env.isProd` |
| `app/utils/auth/auth.service.ts`              | `env, isProduction`                     | `env.server.*`, `env.isProd` |

### Phase 3: Replace Direct process.env Usage

| File                                                        | Variable                                      | After                          |
| ----------------------------------------------------------- | --------------------------------------------- | ------------------------------ |
| `app/server/entry.ts:60`                                    | `process.env.API_URL`                         | `env.public.apiUrl`            |
| `app/server/entry.ts:129`                                   | `process.env.API_URL`                         | `env.public.apiUrl`            |
| `app/server/entry.ts:164`                                   | `process.env.API_URL`                         | `env.public.apiUrl`            |
| `app/server/middleware/context.ts:17`                       | `process.env.API_URL`                         | `env.public.apiUrl`            |
| `app/server/routes/prometheus.ts:11,21`                     | `process.env.PROMETHEUS_URL`                  | `env.server.prometheusUrl`     |
| `app/server/routes/grafana.ts:14`                           | `process.env.GRAFANA_URL`                     | `env.server.grafanaUrl`        |
| `app/server/routes/cloudvalid.ts:12,33`                     | `process.env.CLOUDVALID_*`                    | `env.server.cloudvalid*`       |
| `app/modules/control-plane/control-plane.factory.ts:89,108` | `process.env.API_URL`                         | `env.public.apiUrl`            |
| `app/modules/auth/strategies/zitadel.server.ts:7,18,20`     | `process.env.AUTH_OIDC_*`, `APP_URL`          | `env.server.*`                 |
| `app/modules/rbac/rbac.middleware.ts:120`                   | `process.env.APP_URL`                         | `env.public.appUrl`            |
| `app/modules/loki/client.ts:8`                              | `process.env.TELEMETRY_URL`                   | `env.server.telemetryUrl`      |
| `observability/providers/sentry.ts`                         | `process.env.SENTRY_*`, `NODE_ENV`, `VERSION` | `env.public.*`                 |
| `observability/providers/otel.ts`                           | `process.env.OTEL_*`, `NODE_ENV`              | `env.public.*`, `env.server.*` |

### Phase 4: Delete Old Files

- [ ] `app/utils/config/env.ts`
- [ ] `app/utils/config/env.server.ts`
- [ ] `app/utils/config/env.client.ts`

### Phase 5: Cleanup

- [ ] Remove `getClientEnv()` function (no longer needed)
- [ ] Remove `singleton()` function if unused elsewhere
- [ ] Remove custom `getEnvVar()` from logger.config.ts
- [ ] Update any remaining `isClient()`, `isServer()` usages

## Benefits

1. **Single import** - `import { env } from '@/utils/env'` works everywhere
2. **Type safety** - Full TypeScript support with distinct public/server types
3. **Fail-fast** - Zod validation on server startup
4. **No secrets leak** - `env.server` throws on client
5. **Centralized** - One place to add/modify env vars
6. **Clean namespacing** - `env.public.*` vs `env.server.*`
