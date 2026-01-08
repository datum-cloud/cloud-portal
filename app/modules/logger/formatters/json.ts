// app/modules/logger/formatters/json.ts
import { LOGGER_CONFIG } from '../logger.config';
import type { LogLevel, LogContext } from '../logger.types';

export function formatJson(level: LogLevel, message: string, context?: LogContext): string {
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...context,
  };

  // Redact tokens in curl commands
  if (entry.curl && LOGGER_CONFIG.redactTokens) {
    entry.curl = redactTokens(entry.curl as string);
  }

  return JSON.stringify(entry);
}

function redactTokens(str: string): string {
  // Redact Bearer tokens
  return str.replace(/(Authorization[:\s]*Bearer\s+)[^\s'"]*/gi, '$1[REDACTED]');
}
