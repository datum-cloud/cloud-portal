/**
 * Hooks Layer exports
 */

export { usePermissions } from './usePermissions';
export { useHasPermission } from './useHasPermission';
export { usePermissionCheck } from './usePermissionCheck';

// Export hook types for consumers
export type { IUseHasPermissionOptions, IUseHasPermissionResult } from './useHasPermission';
export type {
  IPermissionCheckInput,
  IUsePermissionCheckOptions,
  IPermissionCheckResult,
} from './usePermissionCheck';
