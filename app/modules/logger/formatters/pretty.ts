// app/modules/logger/formatters/pretty.ts
import type { LogLevel, LogContext } from '../logger.types';

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

export function formatPretty(level: LogLevel, message: string, context?: LogContext): string {
  const color = COLORS[level];
  const levelStr = level.toUpperCase().padEnd(5);
  const prefix = `${color}[${levelStr}]${RESET}`;

  let output = `${prefix} ${message}`;

  // Add curl on separate line if present
  if (context?.curl) {
    const { curl, ...rest } = context;
    if (Object.keys(rest).length > 0) {
      output += ` ${DIM}${JSON.stringify(rest)}${RESET}`;
    }
    output += `\n${DIM}  curl: ${curl}${RESET}`;
  } else if (context && Object.keys(context).length > 0) {
    output += ` ${DIM}${JSON.stringify(context)}${RESET}`;
  }

  return output;
}
