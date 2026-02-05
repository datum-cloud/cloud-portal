// app/utils/env/types.ts

/**
 * Public Environment Variables
 * Safe to expose to the browser via window.ENV
 */
export interface PublicEnv {
  // Runtime Configuration
  nodeEnv: 'production' | 'development' | 'test';
  version?: string;
  debug: boolean;

  // Required: Core URLs
  appUrl: string;
  apiUrl: string;
  graphqlUrl: string;

  // Required: Authentication
  authOidcIssuer: string;

  // Optional: Observability
  sentryDsn?: string;
  sentryEnv?: string;
  otelEnabled: boolean;
  otelLogLevel?: 'debug' | 'info' | 'warn' | 'error';

  // Optional: Analytics & Support
  fathomId?: string;
  helpscoutBeaconId?: string;

  // Logging (always has defaults)
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'pretty' | 'compact';
  logCurl: boolean;
  logRedactTokens: boolean;
  logPayloads: boolean;
}

/**
 * Server Environment Variables
 * Must never be exposed to the browser
 */
export interface ServerEnv {
  // Required: Authentication & Session
  sessionSecret: string;
  authOidcClientId: string;

  // Required: Feature Services
  prometheusUrl: string;
  cloudvalidApiUrl: string;
  cloudvalidApiKey: string;
  cloudvalidTemplateId: string;

  // Optional: Observability
  otelExporterEndpoint?: string;
  otelExporterTimeout?: number;

  // Optional: External Integrations
  grafanaUrl?: string;
  helpscoutSecretKey?: string;

  // Optional: Redis (falls back to in-memory)
  redisUrl?: string;
  redisMaxRetries: number;
  redisConnectTimeout: number;
  redisCommandTimeout: number;
  redisKeyPrefix: string;
}

/**
 * Complete Environment Configuration
 */
export interface Env {
  public: PublicEnv;
  server: ServerEnv;
  isProd: boolean;
  isDev: boolean;
  isTest: boolean;
}
