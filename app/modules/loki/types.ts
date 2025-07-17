/**
 * Type definitions for Loki integration
 */

export interface LokiConfig {
  readonly remoteApiURL: string;
  readonly defaultLimit: number;
  readonly maxLimit: number;
  readonly defaultTimeRange: string;
}

export interface QueryParams {
  limit?: string;
  start?: string;
  end?: string;
  project?: string;
  level?: string;
  search?: string;
}

export interface ValidatedQueryParams {
  limit: number;
  start: string;
  end: string;
  level?: string;
}

export interface LokiQueryResponse {
  logs: string[];
  timerange: [number, number];
}

export interface ActivityLogEntry {
  timestamp: string;
  message: string;
  level: string;
  labels?: Record<string, string>;
  raw?: string;
  // Kubernetes audit log specific fields
  auditId?: string;
  user?: {
    username: string;
    uid: string;
    groups: string[];
  };
  verb?: string;
  resource?: {
    apiGroup?: string;
    apiVersion?: string;
    resource?: string;
    namespace?: string;
    name?: string;
  };
  requestUri?: string;
  responseStatus?: {
    code: number;
    message?: string;
    reason?: string;
  };
  sourceIPs?: string[];
  userAgent?: string;
  stage?: string;
  annotations?: Record<string, string>;
  // UI enhancement fields
  category?: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
}

export interface ActivityLogsResponse {
  logs: ActivityLogEntry[];
  total: number;
  hasMore: boolean;
  query: string;
  timeRange: {
    start: string; // ISO date string
    end: string; // ISO date string
    startLabel?: string; // Human-readable label like "48 hours ago"
    endLabel?: string; // Human-readable label like "now"
  };
}

export interface LogQLQueryOptions {
  baseSelector: string;
  projectName?: string;
  level?: string;
  search?: string;
}

export interface FormatAuditMessageOptions {
  truncate?: boolean;
  maxLength?: number;
  truncateSuffix?: string;
}

export interface ActivityCategory {
  category: 'success' | 'error' | 'warning' | 'info';
  icon: string;
}

export interface ParsedLogLine {
  message: string;
  level: string;
  parsed: any;
}
