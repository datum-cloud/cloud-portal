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

const isProdEnv = process.env.NODE_ENV === 'production';

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
  AUTH_ZITADEL_PROJECT_ID: z.string().optional(),
  AUTH_OIDC_POST_LOGOUT_REDIRECT_URI: urlSchemaOptional(),
  // Origin of the auth-ui service (passkey management, reauth). Distinct
  // from AUTH_OIDC_ISSUER (Zitadel itself). Used to build /id/passkeys links.
  AUTH_UI_ORIGIN: urlSchema('http://localhost:3001'),

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
  RYBBIT_SITE_ID: z.string().optional(),
  RYBBIT_TAG: z.string().optional(),
  HELPSCOUT_BEACON_ID: isProdEnv ? z.string().min(1) : z.string().optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: Feature Flags
  // ─────────────────────────────────────────────────────────
  CHATBOT_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: Google Maps / Places (browser key)
  // ─────────────────────────────────────────────────────────
  GOOGLE_MAPS_API_KEY: z.string().optional(),

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
  HELPSCOUT_SECRET_KEY: isProdEnv ? z.string().min(1) : z.string().optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: AI Assistant
  // ─────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: Usage Pipeline (Milo billing → Amberflo)
  //
  // When USAGE_GATEWAY_URL is unset, usage emission is a no-op.
  // USAGE_GATEWAY_API_KEY, when set, is forwarded as the `x-api-key`
  // header on each batch — the billing-ingestion-proxy requires it.
  // ─────────────────────────────────────────────────────────
  USAGE_GATEWAY_URL: urlSchemaOptional(),
  USAGE_GATEWAY_API_KEY: z.string().optional(),

  // ─────────────────────────────────────────────────────────
  // Optional: Amberflo usage query (read path for usage chart)
  //
  // AMBERFLO_API_KEY: secret key for POST /usage — never sent to browser.
  // AMBERFLO_BASE_URL: defaults to https://app.amberflo.io.
  // Meter names are discovered automatically from platform MeterDefinition resources.
  // ─────────────────────────────────────────────────────────
  AMBERFLO_API_KEY: z.string().optional(),
  AMBERFLO_BASE_URL: z.url().default('https://app.amberflo.io'),

  // ─────────────────────────────────────────────────────────
  // Optional: Redis (falls back to in-memory)
  // ─────────────────────────────────────────────────────────
  REDIS_URL: urlSchemaOptional(),
  REDIS_MAX_RETRIES: z.coerce.number().int().positive().default(3),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().int().positive().default(5000),
  REDIS_COMMAND_TIMEOUT: z.coerce.number().int().positive().default(3000),
  REDIS_KEY_PREFIX: z.string().default('cloud-portal:'),

  // ─────────────────────────────────────────────────────────
  // Optional: Portal Plugin System (dev-only)
  //
  // These are development-only plugin-loading vectors — they are ignored
  // unless NODE_ENV=development. See docs/enhancements/portal-plugin-system.md.
  //   PORTAL_PLUGINS: "<slug>=<url>,…" static dev-override registry entries.
  //   PORTAL_PLUGINS_JSON: JSON array of spec-shaped entries; takes
  //     precedence over PORTAL_PLUGINS on slug collision.
  // ─────────────────────────────────────────────────────────
  PORTAL_PLUGINS: z.string().optional(),
  PORTAL_PLUGINS_JSON: z.string().optional(),
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
    authUiOrigin: data.AUTH_UI_ORIGIN,
    authZitadelProjectId: data.AUTH_ZITADEL_PROJECT_ID,
    authPostLogoutRedirectUri: data.AUTH_OIDC_POST_LOGOUT_REDIRECT_URI,
    sentryDsn: data.SENTRY_DSN,
    sentryEnv: data.SENTRY_ENV,
    rybbitSiteId: data.RYBBIT_SITE_ID,
    rybbitTag: data.RYBBIT_TAG,
    helpscoutBeaconId: data.HELPSCOUT_BEACON_ID,
    logLevel: data.LOG_LEVEL ?? (data.NODE_ENV === 'production' ? 'info' : 'debug'),
    logFormat: data.LOG_FORMAT ?? (data.NODE_ENV === 'production' ? 'json' : 'pretty'),
    logCurl: data.LOG_CURL !== 'false' && data.NODE_ENV === 'development',
    logRedactTokens: data.LOG_REDACT_TOKENS !== 'false' || data.NODE_ENV === 'production',
    logPayloads: data.LOG_PAYLOADS === 'true' || data.NODE_ENV === 'development',
    otelEnabled: data.OTEL_ENABLED === true && !!data.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelLogLevel: data.OTEL_LOG_LEVEL,
    chatbotEnabled: data.CHATBOT_ENABLED === true,
    googleMapsApiKey: data.GOOGLE_MAPS_API_KEY || undefined,
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
    // AI Assistant
    anthropicApiKey: data.ANTHROPIC_API_KEY,
    anthropicModel: data.ANTHROPIC_MODEL,
    // Usage Pipeline
    usageGatewayUrl: data.USAGE_GATEWAY_URL,
    usageGatewayApiKey: data.USAGE_GATEWAY_API_KEY,
    // Amberflo read
    amberfloApiKey: data.AMBERFLO_API_KEY,
    amberfloBaseUrl: data.AMBERFLO_BASE_URL,
    // Redis
    redisUrl: data.REDIS_URL,
    redisMaxRetries: data.REDIS_MAX_RETRIES,
    redisConnectTimeout: data.REDIS_CONNECT_TIMEOUT,
    redisCommandTimeout: data.REDIS_COMMAND_TIMEOUT,
    redisKeyPrefix: data.REDIS_KEY_PREFIX,
    // Portal Plugin System (dev-only)
    portalPlugins: data.PORTAL_PLUGINS,
    portalPluginsJson: data.PORTAL_PLUGINS_JSON,
  },
  isProd: data.NODE_ENV === 'production',
  isDev: data.NODE_ENV === 'development',
  isTest: data.NODE_ENV === 'test',
};

export type { Env, PublicEnv, ServerEnv } from './types';
