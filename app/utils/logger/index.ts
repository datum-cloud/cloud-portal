// Import Logger class for creating instances
import { Logger } from './logger';

// Export Logger class and interfaces
export { Logger, type LogContext, type LogLevel, type CallerInfo } from './logger';

// Export utility functions
export { createRequestLogger, createUserLogger, createSessionLogger } from './utils';

// Export Sentry utilities
export {
  setSentryUser,
  clearSentryUser,
  addSentryBreadcrumb,
  setSentryTag,
  setSentryContext,
} from './sentry';

// Create and export default logger instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  trace: (message: string, data?: any) => logger.trace(message, data),
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, data?: any) => logger.error(message, data),
  fatal: (message: string, data?: any) => logger.fatal(message, data),
};

// Export default logger
export default logger;
