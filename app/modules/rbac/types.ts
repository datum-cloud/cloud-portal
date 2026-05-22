/**
 * RBAC Type Definitions
 * Core types for the Role-Based Access Control module
 */
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
