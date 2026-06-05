import { z } from 'zod';

/**
 * Subset of `quota.miloapis.com/v1alpha1.ResourceRegistration` the
 * portal cares about. Only the registration's `resourceType` key and
 * its measurement `type` are surfaced — the rest is irrelevant for the
 * portal's purposes (rendering Quotas).
 *
 * The upstream CRD's `spec.type` enum is `Entity | Allocation | Feature`.
 * The OpenAPI codegen in `@/modules/control-plane/quota` currently
 * narrows it to `Entity | Allocation` (stale schema — `Feature` was
 * added later upstream), so we redeclare a permissive union here and
 * tolerate any future enum values via `.or(z.string())` rather than
 * blocking the page on a value the codegen hasn't caught up with.
 */
export const resourceRegistrationTypeSchema = z
  .union([z.literal('Entity'), z.literal('Allocation'), z.literal('Feature')])
  .or(z.string());

export type ResourceRegistrationType = z.infer<typeof resourceRegistrationTypeSchema>;

export const resourceRegistrationSchema = z.object({
  name: z.string(),
  resourceType: z.string(),
  type: resourceRegistrationTypeSchema,
});

export type ResourceRegistration = z.infer<typeof resourceRegistrationSchema>;
