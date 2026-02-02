// app/modules/logger/index.ts
export { Logger, logger } from './logger';
export { LOGGER_CONFIG } from './logger.config';
export { generateCurl } from './integrations/curl';
export {
  setSentryUser,
  clearSentryUser,
  setTag as setSentryTag,
  setContext as setSentryContext,
} from '@/modules/sentry';
export type {
  LogLevel,
  LogContext,
  LogData,
  RequestLogData,
  ApiLogData,
  ServiceLogData,
} from './logger.types';

// Utility: Create request-scoped logger
export function createRequestLogger(context: {
  requestId: string;
  traceId?: string;
  spanId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
}) {
  return new (require('./logger').Logger)(context);
}
