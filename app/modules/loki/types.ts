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
  organization?: string;
  // Hybrid filtering approach
  q?: string; // Flexible search across multiple fields (user, resource, action, etc.)
  user?: string; // Specific user filter
  // ObjectRef filtering - supports complete Kubernetes resource identification
  resource?: string; // objectRef_resource (e.g., "organizations", "locations")
  objectName?: string; // objectRef_name (e.g., "personal-org-793a7f9c")
  apiGroup?: string; // objectRef_apiGroup (e.g., "resourcemanager.miloapis.com")
  apiVersion?: string; // objectRef_apiVersion (e.g., "v1alpha1")
  status?: string; // Status filter (success, error, or specific codes like 403)
  // Loki-specific filtering
  stage?: string; // Audit log stage filter (default: "ResponseComplete")
  excludeDryRun?: boolean; // Exclude dry run requests (default: true)
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
  statusMessage?: string; // Simplified status (Success/Client Error/Server Error)
  detailedStatusMessage?: string; // Detailed status for tooltips (200 OK, 403 Forbidden, etc.)
  errorMessage?: string; // Error message from responseStatus.message
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
  // Hybrid filtering approach
  q?: string; // Flexible search across multiple fields
  project?: string;
  organization?: string;
  user?: string; // Specific user filter
  action?: string; // Specific action filter
  // ObjectRef filtering - supports complete Kubernetes resource identification
  resource?: string; // objectRef_resource (e.g., "organizations", "locations")
  objectName?: string; // objectRef_name (e.g., "personal-org-793a7f9c")
  apiGroup?: string; // objectRef_apiGroup (e.g., "resourcemanager.miloapis.com")
  apiVersion?: string; // objectRef_apiVersion (e.g., "v1alpha1")
  status?: string; // Status filter (success, error, or specific codes)
  // Loki-specific filtering
  stage?: string; // Audit log stage filter (default: "ResponseComplete")
  excludeDryRun?: boolean; // Exclude dry run requests (default: true)
  actions?: string; // Comma-separated list of verbs to filter (e.g., "create,update,delete")
}

export interface FormatAuditMessageOptions {
  truncate?: boolean;
  maxLength?: number;
  truncateSuffix?: string;
  showNamespace?: boolean; // Control namespace display in formatted messages
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
