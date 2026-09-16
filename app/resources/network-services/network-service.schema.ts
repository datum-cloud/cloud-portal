import { z } from 'zod';

/**
 * A port the service's members answer on. A backend references the port by
 * `name` rather than by number, so the reference survives a port change.
 */
export const networkServicePortSchema = z.object({
  name: z.string(),
  port: z.number().int(),
  protocol: z.literal('TCP').optional(),
});
export type NetworkServicePort = z.infer<typeof networkServicePortSchema>;

/** Rollup of the membership a service's selector resolved to. */
export const networkServiceSummarySchema = z.object({
  members: z.number().int().optional(),
  healthy: z.number().int().optional(),
  locations: z.number().int().optional(),
});
export type NetworkServiceSummary = z.infer<typeof networkServiceSummarySchema>;

export const networkServiceResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  /** Ports declared in `spec.ports`, in declaration order. */
  ports: z.array(networkServicePortSchema),
  /**
   * The `Ready` condition: membership resolved and at least one location is
   * taking traffic, so a proxy naming this service has somewhere to send
   * requests.
   *
   * Not ready is not an error state. A service is commonly written before the
   * workload behind it exists, so its selector matching nothing is ordinary
   * and clears on its own. Surface it as a warning, never as a failure.
   */
  ready: z.boolean(),
  /** The `MembersResolved` condition: the selector produced a membership. */
  membersResolved: z.boolean(),
  /** Reason from whichever of those conditions is not satisfied. */
  notReadyReason: z.string().optional(),
  /** Message from whichever of those conditions is not satisfied. */
  notReadyMessage: z.string().optional(),
  summary: networkServiceSummarySchema.optional(),
});
export type NetworkService = z.infer<typeof networkServiceResourceSchema>;

export const networkServiceListSchema = z.object({
  items: z.array(networkServiceResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});
export type NetworkServiceList = z.infer<typeof networkServiceListSchema>;
