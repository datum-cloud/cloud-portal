export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  // Correlation IDs (OpenTelemetry compatible)
  requestId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;

  // User context
  userId?: string;
  sessionId?: string;
  organizationId?: string;

  // Request context
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;

  // Log type for filtering
  type?: 'request' | 'api' | 'service' | 'log';

  // Extensible
  [key: string]: unknown;
}

export interface LogData {
  [key: string]: unknown;
}

export interface RequestLogData {
  requestId?: string;
  method?: string;
  path?: string;
  status: number;
  duration: number;
  userAgent?: string;
}

export interface ApiLogData {
  method: string;
  url: string;
  status: number;
  duration?: number;
  curl?: string;
}

export interface ServiceLogData {
  duration: number;
  cached?: boolean;
  input?: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  service(name: string, method: string, data: ServiceLogData): void;
  request(data: RequestLogData): void;
}
