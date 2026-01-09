// app/utils/env/types.ts

export interface PublicEnv {
  nodeEnv: 'production' | 'development' | 'test';
  version?: string;
  debug: boolean;
  appUrl: string;
  apiUrl: string;
  authOidcIssuer: string;
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
  sessionSecret: string;
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
  // Redis
  redisUrl?: string;
  redisMaxRetries: number;
  redisConnectTimeout: number;
  redisCommandTimeout: number;
  redisKeyPrefix: string;
}

export interface Env {
  public: PublicEnv;
  server: ServerEnv;
  isProd: boolean;
  isDev: boolean;
  isTest: boolean;
}
