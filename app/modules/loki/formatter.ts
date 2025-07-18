/**
 * Audit log formatting and categorization utilities
 */
import type { ActivityCategory, FormatAuditMessageOptions } from './types';
import {
  isValid,
  parseISO,
  fromUnixTime,
  subSeconds,
  subMinutes,
  subHours,
  subDays,
  subWeeks,
} from 'date-fns';

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
 * Converts time parameter to ISO date string using date-fns
 */
export function convertTimeToUserFriendly(timeParam: string): string {
  const now = new Date();

  // Handle empty or 'now'
  if (!timeParam || timeParam === 'now') {
    return now.toISOString();
  }

  // Handle relative time formats (1s, 30m, 24h, 7d, 2w) using date-fns
  const relativeMatch = timeParam.match(/^(\d+)([smhdw])$/);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const value = parseInt(amount, 10);

    let targetDate: Date;

    try {
      switch (unit) {
        case 's':
          targetDate = subSeconds(now, value);
          break;
        case 'm':
          targetDate = subMinutes(now, value);
          break;
        case 'h':
          targetDate = subHours(now, value);
          break;
        case 'd':
          targetDate = subDays(now, value);
          break;
        case 'w':
          targetDate = subWeeks(now, value);
          break;
        default:
          throw new Error(`Unsupported time unit: ${unit}`);
      }

      if (isValid(targetDate)) {
        return targetDate.toISOString();
      }
    } catch (error) {
      console.warn(`Error processing relative time ${timeParam}:`, error);
    }
  }

  // Handle Unix timestamp (seconds) using date-fns
  const timestamp = parseInt(timeParam, 10);
  if (!isNaN(timestamp) && timestamp > 0 && timeParam === timestamp.toString()) {
    try {
      const date = fromUnixTime(timestamp);
      if (isValid(date)) {
        return date.toISOString();
      }
    } catch (error) {
      console.warn(`Error processing Unix timestamp ${timeParam}:`, error);
    }
  }

  // Handle ISO date string using date-fns
  try {
    const date = parseISO(timeParam);
    if (isValid(date)) {
      return date.toISOString();
    }
  } catch (error) {
    console.warn(`Error parsing ISO date ${timeParam}:`, error);
  }

  // Handle date-only format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(timeParam)) {
    try {
      const date = parseISO(`${timeParam}T00:00:00Z`);
      if (isValid(date)) {
        return date.toISOString();
      }
    } catch (error) {
      console.warn(`Error parsing date ${timeParam}:`, error);
    }
  }

  // Fallback to current time
  return now.toISOString();
}
