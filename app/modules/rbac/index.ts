// NOTE: This is the CLIENT barrel and must stay browser-safe.
// Server-only entrypoints (`RbacService`, `canInLoader`) must be imported
// directly from `@/modules/rbac/server/*` — re-exporting them here drags
// server-only dependencies (prom-client, axios, control-plane SDK) into the
// browser bundle.

// Types
export type { PermissionVerb, PermissionCheckScope } from './types';
export { PermissionVerbSchema, PermissionCheckSchema } from './types';

// Context + Provider
export { RbacContext, type RbacContextValue } from './context/rbac.context';
export { RbacProvider } from './context/rbac.provider';

// Hooks
export {
  usePermissions,
  usePermission,
  useHasPermission,
  usePermissionCheck,
  useAccessReview,
} from './hooks';

// Components
export { PermissionGate, PermissionButton, PermissionCheck, withPermission } from './components';

// Client
export {
  checkPermissionAPI,
  checkPermissionsBulkAPI,
  type CheckPermissionInput,
  type BulkCheckResult,
} from './client';
