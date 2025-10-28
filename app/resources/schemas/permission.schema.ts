/**
 * Permission Schemas
 * Zod validation schemas for permission-related operations
 */
import { z } from 'zod';

/**
 * Supported Kubernetes API verbs
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
 * Base permission check schema
 */
export const BasePermissionCheckSchema = z.object({
  namespace: z.string().optional(),
  verb: PermissionVerbSchema,
  group: z.string().default(''),
  resource: z.string().min(1, 'Resource is required'),
  name: z.string().optional(),
});

/**
 * Permission check schema with organization ID
 */
export const PermissionCheckSchema = BasePermissionCheckSchema.extend({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

/**
 * Bulk permission check schema
 */
export const BulkPermissionCheckSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  checks: z
    .array(BasePermissionCheckSchema)
    .min(1, 'At least one permission check is required')
    .max(50, 'Maximum 50 permission checks allowed per request'),
});

/**
 * Permission result schema
 */
export const PermissionResultSchema = z.object({
  allowed: z.boolean(),
  denied: z.boolean(),
  reason: z.string().optional(),
});

/**
 * Bulk permission result schema
 */
export const BulkPermissionResultSchema = z.object({
  allowed: z.boolean(),
  denied: z.boolean(),
  reason: z.string().optional(),
  request: BasePermissionCheckSchema,
});

/**
 * API response schemas
 */
export const PermissionCheckResponseSchema = z.object({
  success: z.boolean(),
  data: PermissionResultSchema.optional(),
  error: z.string().optional(),
});

export const BulkPermissionCheckResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      results: z.array(BulkPermissionResultSchema),
    })
    .optional(),
  error: z.string().optional(),
});

/**
 * Type exports
 */
export type PermissionVerb = z.infer<typeof PermissionVerbSchema>;
export type BasePermissionCheck = z.infer<typeof BasePermissionCheckSchema>;
export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;
export type BulkPermissionCheck = z.infer<typeof BulkPermissionCheckSchema>;
export type PermissionResult = z.infer<typeof PermissionResultSchema>;
export type BulkPermissionResult = z.infer<typeof BulkPermissionResultSchema>;
export type PermissionCheckResponse = z.infer<typeof PermissionCheckResponseSchema>;
export type BulkPermissionCheckResponse = z.infer<typeof BulkPermissionCheckResponseSchema>;
