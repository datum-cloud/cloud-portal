/**
 * RBAC Type Definitions
 * Core types for the Role-Based Access Control module
 */

/**
 * Supported Kubernetes API verbs for permission checks
 */
export type PermissionVerb = 'get' | 'list' | 'watch' | 'create' | 'update' | 'patch' | 'delete';

/**
 * Permission check request structure
 */
export interface IPermissionCheck {
  organizationId: string;
  namespace?: string;
  verb: PermissionVerb;
  group: string;
  resource: string;
  name?: string;
}

/**
 * Permission check result from API
 */
export interface IPermissionResult {
  allowed: boolean;
  denied: boolean;
  reason?: string;
}

/**
 * Bulk permission check result
 */
export interface IBulkPermissionResult {
  allowed: boolean;
  denied: boolean;
  reason?: string;
  request: Omit<IPermissionCheck, 'organizationId'>;
}

/**
 * Permission check with result
 */
export interface IPermissionCheckWithResult extends IPermissionCheck {
  result?: IPermissionResult;
  isLoading?: boolean;
  error?: Error;
}

/**
 * Permission context value
 */
export interface IPermissionContext {
  /**
   * Check if user has a specific permission
   */
  checkPermission: (check: Omit<IPermissionCheck, 'organizationId'>) => Promise<IPermissionResult>;

  /**
   * Check multiple permissions at once
   */
  checkPermissions: (
    checks: Array<Omit<IPermissionCheck, 'organizationId'>>
  ) => Promise<IBulkPermissionResult[]>;

  /**
   * Invalidate permission cache
   */
  invalidateCache: () => void;

  /**
   * Current organization ID
   */
  organizationId?: string;
}

/**
 * Permission gate props
 */
export interface IPermissionGateProps {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  namespace?: string;
  name?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * Permission check component props
 */
export interface IPermissionCheckProps {
  checks: Array<{
    resource: string;
    verb: PermissionVerb;
    group?: string;
    namespace?: string;
    name?: string;
  }>;
  operator?: 'AND' | 'OR';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * RBAC middleware configuration
 */
export interface IRbacMiddlewareConfig {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  namespace?: string | ((params: Record<string, string>) => string | undefined);
  name?: string | ((params: Record<string, string>) => string | undefined);
  /**
   * If true, redirect to error page on denial
   * If false or undefined, throw error in current page
   * Default: both - shows error and provides redirect option
   */
  onDenied?: 'redirect' | 'error' | 'both';
  /**
   * Custom redirect path when denied (only used with 'redirect' or 'both')
   * Default: '/error/403'
   */
  redirectTo?: string;
}

/**
 * Cache key builder for permissions
 */
export interface IPermissionCacheKey {
  organizationId: string;
  namespace?: string;
  verb: PermissionVerb;
  group: string;
  resource: string;
  name?: string;
}

/**
 * Permission error class
 */
export class PermissionDeniedError extends Error {
  public readonly statusCode = 403;
  public readonly permissionCheck: IPermissionCheck;

  constructor(message: string, permissionCheck: IPermissionCheck) {
    super(message);
    this.name = 'PermissionDeniedError';
    this.permissionCheck = permissionCheck;
  }
}

/**
 * Common resource/verb permission combinations
 */
export const PERMISSIONS = {
  WORKLOADS: {
    LIST: { resource: 'workloads', verb: 'list' as const, group: 'apps' },
    GET: { resource: 'workloads', verb: 'get' as const, group: 'apps' },
    CREATE: { resource: 'workloads', verb: 'create' as const, group: 'apps' },
    UPDATE: { resource: 'workloads', verb: 'update' as const, group: 'apps' },
    PATCH: { resource: 'workloads', verb: 'patch' as const, group: 'apps' },
    DELETE: { resource: 'workloads', verb: 'delete' as const, group: 'apps' },
  },
  SECRETS: {
    LIST: { resource: 'secrets', verb: 'list' as const, group: '' },
    GET: { resource: 'secrets', verb: 'get' as const, group: '' },
    CREATE: { resource: 'secrets', verb: 'create' as const, group: '' },
    UPDATE: { resource: 'secrets', verb: 'update' as const, group: '' },
    PATCH: { resource: 'secrets', verb: 'patch' as const, group: '' },
    DELETE: { resource: 'secrets', verb: 'delete' as const, group: '' },
  },
  CONFIGMAPS: {
    LIST: { resource: 'configmaps', verb: 'list' as const, group: '' },
    GET: { resource: 'configmaps', verb: 'get' as const, group: '' },
    CREATE: { resource: 'configmaps', verb: 'create' as const, group: '' },
    UPDATE: { resource: 'configmaps', verb: 'update' as const, group: '' },
    PATCH: { resource: 'configmaps', verb: 'patch' as const, group: '' },
    DELETE: { resource: 'configmaps', verb: 'delete' as const, group: '' },
  },
  SERVICES: {
    LIST: { resource: 'services', verb: 'list' as const, group: '' },
    GET: { resource: 'services', verb: 'get' as const, group: '' },
    CREATE: { resource: 'services', verb: 'create' as const, group: '' },
    UPDATE: { resource: 'services', verb: 'update' as const, group: '' },
    PATCH: { resource: 'services', verb: 'patch' as const, group: '' },
    DELETE: { resource: 'services', verb: 'delete' as const, group: '' },
  },
  NAMESPACES: {
    LIST: { resource: 'namespaces', verb: 'list' as const, group: '' },
    GET: { resource: 'namespaces', verb: 'get' as const, group: '' },
    CREATE: { resource: 'namespaces', verb: 'create' as const, group: '' },
    UPDATE: { resource: 'namespaces', verb: 'update' as const, group: '' },
    PATCH: { resource: 'namespaces', verb: 'patch' as const, group: '' },
    DELETE: { resource: 'namespaces', verb: 'delete' as const, group: '' },
  },
} as const;
