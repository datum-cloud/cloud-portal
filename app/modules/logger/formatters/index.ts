// app/modules/logger/formatters/index.ts
import { LOGGER_CONFIG } from '../logger.config';
import type { LogLevel, LogContext } from '../logger.types';
import { formatJson } from './json';
import { formatPretty } from './pretty';

export function format(level: LogLevel, message: string, context?: LogContext): string {
  if (LOGGER_CONFIG.format === 'json') {
    return formatJson(level, message, context);
  }
  return formatPretty(level, message, context);
}

export { formatPretty, formatJson };
