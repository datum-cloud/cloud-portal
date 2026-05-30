/**
 * RBAC Type Definitions
 * Core types for the Role-Based Access Control module
 */
import type { QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { z } from 'zod';

/**
 * Supported Kubernetes API verbs for permission checks
 */
export type PermissionVerb = 'get' | 'list' | 'watch' | 'create' | 'update' | 'patch' | 'delete';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Supported Kubernetes API verbs schema
 */
export const PermissionVerbSchema = z.enum([
  'get',
  'list',
  'watch',
  'create',
  'update',
  'patch',
  'delete',
]);

/**
 * Scope of a permission check. Determines which control-plane base the
 * SelfSubjectAccessReview is posted to:
 * - 'org' (default): organization-scoped resources
 * - 'user': user/root-scoped resources (e.g. `organizations`)
 * - 'project': project-scoped resources (requires `projectId`)
 */
export const PermissionScopeSchema = z.enum(['org', 'user', 'project']);

/**
 * Base permission check schema
 */
export const BasePermissionCheckSchema = z.object({
  namespace: z.string().optional(),
  verb: PermissionVerbSchema,
  group: z.string().default(''),
  resource: z.string().min(1, 'Resource is required'),
  name: z.string().optional(),
  scope: PermissionScopeSchema.optional(),
  projectId: z.string().optional(),
});

/**
 * Permission check schema with organization ID
 */
export const PermissionCheckSchema = BasePermissionCheckSchema.extend({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

/**
 * Bulk permission check schema — checks a batch of permissions in one request
 * to avoid client-side N+1 calls.
 */
export const BulkPermissionCheckSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  checks: z.array(BasePermissionCheckSchema).min(1, 'At least one check is required').max(50),
});

/**
 * Schema-derived types
 */
export type PermissionCheckScope = z.infer<typeof PermissionScopeSchema>;
export type BasePermissionCheck = z.infer<typeof BasePermissionCheckSchema>;
export type PermissionCheckInput = z.infer<typeof PermissionCheckSchema>;
export type BulkPermissionCheckInput = z.infer<typeof BulkPermissionCheckSchema>;

// ============================================================================
// TypeScript Interfaces
// ============================================================================

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

// ─── DSL & hook types (sub-project #1 — RBAC enterprise consistency) ──────

/** Strict envelope returned by every DSL loader. */
export type DslLoaderData<TData, TCompanions> =
  | { restricted: true }
  | { restricted: false; data: TData; companions: TCompanions };

/** Per-verb React Query options forwarded to the underlying SSAR call. */
export interface ResourcePermissionVerbOptions {
  staleTime?: number;
  refetchOnMount?: boolean | 'always';
  enabled?: boolean;
}

/** Sub-resource shape for `useResourcePermissions`. */
export interface ResourcePermissionSubResource {
  resource: string;
  group?: string;
  namespace?: string;
  scope?: PermissionCheckScope;
  alias: string;
  verbs: PermissionVerb[];
  options?: ResourcePermissionVerbOptions;
}

/** Input to `useResourcePermissions`. */
export interface UseResourcePermissionsInput {
  resource: string;
  group?: string;
  namespace?: string;
  scope?: PermissionCheckScope;
  verbs: PermissionVerb[];
  subResources?: ResourcePermissionSubResource[];
  options?: ResourcePermissionVerbOptions;
}

/** Mapping rule for sub-resource flag names. */
export const SUB_RESOURCE_VERB_PREFIX: Record<string, string> = {
  list: 'View',
  get: 'View',
  create: 'Create',
  patch: 'Edit',
  update: 'Edit',
  delete: 'Delete',
};

/** Companion fetch declaration in `defineResourceRoute`. */
export interface CompanionDeclaration<TData, TCompanionData> {
  resource: string;
  group?: string;
  namespace?: string;
  scope?: PermissionCheckScope;
  verb: PermissionVerb;
  onError: 'tolerate' | 'propagate';
  fetch: (ctx: { data: TData; projectId: string }) => Promise<TCompanionData | null>;
}

/** Redirect descriptor for `redirectIfDeleting`. */
export interface RedirectDescriptor {
  to: string;
  params?: Record<string, string | undefined>;
  toast: { title: string; description: string; type?: 'message' | 'success' | 'error' };
}

/** Argument types for the DSL list variant. */
export interface DefineListRouteInput<TData> {
  type: 'list';
  resource: string;
  group?: string;
  namespace?: string;
  scope?: PermissionCheckScope;
  fetch: (ctx: { projectId: string; args: LoaderFunctionArgs }) => Promise<TData>;
  restrictedTitle?: string;
  restrictedMessage: string;
  metaTitle?: string;
  seedCache?: (ctx: { data: TData; projectId: string }) => Array<[QueryKey, unknown]>;
}

/** Argument types for the DSL detail variant. */
export interface DefineDetailRouteInput<TData, TCompanions extends Record<string, unknown>> {
  type: 'detail';
  resource: string;
  group?: string;
  namespace?: string;
  scope?: PermissionCheckScope;
  paramName: string;
  notFoundLabel: string;
  fetch: (ctx: {
    projectId: string;
    id: string;
    args: LoaderFunctionArgs;
  }) => Promise<TData | null>;
  companions?: { [K in keyof TCompanions]: CompanionDeclaration<TData, TCompanions[K]> };
  redirectIfDeleting?: (ctx: { data: TData; projectId: string }) => RedirectDescriptor | null;
  breadcrumb?: (ctx: { data: TData | undefined; companions: TCompanions | undefined }) => ReactNode;
  metaTitle?: string | ((ctx: { data: TData | undefined }) => string);
  restrictedTitle?: string;
  restrictedMessage: string;
  seedCache?: (ctx: {
    data: TData;
    companions: TCompanions;
    projectId: string;
    id: string;
  }) => Array<[QueryKey, unknown]>;
}

/**
 * Page-side input for the canonical RBAC route convention.
 *
 * Contains ONLY client-safe metadata: render strings, cache-seeding,
 * breadcrumb. NO `fetch`, NO `group`/`namespace`/`scope` (those drive the
 * server-only loader gate; they belong in `RunListLoaderInput`).
 *
 * Why split: `defineResourceRoute(...)` is called on the client to wire
 * `Page`/`meta`/`handle`. If we passed `fetch` here, its closure would
 * capture server-only imports (e.g. cookie `.server.ts` helpers), and
 * Vite would mark the whole chain as client-reachable, breaking the
 * bundler. By keeping `fetch` out of the page input, the closure lives
 * only inside the stripped `loader` export and tree-shakes cleanly.
 */
export interface DefineListPageInput {
  type: 'list';
  resource: string;
  restrictedTitle?: string;
  restrictedMessage: string;
  metaTitle?: string;
  seedCache?: (ctx: { data: unknown; projectId: string }) => Array<[QueryKey, unknown]>;
}

export interface DefineDetailPageInput<TData, TCompanions extends Record<string, unknown>> {
  type: 'detail';
  resource: string;
  paramName: string;
  notFoundLabel: string;
  restrictedTitle?: string;
  restrictedMessage: string;
  metaTitle?: string | ((ctx: { data: TData | undefined }) => string);
  breadcrumb?: (ctx: { data: TData | undefined; companions: TCompanions | undefined }) => ReactNode;
  seedCache?: (ctx: {
    data: TData;
    companions: TCompanions;
    projectId: string;
    id: string;
  }) => Array<[QueryKey, unknown]>;
}

/**
 * Server-side input for `runListLoader` / `runDetailLoader`. Contains the
 * gate inputs (`group`/`scope`/`namespace`) and the `fetch` closure.
 * Lives in the same types file because it's small and shares the
 * `CompanionDeclaration` / `RedirectDescriptor` types — but is consumed
 * only by the server-only `run-resource-loader.ts`.
 */
export interface RunListLoaderInput<TData> {
  resource: string;
  group?: string;
  namespace?: string;
  scope?: 'project' | 'org' | 'user';
  fetch: (ctx: { projectId?: string; orgId?: string; args: LoaderFunctionArgs }) => Promise<TData>;
}

export interface RunDetailLoaderInput<TData, TCompanions extends Record<string, unknown>> {
  resource: string;
  group?: string;
  namespace?: string;
  scope?: 'project' | 'org' | 'user';
  paramName: string;
  notFoundLabel: string;
  fetch: (ctx: {
    projectId?: string;
    orgId?: string;
    id: string;
    args: LoaderFunctionArgs;
  }) => Promise<TData | null>;
  companions?: { [K in keyof TCompanions]: CompanionDeclaration<TData, TCompanions[K]> };
  redirectIfDeleting?: (ctx: {
    data: TData;
    projectId?: string;
    orgId?: string;
  }) => RedirectDescriptor | null;
  /**
   * Optional callback to attach response headers (e.g. cookies) to the
   * detail-loader's success response. Runs after `fetch` succeeds and after
   * `redirectIfDeleting` passes (i.e. only on the "render the page" path).
   * Returns either a Headers object or undefined for no extra headers.
   * Used by org-detail layout to set org/project session cookies on
   * successful org view.
   */
  setHeaders?: (ctx: {
    data: TData;
    projectId?: string;
    orgId?: string;
    args: LoaderFunctionArgs;
  }) => Promise<Headers | undefined>;
}
