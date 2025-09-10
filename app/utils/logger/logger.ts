import { toBoolean } from '@/utils/helpers/text.helper';

/**
 * Shared logger utility for consistent JSON logging across the application
 * Optimized for Bun runtime
 */
export interface LogContext {
  reqId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogLevel {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

export interface CallerInfo {
  file?: string;
  fullPath?: string;
  line?: number;
  column?: number;
}

export class Logger {
  private context: LogContext = {};

  constructor(initialContext: LogContext = {}) {
    this.context = { ...initialContext };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Add context to the current logger
   */
  addContext(context: LogContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Log a message with the specified level
   * Optimized for Bun's performance
   */
  private log(level: LogLevel['level'], message: string, data?: any): void {
    // Capture caller information
    const stack = new Error().stack;
    const callerInfo = this.getCallerInfo(stack);

    const logEntry = {
      level,
      time: Date.now(),
      msg: message,
      ...this.context,
      ...(data && { data }),
      ...(callerInfo && { caller: callerInfo }),
    };

    // Use Bun's optimized console.log for better performance
    // Pretty print in development mode for better readability
    const isDebug = typeof window === 'undefined' ? process.env.DEBUG : window?.ENV?.DEBUG;

    if (toBoolean(isDebug)) {
      // In debug mode, create clickable file links for browser console
      if (typeof window !== 'undefined' && callerInfo) {
        // Use separate console.log calls for better browser compatibility
        console.log(
          `%c${level.toUpperCase()}: ${message}`,
          `color: ${this.getLevelColor(level)}; font-weight: bold;`
        );
        console.log(logEntry);

        // Show clickable link - use full path if available, otherwise show descriptive path
        if (callerInfo.fullPath) {
          console.log(
            `%c🔗 Click to open: ${callerInfo.fullPath}:${callerInfo.line}:${callerInfo.column}`,
            'color: #0066cc; font-size: 11px; cursor: pointer;'
          );
        } else {
          console.log(
            `%c📍 ${callerInfo.file}:${callerInfo.line}:${callerInfo.column}`,
            'color: #666; font-size: 12px; text-decoration: underline; cursor: pointer;'
          );
        }
      } else {
        console.log(logEntry);
      }
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Extract caller information from stack trace
   */
  private getCallerInfo(stack?: string): CallerInfo | null {
    if (!stack) return null;

    const lines = stack.split('\n');
    // Skip the first line (Error constructor) and find the first caller
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        line &&
        !line.includes('Logger.log') &&
        !line.includes('Logger.') &&
        !line.includes('log.')
      ) {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          const [, _functionName, filePath, lineNum, columnNum] = match;
          const fileName = filePath.split('/').pop() || filePath;

          return {
            file: fileName,
            fullPath: filePath,
            line: parseInt(lineNum),
            column: parseInt(columnNum),
          };
        }
      }
    }
    return null;
  }

  /**
   * Get color for log level in browser console
   */
  private getLevelColor(level: LogLevel['level']): string {
    const colors: Record<LogLevel['level'], string> = {
      trace: '#9e9e9e',
      debug: '#2196f3',
      info: '#4caf50',
      warn: '#ff9800',
      error: '#f44336',
      fatal: '#9c27b0',
    };
    return colors[level] || '#000000';
  }

  trace(message: string, data?: any): void {
    this.log('trace', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  fatal(message: string, data?: any): void {
    this.log('fatal', message, data);
  }

  /**
   * Log HTTP request details
   */
  httpRequest(reqId: string, method: string, url: string, headers?: Record<string, string>): void {
    this.log('info', 'HTTP Request', {
      reqId,
      method,
      url,
      headers,
    });
  }

  /**
   * Log HTTP response details
   */
  httpResponse(
    reqId: string,
    status: number,
    responseTime: number,
    headers?: Record<string, string>
  ): void {
    this.log('info', 'HTTP Response', {
      reqId,
      status,
      responseTime,
      headers,
    });
  }

  /**
   * Log authentication events
   */
  auth(userId: string, action: string, details?: any): void {
    this.log('info', 'Authentication', {
      userId,
      action,
      ...details,
    });
  }

  /**
   * Log business logic events
   */
  business(action: string, details?: any): void {
    this.log('info', 'Business Logic', {
      action,
      ...details,
    });
  }
}
