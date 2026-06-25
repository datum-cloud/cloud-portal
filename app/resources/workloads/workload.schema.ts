import { z } from 'zod';

export type WorkloadHealth = 'Available' | 'Degraded' | 'Unavailable' | 'Unknown';

const workloadConditionSchema = z.object({
  type: z.string(),
  status: z.enum(['True', 'False', 'Unknown']),
  reason: z.string(),
  message: z.string(),
  lastTransitionTime: z.string(),
  observedGeneration: z.number().optional(),
});

export const workloadResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  image: z.string().optional(),
  health: z.enum(['Available', 'Degraded', 'Unavailable', 'Unknown']),
  currentReplicas: z.number(),
  desiredReplicas: z.number(),
  placements: z.array(z.string()),
  conditions: z.array(workloadConditionSchema).optional(),
  // Detail/overview fields
  runtimeType: z.string().optional(),
  regions: z.array(z.string()).default([]),
  resources: z.string().optional(),
  replicasPerRegion: z.number().optional(),
});

export type Workload = z.infer<typeof workloadResourceSchema>;

/**
 * Maps a workload health value to the status key understood by `BadgeStatus`.
 * Shared by the list and detail views.
 */
export function workloadHealthToBadgeStatus(health: WorkloadHealth): string {
  switch (health) {
    case 'Available':
      return 'active';
    case 'Degraded':
      return 'pending';
    case 'Unavailable':
      return 'error';
    default:
      return 'inactive';
  }
}

export const workloadListSchema = z.object({
  items: z.array(workloadResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type WorkloadList = z.infer<typeof workloadListSchema>;
