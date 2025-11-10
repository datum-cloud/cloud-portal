/**
 * RBAC Module
 * Exports all RBAC functionality with clear client/server separation
 */

// ============================================================================
// Types
// ============================================================================
export type {
  PermissionVerb,
  IPermissionCheck,
  IPermissionResult,
  IBulkPermissionResult,
  IPermissionCheckWithResult,
  IPermissionContext,
  IPermissionGateProps,
  IPermissionCheckProps,
  IRbacMiddlewareConfig,
  IPermissionCacheKey,
  OnDeniedContext,
  OnDeniedHandler,
} from './types';

export { PermissionDeniedError, PERMISSIONS } from './types';

// ============================================================================
// Client-Side API (Browser Only)
// ============================================================================
export { checkPermissionAPI, checkPermissionsBulkAPI } from './client';

// ============================================================================
// Server-Side Service (Server Only)
// ============================================================================
export { RbacService } from './service';

// ============================================================================
// Context and Provider (Client-Side)
// ============================================================================
export { RbacContext, RbacProvider } from './context';

// ============================================================================
// Hooks (Client-Side)
// ============================================================================
export { usePermissions, useHasPermission, usePermissionCheck } from './hooks';
export type {
  IUseHasPermissionOptions,
  IUseHasPermissionResult,
  IPermissionCheckInput,
  IUsePermissionCheckOptions,
  IPermissionCheckResult,
} from './hooks';

// ============================================================================
// Middleware (Server-Side)
// ============================================================================
export { createRbacMiddleware, rbacMiddleware } from './rbac.middleware';

// ============================================================================
// Utilities
// ============================================================================
export {
  buildPermissionCacheKey,
  normalizePermissionCheck,
  extractOrgIdFromPath,
  resolveDynamicValue,
  formatPermissionCheck,
  isPermissionAllowed,
  combinePermissionsAND,
  combinePermissionsOR,
} from './permission-checker';

// ============================================================================
// Components
// ============================================================================
export { PermissionGate, PermissionCheck, withPermission } from './components';
