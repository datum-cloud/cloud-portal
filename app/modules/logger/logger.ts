// app/modules/logger/logger.ts
import { format } from './formatters';
import { LOGGER_CONFIG } from './logger.config';
import type {
  LogLevel,
  LogContext,
  LogData,
  RequestLogData,
  ApiLogData,
  ServiceLogData,
} from './logger.types';
import { addBreadcrumb, captureError, setTag } from '@/modules/sentry';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const merged = { ...this.context, ...context };
    const child = new Logger(merged);

    // Set request correlation tag in Sentry
    if (context.requestId) {
      setTag('request.id', context.requestId);
    }

    return child;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOGGER_CONFIG.level];
  }

  private log(level: LogLevel, message: string, data?: LogData): void {
    if (!this.shouldLog(level)) return;

    const context = { ...this.context, ...data };

    // Output to console only if enabled (disabled on client in production)
    if (LOGGER_CONFIG.consoleOutput) {
      const output = format(level, message, context);
      console.log(output);
    }

    // Add breadcrumb for Sentry (except debug) - always do this
    if (level !== 'debug') {
      addBreadcrumb(level, message, context.type || 'log', data);
    }
  }

  debug(message: string, data?: LogData): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogData): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogData): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | LogData, data?: LogData): void {
    let errorToCapture = error;
    if (error instanceof Error) {
      const errorData: LogData = {
        error: error.message,
        ...(LOGGER_CONFIG.includeStackTrace && { stack: error.stack }),
        ...data,
      };
      this.log('error', message, errorData);
      errorToCapture = error;
    } else {
      this.log('error', message, { ...error, ...data });
      errorToCapture = new Error(message);
    }

    captureError(errorToCapture, { message, extra: { ...this.context, ...data } });
  }

  /**
   * Log incoming HTTP request
   */
  request(data: RequestLogData): void {
    const reqId = this.context.requestId ? `[${this.context.requestId.slice(0, 8)}] ` : '';
    const message = `${reqId}${this.context.method} ${this.context.path} ${data.status} ${data.duration}ms`;

    this.log('info', message, {
      type: 'request',
      status: data.status,
      duration: data.duration,
    });
  }

  /**
   * Log outgoing API call
   */
  api(data: ApiLogData): void {
    // Only log API calls if enabled (disabled on client in production)
    if (!LOGGER_CONFIG.logApiCalls) return;

    const durationStr = data.duration ? ` ${data.duration}ms` : '';
    const message = `→ ${data.method} ${data.url} ${data.status}${durationStr}`;

    this.log('info', message, {
      type: 'api',
      ...(data.curl && LOGGER_CONFIG.logCurl && { curl: data.curl }),
    });
  }

  /**
   * Log failed API call
   */
  apiError(data: ApiLogData & { error: Error }): void {
    const message = `→ ${data.method} ${data.url} ${data.status}`;

    this.error(message, data.error, {
      type: 'api',
      ...(data.curl && LOGGER_CONFIG.logCurl && { curl: data.curl }),
    });
  }

  /**
   * Log service layer operation
   */
  service(name: string, method: string, data: ServiceLogData): void {
    // Only log service calls if enabled (disabled on client in production)
    if (!LOGGER_CONFIG.logApiCalls) return;

    const cached = data.cached ? ' (cached)' : '';
    const message = `[${name}.${method}] ${data.duration}ms${cached}`;

    this.log('info', message, {
      type: 'service',
      duration: data.duration,
      cached: data.cached,
      ...(LOGGER_CONFIG.logPayloads && data.input !== undefined ? { input: data.input } : {}),
    });
  }
}

// Default logger instance
export const logger = new Logger();
