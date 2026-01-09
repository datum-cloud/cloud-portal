// app/utils/env/index.ts
// Universal env module - works on both server and client
// For server secrets, import directly from '@/utils/env/env.server'
import type { PublicEnv } from './types';

declare global {
  interface Window {
    ENV?: PublicEnv;
  }
}

// Client defaults (used when window.ENV is not yet hydrated)
const clientDefaults: PublicEnv = {
  nodeEnv: 'production',
  version: undefined,
  debug: false,
  appUrl: '',
  apiUrl: '',
  authOidcIssuer: '',
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

// Get public env values - works on both server and client
function getPublicEnv(): PublicEnv {
  // Client-side: use window.ENV
  if (typeof window !== 'undefined') {
    return window.ENV ?? clientDefaults;
  }

  // Server-side (SSR): read from process.env
  const nodeEnv = (process.env.NODE_ENV as PublicEnv['nodeEnv']) ?? 'development';
  return {
    nodeEnv,
    version: process.env.VERSION,
    debug: process.env.DEBUG === 'true' || process.env.DEBUG === '1',
    appUrl: process.env.APP_URL ?? '',
    apiUrl: process.env.API_URL ?? '',
    authOidcIssuer: process.env.AUTH_OIDC_ISSUER ?? '',
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnv: process.env.SENTRY_ENV,
    fathomId: process.env.FATHOM_ID,
    helpscoutBeaconId: process.env.HELPSCOUT_BEACON_ID,
    logLevel:
      (process.env.LOG_LEVEL as PublicEnv['logLevel']) ??
      (nodeEnv === 'production' ? 'info' : 'debug'),
    logFormat:
      (process.env.LOG_FORMAT as PublicEnv['logFormat']) ??
      (nodeEnv === 'production' ? 'json' : 'pretty'),
    logCurl: process.env.LOG_CURL !== 'false' && nodeEnv === 'development',
    logRedactTokens: process.env.LOG_REDACT_TOKENS !== 'false' || nodeEnv === 'production',
    logPayloads: process.env.LOG_PAYLOADS === 'true' || nodeEnv === 'development',
    otelEnabled: process.env.OTEL_ENABLED === 'true' && !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelLogLevel: process.env.OTEL_LOG_LEVEL as PublicEnv['otelLogLevel'],
  };
}

const publicEnv = getPublicEnv();

export const env = {
  public: publicEnv,

  get server(): never {
    throw new Error(
      'env.server is not available from universal import. Import from @/utils/env/env.server instead.'
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

// Convenience helpers
export const isProd = (): boolean => env.isProd;
export const isDev = (): boolean => env.isDev;
export const isTest = (): boolean => env.isTest;

export type { PublicEnv, ServerEnv, Env } from './types';
