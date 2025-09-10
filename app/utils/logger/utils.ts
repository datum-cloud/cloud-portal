import { Logger } from './logger';

/**
 * Create a logger with request context for use in route handlers
 * Usage: const reqLogger = createRequestLogger(c);
 */
export function createRequestLogger(context: { get: (key: string) => string | undefined }) {
  const reqId = context.get('requestId');
  return new Logger({ reqId });
}

/**
 * Create a logger with user context for use in authenticated routes
 * Usage: const userLogger = createUserLogger(userId);
 */
export function createUserLogger(userId: string) {
  return new Logger({ userId });
}

/**
 * Create a logger with session context for use in session-aware components
 * Usage: const sessionLogger = createSessionLogger(sessionId);
 */
export function createSessionLogger(sessionId: string) {
  return new Logger({ sessionId });
}
