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

// New canonical RBAC convention (sub-project #1)
// `defineResourceRoute` is NOT re-exported here because it transitively
// imports server-only modules (gateRouteAccess → metrics → prom-client).
// Route files that need it must deep-import:
//   import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
// This is consistent with how route files already mix server + client code
// at their top level (loader runs server-side, Page renders in both).
// Types from the DSL (DefineListRouteInput, DefineDetailRouteInput,
// CompanionDeclaration, RedirectDescriptor) ARE re-exported below because
// types are erased at compile time and carry no runtime cost.
export { useResourcePermissions, flagNameFor, buildChecks } from './use-resource-permissions';
export { useGuardedRouteData, assertNotRestricted } from './use-guarded-route-data';
export { GuardedPage, type GuardedPageProps } from './components/GuardedPage';
export type {
  DslLoaderData,
  DefineListRouteInput,
  DefineDetailRouteInput,
  CompanionDeclaration,
  RedirectDescriptor,
  ResourcePermissionVerbOptions,
  ResourcePermissionSubResource,
  UseResourcePermissionsInput,
} from './types';
