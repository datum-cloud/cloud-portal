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
  /** Whether to output logs to console (disabled on client in production) */
  consoleOutput: boolean;
}

// On client in production, disable console output to avoid polluting browser console
const isClientProduction = typeof window !== 'undefined' && env.isProd;

export const LOGGER_CONFIG: LoggerConfig = {
  level: env.public.logLevel,
  format: env.public.logFormat,
  logCurl: env.public.logCurl,
  logApiCalls: typeof window === 'undefined' ? true : env.isDev,
  redactTokens: env.public.logRedactTokens,
  logPayloads: env.public.logPayloads,
  includeStackTrace: env.isDev,
  consoleOutput: !isClientProduction,
};
