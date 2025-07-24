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
  // Hybrid filtering approach
  q?: string; // Flexible search across multiple fields (user, resource, action, etc.)
  user?: string; // Specific user filter
  resource?: string; // Specific resource type filter
  status?: string; // Status filter (success, error, or specific codes like 403)
  /**
   * Action filter
   * get - Read a specific resource
   * list - List a collection of resources
   * watch - Watch for changes
   * create - Submit new resources
   * update - Modify existing resources
   * patch - Partially update resources
   * delete - Remove a resource
   * deletecollection - Remove multiple resources
   * proxy - Proxy access through Kubernetes API server
   * * - Wildcard to match all verbs
   */
  actions?: string; // Comma-separated list of verbs to filter (e.g., "create,update,delete")
}

export interface ValidatedQueryParams {
  limit: number;
  start: string;
  end: string;
}

export interface LokiQueryResponse {
  logs: string[];
  timerange: [number, number];
}

export interface ActivityLogEntry {
  timestamp: string;
  message: string;
  formattedMessage?: string; // HTML formatted message with class names
  statusMessage?: string; // Status code and description
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
  query: string;
  timeRange: {
    start: string; // ISO date string
    end: string; // ISO date string
  };
}

export interface LogQLQueryOptions {
  baseSelector: string;
  projectName?: string;
  // Hybrid filtering approach
  q?: string; // Flexible search across multiple fields
  user?: string; // Specific user filter
  action?: string; // Specific action filter
  resource?: string; // Specific resource type filter
  status?: string; // Status filter (success, error, or specific codes)
  actions?: string; // Comma-separated list of verbs to filter (e.g., "create,update,delete")
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
