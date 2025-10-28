/**
 * Permission Interfaces
 * TypeScript interfaces for permission-related types
 */

/**
 * Permission verb type
 */
export type PermissionVerb = 'get' | 'list' | 'watch' | 'create' | 'update' | 'patch' | 'delete';

/**
 * Base permission check interface
 */
export interface IBasePermissionCheck {
  namespace?: string;
  verb: PermissionVerb;
  group: string;
  resource: string;
  name?: string;
}

/**
 * Permission check with organization ID
 */
export interface IPermissionCheck extends IBasePermissionCheck {
  organizationId: string;
}

/**
 * Bulk permission check request
 */
export interface IBulkPermissionCheckRequest {
  organizationId: string;
  checks: IBasePermissionCheck[];
}

/**
 * Permission check result
 */
export interface IPermissionResult {
  allowed: boolean;
  denied: boolean;
  reason?: string;
}

/**
 * Bulk permission check result
 */
export interface IBulkPermissionResult extends IPermissionResult {
  request: IBasePermissionCheck;
}

/**
 * Permission check response
 */
export interface IPermissionCheckResponse {
  success: boolean;
  data?: IPermissionResult;
  error?: string;
}

/**
 * Bulk permission check response
 */
export interface IBulkPermissionCheckResponse {
  success: boolean;
  data?: {
    results: IBulkPermissionResult[];
  };
  error?: string;
}
