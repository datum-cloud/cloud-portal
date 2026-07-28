// app/utils/env/index.ts
// Universal env module - works on both server and client
// For server secrets, import directly from '@/utils/env/env.server'
import { omitBlankEnv } from './omit-blank-env';
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
  graphqlUrl: '',
  authOidcIssuer: '',
  authZitadelProjectId: undefined,
  sentryDsn: undefined,
  sentryEnv: undefined,
  rybbitSiteId: undefined,
  rybbitTag: undefined,
  helpscoutBeaconId: undefined,
  logLevel: 'info',
  logFormat: 'pretty',
  logCurl: false,
  logRedactTokens: true,
  logPayloads: false,
  otelEnabled: false,
  otelLogLevel: undefined,
  chatbotEnabled: false,
  googleMapsApiKey: undefined,
};

// Get public env values - works on both server and client
function getPublicEnv(): PublicEnv {
  // Client-side: use window.ENV
  if (typeof window !== 'undefined') {
    return window.ENV ?? clientDefaults;
  }

  // Server-side (SSR): read from process.env. Blank values are dropped so the
  // `??` fallbacks below treat `FOO=` the same as an absent FOO — matching
  // env.server.ts, which would otherwise disagree with this module.
  const source = omitBlankEnv(process.env);
  const nodeEnv = (source.NODE_ENV as PublicEnv['nodeEnv']) ?? 'development';
  return {
    nodeEnv,
    version: source.VERSION,
    debug: source.DEBUG === 'true' || source.DEBUG === '1',
    appUrl: source.APP_URL ?? '',
    apiUrl: source.API_URL ?? '',
    graphqlUrl: source.GRAPHQL_URL ?? '',
    authOidcIssuer: source.AUTH_OIDC_ISSUER ?? '',
    authZitadelProjectId: source.AUTH_ZITADEL_PROJECT_ID,
    sentryDsn: source.SENTRY_DSN,
    sentryEnv: source.SENTRY_ENV,
    rybbitSiteId: source.RYBBIT_SITE_ID,
    rybbitTag: source.RYBBIT_TAG,
    helpscoutBeaconId: source.HELPSCOUT_BEACON_ID,
    logLevel:
      (source.LOG_LEVEL as PublicEnv['logLevel']) ?? (nodeEnv === 'production' ? 'info' : 'debug'),
    logFormat:
      (source.LOG_FORMAT as PublicEnv['logFormat']) ??
      (nodeEnv === 'production' ? 'json' : 'pretty'),
    logCurl: source.LOG_CURL !== 'false' && nodeEnv === 'development',
    logRedactTokens: source.LOG_REDACT_TOKENS !== 'false' || nodeEnv === 'production',
    logPayloads: source.LOG_PAYLOADS === 'true' || nodeEnv === 'development',
    otelEnabled: source.OTEL_ENABLED === 'true' && !!source.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelLogLevel: source.OTEL_LOG_LEVEL as PublicEnv['otelLogLevel'],
    chatbotEnabled: source.CHATBOT_ENABLED === 'true',
    googleMapsApiKey: source.GOOGLE_MAPS_API_KEY || undefined,
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
