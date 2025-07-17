/**
 * Audit log formatting and categorization utilities
 */
import type { ActivityCategory, FormatAuditMessageOptions } from './types';

// Cache status descriptions for better performance
const STATUS_DESCRIPTIONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
} as const;

// Cache verb categories for better performance
const VERB_CATEGORIES: Record<string, ActivityCategory> = {
  create: { category: 'success', icon: '➕' },
  update: { category: 'info', icon: '✏️' },
  patch: { category: 'info', icon: '🔧' },
  delete: { category: 'warning', icon: '🗑️' },
  get: { category: 'info', icon: '👁️' },
  list: { category: 'info', icon: '📋' },
  watch: { category: 'info', icon: '👀' },
} as const;

// Cache audit log level mapping
const AUDIT_LEVEL_MAP: Record<string, string> = {
  Metadata: 'info',
  Request: 'debug',
  RequestResponse: 'debug',
} as const;

/**
 * Maps Kubernetes audit log levels to standard log levels
 */
export function mapAuditLogLevel(auditLevel: string): string {
  return AUDIT_LEVEL_MAP[auditLevel] || auditLevel.toLowerCase();
}

/**
 * Categorizes audit log activities for better UX
 */
export function categorizeAuditActivity(verb: string, responseCode?: number): ActivityCategory {
  // Determine category based on HTTP response code first (more accurate)
  if (responseCode) {
    if (responseCode >= 200 && responseCode < 300) {
      return { category: 'success', icon: '✅' };
    } else if (responseCode >= 400 && responseCode < 500) {
      return { category: 'warning', icon: '⚠️' };
    } else if (responseCode >= 500) {
      return { category: 'error', icon: '❌' };
    }
  }

  // Fallback to verb-based categorization
  const lowerVerb = verb.toLowerCase();
  return VERB_CATEGORIES[lowerVerb] || { category: 'info', icon: '📝' };
}

/**
 * Formats a human-readable message for audit logs
 */
export function formatAuditMessage(auditLog: any, options: FormatAuditMessageOptions = {}): string {
  const action = auditLog.verb?.toUpperCase() || 'UNKNOWN';
  const resource = auditLog.objectRef?.resource || 'resource';
  const resourceName = auditLog.objectRef?.name;
  const namespace = auditLog.objectRef?.namespace;
  const user = auditLog.user?.username || 'unknown';
  const statusCode = auditLog.responseStatus?.code;
  const stage = auditLog.stage;

  let message = `${action} ${resource}`;

  if (resourceName) {
    message += `/${resourceName}`;
  }

  if (namespace && namespace !== 'default') {
    message += ` in namespace ${namespace}`;
  }

  message += ` by ${user}`;

  if (stage && stage !== 'ResponseComplete') {
    message += ` (${stage})`;
  }

  /* if (statusCode) {
    message += ` → ${statusCode}`;
    
    const description = STATUS_DESCRIPTIONS[statusCode];
    if (description) {
      message += ` ${description}`;
    }
  } */

  // Add error message if present and it's an error
  if (auditLog.responseStatus?.message && statusCode && statusCode >= 400) {
    const errorMsg = auditLog.responseStatus.message;

    // Apply truncation if enabled
    const { truncate = true, maxLength = 100, truncateSuffix = '...' } = options;

    const processedMsg =
      truncate && errorMsg.length > maxLength
        ? `${errorMsg.substring(0, maxLength)}${truncateSuffix}`
        : errorMsg;

    message += ` - ${processedMsg}`;
  }

  return message;
}

/**
 * Converts time parameter to ISO date string and human-readable label
 */
export function convertTimeToUserFriendly(
  timeParam: string,
  originalParam?: string
): { isoDate: string; label: string } {
  const now = new Date();

  // Handle empty or 'now'
  if (!timeParam || timeParam === 'now') {
    return {
      isoDate: now.toISOString(),
      label: 'now',
    };
  }

  // Handle relative time formats (1h, 30m, 24h, 7d)
  const relativeMatch = timeParam.match(/^(\d+)([smhdw])$/);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const value = parseInt(amount);

    let milliseconds = 0;
    let labelUnit = '';

    switch (unit) {
      case 's':
        milliseconds = value * 1000;
        labelUnit = value === 1 ? 'second' : 'seconds';
        break;
      case 'm':
        milliseconds = value * 60 * 1000;
        labelUnit = value === 1 ? 'minute' : 'minutes';
        break;
      case 'h':
        milliseconds = value * 60 * 60 * 1000;
        labelUnit = value === 1 ? 'hour' : 'hours';
        break;
      case 'd':
        milliseconds = value * 24 * 60 * 60 * 1000;
        labelUnit = value === 1 ? 'day' : 'days';
        break;
      case 'w':
        milliseconds = value * 7 * 24 * 60 * 60 * 1000;
        labelUnit = value === 1 ? 'week' : 'weeks';
        break;
    }

    const targetDate = new Date(now.getTime() - milliseconds);
    return {
      isoDate: targetDate.toISOString(),
      label: `${value} ${labelUnit} ago`,
    };
  }

  // Handle Unix timestamp (seconds)
  const timestamp = parseInt(timeParam);
  if (!isNaN(timestamp) && timestamp > 0 && timeParam === timestamp.toString()) {
    const date = new Date(timestamp * 1000);
    return {
      isoDate: date.toISOString(),
      label: date.toLocaleString(),
    };
  }

  // Handle ISO date string
  const date = new Date(timeParam);
  if (!isNaN(date.getTime())) {
    return {
      isoDate: date.toISOString(),
      label: date.toLocaleString(),
    };
  }

  // Fallback to current time
  return {
    isoDate: now.toISOString(),
    label: originalParam || timeParam,
  };
}
