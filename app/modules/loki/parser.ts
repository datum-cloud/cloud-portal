/**
 * Log parsing utilities
 */
import {
  formatAuditMessage,
  formatAuditMessageHtml,
  formatStatusMessage,
  categorizeAuditActivity,
  mapAuditLogLevel,
} from './formatter';
import type { ParsedLogLine, ActivityLogEntry } from './types';

/**
 * Safely parses a log line that might be JSON
 * Handles both regular logs and Kubernetes audit logs
 */
export function parseLogLine(logLine: string): ParsedLogLine {
  try {
    const parsed = JSON.parse(logLine);

    // Handle Kubernetes audit logs
    if (parsed.auditID && parsed.verb) {
      return {
        message: `${parsed.verb?.toUpperCase()} ${parsed.objectRef?.resource || 'resource'} by ${parsed.user?.username || 'unknown'}`,
        level: parsed.level || 'Metadata',
        parsed,
      };
    }

    // Handle regular logs
    return {
      message: parsed.message || parsed.msg || logLine,
      level: parsed.level || parsed.severity || 'info',
      parsed,
    };
  } catch {
    return {
      message: logLine,
      level: 'info',
      parsed: { message: logLine },
    };
  }
}

/**
 * Converts Loki nanosecond timestamp to ISO string
 */
export function parseLokiTimestamp(timestamp: string): string {
  try {
    // Loki timestamps are in nanoseconds
    const nanoseconds = parseInt(timestamp, 10);
    const milliseconds = Math.floor(nanoseconds / 1000000);
    return new Date(milliseconds).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Processes a single log entry and converts it to ActivityLogEntry
 */
export function processLogEntry(logLine: string): ActivityLogEntry {
  const { parsed } = parseLogLine(logLine);

  // Extract audit log information
  const auditLog = parsed;
  const isAuditLog = auditLog.auditID && auditLog.verb;

  // Use the timestamp from the audit log itself
  const timestamp = auditLog.requestReceivedTimestamp || auditLog.stageTimestamp;
  const formattedTimestamp = timestamp
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();

  let message = '';
  let category: 'success' | 'error' | 'warning' | 'info' = 'info';
  let icon = '';

  if (isAuditLog) {
    // Use the formatted audit message
    message = formatAuditMessage(auditLog, { truncate: false });

    // Get activity category and icon
    const activityInfo = categorizeAuditActivity(
      auditLog.verb || '',
      auditLog.responseStatus?.code
    );
    category = activityInfo.category;
    icon = activityInfo.icon;
  } else {
    message = auditLog.message || auditLog.msg || logLine;
  }

  // Create status message if available
  const statusMessage = isAuditLog ? formatStatusMessage(auditLog) : undefined;

  const activityEntry: ActivityLogEntry = {
    timestamp: formattedTimestamp,
    message,
    formattedMessage: isAuditLog
      ? formatAuditMessageHtml(auditLog, { truncate: false })
      : undefined,
    statusMessage,
    level: isAuditLog ? mapAuditLogLevel(auditLog.level || 'Metadata') : auditLog.level || 'info',
    // labels: {}, // No stream labels in this response format
    raw: logLine,
    category: isAuditLog ? category : undefined,
    icon: isAuditLog ? icon : undefined,
  };

  // Add audit log specific fields if available
  if (isAuditLog) {
    activityEntry.auditId = auditLog.auditID;
    activityEntry.verb = auditLog.verb;
    activityEntry.requestUri = auditLog.requestURI;
    activityEntry.sourceIPs = auditLog.sourceIPs;
    activityEntry.userAgent = auditLog.userAgent;
    activityEntry.stage = auditLog.stage;
    activityEntry.annotations = auditLog.annotations;

    if (auditLog.user) {
      activityEntry.user = {
        username: auditLog.user.username,
        uid: auditLog.user.uid,
        groups: auditLog.user.groups || [],
      };
    }

    if (auditLog.objectRef) {
      activityEntry.resource = {
        apiGroup: auditLog.objectRef.apiGroup,
        apiVersion: auditLog.objectRef.apiVersion,
        resource: auditLog.objectRef.resource,
        namespace: auditLog.objectRef.namespace,
        name: auditLog.objectRef.name,
      };
    }

    if (auditLog.responseStatus) {
      activityEntry.responseStatus = {
        code: auditLog.responseStatus.code,
        message: auditLog.responseStatus.message,
        reason: auditLog.responseStatus.reason,
      };
    }
  }

  return activityEntry;
}

/**
 * Processes multiple log entries with error handling
 */
export function processLogEntries(logs: string[]): ActivityLogEntry[] {
  const processedLogs: ActivityLogEntry[] = [];

  for (const logLine of logs) {
    try {
      const entry = processLogEntry(logLine);
      processedLogs.push(entry);
    } catch (error) {
      console.error('Error parsing log entry:', error);
      // Add raw entry if parsing fails
      processedLogs.push({
        timestamp: new Date().toISOString(),
        message: logLine,
        level: 'unknown',
        labels: {},
        raw: logLine,
      });
    }
  }

  return processedLogs;
}
