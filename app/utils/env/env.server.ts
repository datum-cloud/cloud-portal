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
// SCHEMAS
// ═══════════════════════════════════════════════════════════

// In test mode, make required fields optional with defaults
const publicSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  VERSION: z.string().optional(),
  DEBUG: z.string().optional(),
  APP_URL: isTestEnv ? z.string().default('http://localhost:3000') : z.string().url(),
  API_URL: isTestEnv ? z.string().default('http://localhost:8080') : z.string().url(),
  GRAPHQL_URL: z.url(),
  AUTH_OIDC_ISSUER: z.url(),
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
  SESSION_SECRET: isTestEnv
    ? z.string().default('test-session-secret-at-least-32-chars-long')
    : z.string().min(32),
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
  // Redis Configuration
  REDIS_URL: z.string().url().optional(),
  REDIS_MAX_RETRIES: z.coerce.number().int().positive().default(3),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().int().positive().default(5000),
  REDIS_COMMAND_TIMEOUT: z.coerce.number().int().positive().default(3000),
  REDIS_KEY_PREFIX: z.string().default('cloud-portal:'),
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
    otelEnabled: data.OTEL_ENABLED === 'true' && !!data.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelLogLevel: data.OTEL_LOG_LEVEL,
  },
  server: {
    sessionSecret: data.SESSION_SECRET,
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
