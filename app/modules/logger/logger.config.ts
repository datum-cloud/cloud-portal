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
