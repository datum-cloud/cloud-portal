# Unified Environment Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralized environment variable handling with namespaced `env.public.*` and `env.server.*` API.

**Architecture:** Single `@/utils/env` module with server validation (Zod), client reader (window.ENV), and universal export that works everywhere. Server secrets throw on client access.

**Tech Stack:** Zod v3, TypeScript, React Router v7

---

## Task 1: Create Types File

**Files:**

- Create: `app/utils/env/types.ts`

**Step 1: Create the types file**

```ts
// app/utils/env/types.ts

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

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: No errors related to types.ts

---

## Task 2: Create Server Environment File

**Files:**

- Create: `app/utils/env/env.server.ts`

**Step 1: Create the server env file with Zod schemas**

```ts
// app/utils/env/env.server.ts
import type { Env } from './types';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════

const fullSchema = publicSchema.merge(serverSchema);
const parsed = fullSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const data = parsed.data;

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

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

export type { Env, PublicEnv, ServerEnv } from './types';
```

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: No errors related to env.server.ts

---

## Task 3: Create Client Environment File

**Files:**

- Create: `app/utils/env/env.client.ts`

**Step 1: Create the client env file**

```ts
// app/utils/env/env.client.ts
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

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: No errors related to env.client.ts

---

## Task 4: Create Universal Index File

**Files:**

- Create: `app/utils/env/index.ts`

**Step 1: Create the universal index file**

```ts
// app/utils/env/index.ts
import type { PublicEnv, ServerEnv, Env } from './types';

function createEnv(): Omit<Env, 'server'> & { server: ServerEnv | never } {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./env.server').env;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./env.client').env;
}

export const env = createEnv();

export const isProd = () => env.isProd;
export const isDev = () => env.isDev;
export const isTest = () => env.isTest;

export type { PublicEnv, ServerEnv, Env };
```

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: No errors related to index.ts

**Step 3: Commit new env module**

```bash
git add app/utils/env/
git commit -m "feat: add unified env module with public/server namespacing"
```

---

## Task 5: Update root.tsx

**Files:**

- Modify: `app/root.tsx`

**Step 1: Update import and usage**

Change:

```ts
import { getClientEnv } from '@/utils/config/env.server';
```

To:

```ts
import { env } from '@/utils/env/env.server';
```

Change (in loader):

```ts
ENV: getClientEnv(),
```

To:

```ts
ENV: env.public,
```

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 6: Update private.layout.tsx

**Files:**

- Modify: `app/layouts/private.layout.tsx`

**Step 1: Update import and usage**

Change:

```ts
import { getClientEnv } from '@/utils/config/env.server';
```

To:

```ts
import { env } from '@/utils/env/env.server';
```

Change (in loader):

```ts
ENV: getClientEnv(),
```

To:

```ts
ENV: env.public,
```

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 7: Update logger.config.ts

**Files:**

- Modify: `app/modules/logger/logger.config.ts`

**Step 1: Replace entire file**

```ts
// app/modules/logger/logger.config.ts
import { env } from '@/utils/env';

export type LogFormat = 'json' | 'pretty' | 'compact';

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: LogFormat;
  logCurl: boolean;
  logApiCalls: boolean;
  redactTokens: boolean;
  logPayloads: boolean;
  includeStackTrace: boolean;
}

export const LOGGER_CONFIG: LoggerConfig = {
  level: env.public.logLevel,
  format: env.public.logFormat,
  logCurl: env.public.logCurl,
  logApiCalls: typeof window === 'undefined' ? true : env.isDev,
  redactTokens: env.public.logRedactTokens,
  logPayloads: env.public.logPayloads,
  includeStackTrace: env.isDev,
};
```

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 8: Update Cookie Files

**Files:**

- Modify: `app/utils/cookies/theme.server.ts`
- Modify: `app/utils/cookies/toast.server.ts`
- Modify: `app/utils/cookies/workload.server.ts`
- Modify: `app/utils/cookies/id-token.server.ts`
- Modify: `app/utils/cookies/csrf.server.ts`
- Modify: `app/utils/cookies/redirect-intent.server.ts`
- Modify: `app/utils/cookies/org.server.ts`
- Modify: `app/utils/cookies/alert.server.ts`

**Step 1: Update imports in all cookie files**

For each file, change:

```ts
import { env, isProduction } from '@/utils/config/env.server';
```

To:

```ts
import { env } from '@/utils/env/env.server';
```

And change all usages of:

- `isProduction()` → `env.isProd`
- `env.SESSION_SECRET` → `env.server.sessionSecret`
- `env.APP_URL` → `env.public.appUrl`

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 9: Update server/entry.ts

**Files:**

- Modify: `app/server/entry.ts`

**Step 1: Update import**

Change:

```ts
import { env } from '@/utils/config/env.server';
```

To:

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update all process.env usages**

Change all occurrences of:

- `process.env.API_URL` → `env.public.apiUrl`
- `env.API_URL` → `env.public.apiUrl`
- `env.APP_URL` → `env.public.appUrl`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 10: Update server/routes/\*.ts

**Files:**

- Modify: `app/server/routes/preferences.ts`
- Modify: `app/server/routes/prometheus.ts`
- Modify: `app/server/routes/grafana.ts`
- Modify: `app/server/routes/cloudvalid.ts`

**Step 1: Update preferences.ts**

Change:

```ts
import { isProduction } from '@/utils/config/env.server';
```

To:

```ts
import { env } from '@/utils/env/env.server';
```

And change `isProduction()` → `env.isProd`

**Step 2: Update prometheus.ts**

Add import:

```ts
import { env } from '@/utils/env/env.server';
```

Change `process.env.PROMETHEUS_URL` → `env.server.prometheusUrl`

**Step 3: Update grafana.ts**

Add import:

```ts
import { env } from '@/utils/env/env.server';
```

Change `process.env.GRAFANA_URL` → `env.server.grafanaUrl`

**Step 4: Update cloudvalid.ts**

Add import:

```ts
import { env } from '@/utils/env/env.server';
```

Change:

- `process.env.CLOUDVALID_API_KEY` → `env.server.cloudvalidApiKey`
- `process.env.CLOUDVALID_TEMPLATE_ID` → `env.server.cloudvalidTemplateId`

**Step 5: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 11: Update server/middleware/context.ts

**Files:**

- Modify: `app/server/middleware/context.ts`

**Step 1: Update import and usage**

Add import:

```ts
import { env } from '@/utils/env/env.server';
```

Change `process.env.API_URL` → `env.public.apiUrl`

**Step 2: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 12: Update auth.service.ts

**Files:**

- Modify: `app/utils/auth/auth.service.ts`

**Step 1: Update import**

Change:

```ts
import { env, isProduction } from '@/utils/config/env.server';
```

To:

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update usages**

Change all occurrences of:

- `isProduction()` → `env.isProd`
- `env.AUTH_OIDC_ISSUER` → `env.server.authOidcIssuer`
- `env.AUTH_OIDC_CLIENT_ID` → `env.server.authOidcClientId`
- `env.APP_URL` → `env.public.appUrl`
- `env.SESSION_SECRET` → `env.server.sessionSecret`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 13: Update control-plane.factory.ts

**Files:**

- Modify: `app/modules/control-plane/control-plane.factory.ts`

**Step 1: Add import**

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update usages**

Change `process.env.API_URL` → `env.public.apiUrl`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 14: Update zitadel.server.ts

**Files:**

- Modify: `app/modules/auth/strategies/zitadel.server.ts`

**Step 1: Add import**

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update usages**

Change:

- `process.env.AUTH_OIDC_ISSUER` → `env.server.authOidcIssuer`
- `process.env.AUTH_OIDC_CLIENT_ID` → `env.server.authOidcClientId`
- `process.env.APP_URL` → `env.public.appUrl`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 15: Update rbac.middleware.ts

**Files:**

- Modify: `app/modules/rbac/rbac.middleware.ts`

**Step 1: Add import**

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update usage**

Change `process.env.APP_URL` → `env.public.appUrl`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 16: Update loki/client.ts

**Files:**

- Modify: `app/modules/loki/client.ts`

**Step 1: Add import**

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update usage**

Change `process.env.TELEMETRY_URL` → `env.server.telemetryUrl`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 17: Update observability/providers/sentry.ts

**Files:**

- Modify: `observability/providers/sentry.ts`

**Step 1: Add import**

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update usages**

Change:

- `process.env.SENTRY_DSN` → `env.public.sentryDsn`
- `process.env.SENTRY_ENV` → `env.public.sentryEnv`
- `process.env.VERSION` → `env.public.version`
- `process.env.NODE_ENV === 'production'` → `env.isProd`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

---

## Task 18: Update observability/providers/otel.ts

**Files:**

- Modify: `observability/providers/otel.ts`

**Step 1: Add import**

```ts
import { env } from '@/utils/env/env.server';
```

**Step 2: Update usages**

Change:

- `process.env.OTEL_ENABLED` → `env.public.otelEnabled` (already boolean)
- `process.env.OTEL_EXPORTER_OTLP_ENDPOINT` → `env.server.otelExporterEndpoint`
- `process.env.OTEL_LOG_LEVEL` → `env.public.otelLogLevel`
- `process.env.OTEL_EXPORTER_TIMEOUT` → `env.server.otelExporterTimeout`
- `process.env.NODE_ENV === 'development'` → `env.isDev`

**Step 3: Verify no TypeScript errors**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit all updates**

```bash
git add -A
git commit -m "refactor: migrate all files to use new env module"
```

---

## Task 19: Delete Old Config Files

**Files:**

- Delete: `app/utils/config/env.ts`
- Delete: `app/utils/config/env.server.ts`
- Delete: `app/utils/config/env.client.ts`

**Step 1: Delete old files**

```bash
rm app/utils/config/env.ts
rm app/utils/config/env.server.ts
rm app/utils/config/env.client.ts
```

**Step 2: Check for any remaining imports**

Run: `grep -r "from '@/utils/config/env" app/`
Expected: No matches

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit deletion**

```bash
git add -A
git commit -m "chore: delete old env config files"
```

---

## Task 20: Final Verification

**Step 1: Run full typecheck**

Run: `bun run typecheck`
Expected: PASS with no errors

**Step 2: Run build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Test server startup**

Run: `timeout 10 bun run dev || true`
Expected: Server starts without env validation errors

**Step 4: Final commit (if needed)**

```bash
git add -A
git commit -m "refactor: complete unified env configuration migration"
```

---

## Summary

| Phase   | Tasks | Description                   |
| ------- | ----- | ----------------------------- |
| Create  | 1-4   | New env module files          |
| Migrate | 5-18  | Update all imports and usages |
| Cleanup | 19-20 | Delete old files, verify      |

**Total Tasks:** 20
**Estimated Time:** 60-90 minutes
