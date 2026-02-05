// app/utils/env/env.server.ts
import type { Env } from './types';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// TEST MODE DETECTION
// ═══════════════════════════════════════════════════════════

// Skip strict validation in test environments (Cypress, Vitest, Jest)
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.CYPRESS === 'true' ||
  process.env.VITEST === 'true';

// ═══════════════════════════════════════════════════════════
// HELPER: Create URL schema with test default (Zod v4)
// ═══════════════════════════════════════════════════════════

// Zod v4: z.url() is now a top-level schema instead of z.string().url()
const urlSchema = (testDefault: string) => (isTestEnv ? z.url().default(testDefault) : z.url());

const urlSchemaOptional = () => z.url().optional();

// ═══════════════════════════════════════════════════════════
// SCHEMAS (Zod v4)
// ═══════════════════════════════════════════════════════════

/**
 * Public Schema - Variables safe to expose to the browser
 *
 * Required fields will cause process.exit(1) if missing/invalid.
 * Optional fields gracefully degrade when absent.
 */
const publicSchema = z.object({
  // ─────────────────────────────────────────────────────────
  // Runtime Configuration
  // ─────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  VERSION: z.string().optional(),
  DEBUG: z.string().optional(),

  // ─────────────────────────────────────────────────────────
  // Required: Core URLs
  // ─────────────────────────────────────────────────────────
  APP_URL: urlSchema('http://localhost:3000'),
  API_URL: urlSchema('http://localhost:8080'),
  GRAPHQL_URL: urlSchema('http://localhost:8080/graphql'),

  // ─────────────────────────────────────────────────────────
  // Required: Authentication
  // ─────────────────────────────────────────────────────────
  AUTH_OIDC_ISSUER: urlSchema('http://localhost:8080'),

  // ─────────────────────────────────────────────────────────
  // Optional: Observability (graceful degradation)
  // ─────────────────────────────────────────────────────────
  SENTRY_DSN: urlSchemaOptional(),
  SENTRY_ENV: z.string().optional(),
  OTEL_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  OTEL_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: Analytics & Support (graceful degradation)
  // ─────────────────────────────────────────────────────────
  FATHOM_ID: z.string().optional(),
  HELPSCOUT_BEACON_ID: z.string().optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: Logging Configuration
  // ─────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOG_FORMAT: z.enum(['json', 'pretty', 'compact']).optional(),
  LOG_CURL: z.string().optional(),
  LOG_REDACT_TOKENS: z.string().optional(),
  LOG_PAYLOADS: z.string().optional(),
});

/**
 * Server Schema - Variables that must never be exposed to the browser
 *
 * Required fields will cause process.exit(1) if missing/invalid.
 * Optional fields gracefully degrade when absent.
 */
const serverSchema = z.object({
  // ─────────────────────────────────────────────────────────
  // Required: Authentication & Session
  // ─────────────────────────────────────────────────────────
  SESSION_SECRET: isTestEnv
    ? z.string().min(32).default('test-session-secret-at-least-32-chars-long')
    : z.string().min(32),
  AUTH_OIDC_CLIENT_ID: isTestEnv ? z.string().default('test-client-id') : z.string().min(1),

  // ─────────────────────────────────────────────────────────
  // Required: Feature Services
  // ─────────────────────────────────────────────────────────
  PROMETHEUS_URL: urlSchema('http://localhost:9090'),
  CLOUDVALID_API_URL: urlSchema('http://localhost:8081'),
  CLOUDVALID_API_KEY: isTestEnv ? z.string().default('test-cloudvalid-api-key') : z.string().min(1),
  CLOUDVALID_TEMPLATE_ID: isTestEnv
    ? z.string().default('test-cloudvalid-template-id')
    : z.string().min(1),

  // ─────────────────────────────────────────────────────────
  // Optional: Observability (graceful degradation)
  // ─────────────────────────────────────────────────────────
  OTEL_EXPORTER_OTLP_ENDPOINT: urlSchemaOptional(),
  OTEL_EXPORTER_TIMEOUT: z.coerce.number().int().positive().optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: External Integrations (graceful degradation)
  // ─────────────────────────────────────────────────────────
  GRAFANA_URL: urlSchemaOptional(),
  HELPSCOUT_SECRET_KEY: z.string().optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: Redis (falls back to in-memory)
  // ─────────────────────────────────────────────────────────
  REDIS_URL: urlSchemaOptional(),
  REDIS_MAX_RETRIES: z.coerce.number().int().positive().default(3),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().int().positive().default(5000),
  REDIS_COMMAND_TIMEOUT: z.coerce.number().int().positive().default(3000),
  REDIS_KEY_PREFIX: z.string().default('cloud-portal:'),
});

// ═══════════════════════════════════════════════════════════
// VALIDATION (Zod v4)
// ═══════════════════════════════════════════════════════════

// Zod v4: Use .extend() instead of deprecated .merge()
const fullSchema = publicSchema.extend(serverSchema.shape);
const parsed = fullSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  // Zod v4: Use z.flattenError() instead of deprecated error.flatten()
  const flattened = z.flattenError(parsed.error);
  console.error(JSON.stringify(flattened.fieldErrors, null, 2));
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
    appUrl: data.APP_URL,
    apiUrl: data.API_URL,
    graphqlUrl: data.GRAPHQL_URL,
    authOidcIssuer: data.AUTH_OIDC_ISSUER,
    sentryDsn: data.SENTRY_DSN,
    sentryEnv: data.SENTRY_ENV,
    fathomId: data.FATHOM_ID,
    helpscoutBeaconId: data.HELPSCOUT_BEACON_ID,
    logLevel: data.LOG_LEVEL ?? (data.NODE_ENV === 'production' ? 'info' : 'debug'),
    logFormat: data.LOG_FORMAT ?? (data.NODE_ENV === 'production' ? 'json' : 'pretty'),
    logCurl: data.LOG_CURL !== 'false' && data.NODE_ENV === 'development',
    logRedactTokens: data.LOG_REDACT_TOKENS !== 'false' || data.NODE_ENV === 'production',
    logPayloads: data.LOG_PAYLOADS === 'true' || data.NODE_ENV === 'development',
    otelEnabled: data.OTEL_ENABLED === true && !!data.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelLogLevel: data.OTEL_LOG_LEVEL,
  },
  server: {
    sessionSecret: data.SESSION_SECRET,
    authOidcClientId: data.AUTH_OIDC_CLIENT_ID,
    prometheusUrl: data.PROMETHEUS_URL,
    cloudvalidApiUrl: data.CLOUDVALID_API_URL,
    cloudvalidApiKey: data.CLOUDVALID_API_KEY,
    cloudvalidTemplateId: data.CLOUDVALID_TEMPLATE_ID,
    grafanaUrl: data.GRAFANA_URL,
    helpscoutSecretKey: data.HELPSCOUT_SECRET_KEY,
    otelExporterEndpoint: data.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelExporterTimeout: data.OTEL_EXPORTER_TIMEOUT,
    // Redis
    redisUrl: data.REDIS_URL,
    redisMaxRetries: data.REDIS_MAX_RETRIES,
    redisConnectTimeout: data.REDIS_CONNECT_TIMEOUT,
    redisCommandTimeout: data.REDIS_COMMAND_TIMEOUT,
    redisKeyPrefix: data.REDIS_KEY_PREFIX,
  },
  isProd: data.NODE_ENV === 'production',
  isDev: data.NODE_ENV === 'development',
  isTest: data.NODE_ENV === 'test',
};

export type { Env, PublicEnv, ServerEnv } from './types';
