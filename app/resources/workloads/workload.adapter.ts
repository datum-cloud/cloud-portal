import type { Workload, WorkloadHealth, WorkloadList } from './workload.schema';
import type { ComDatumapisComputeV1AlphaWorkload } from '@/modules/control-plane/compute';

type WorkloadCondition = NonNullable<
  NonNullable<ComDatumapisComputeV1AlphaWorkload['status']>['conditions']
>[number];

type WorkloadRuntime = NonNullable<
  NonNullable<NonNullable<ComDatumapisComputeV1AlphaWorkload['spec']>['template']>['spec']
>['runtime'];

type WorkloadPlacements = NonNullable<ComDatumapisComputeV1AlphaWorkload['spec']>['placements'];

function deriveHealth(conditions?: WorkloadCondition[]): WorkloadHealth {
  if (!conditions || conditions.length === 0) return 'Unknown';

  const available = conditions.find((c) => c.type === 'Available');
  const progressing = conditions.find((c) => c.type === 'Progressing');

  if (!available) return 'Unknown';

  if (available.status === 'True') return 'Available';
  if (available.status === 'False' && progressing?.status === 'True') return 'Degraded';
  if (available.status === 'False') return 'Unavailable';
  return 'Unknown';
}

/** Builds a human-readable resource summary, e.g. "datumcloud/d1-standard-2 · 1 vCPU · 512Mi". */
function deriveResources(runtime?: WorkloadRuntime): string | undefined {
  const res = runtime?.resources;
  if (!res) return undefined;

  const parts: string[] = [];
  if (res.instanceType) parts.push(res.instanceType);

  const requests = res.requests ?? {};
  if (requests.cpu !== undefined) parts.push(`${requests.cpu} vCPU`);
  if (requests.memory !== undefined) parts.push(String(requests.memory));

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** Returns the per-region replica count only when every placement shares the same minReplicas. */
function deriveReplicasPerRegion(placements: WorkloadPlacements): number | undefined {
  if (!placements || placements.length === 0) return undefined;

  const mins = placements.map((p) => p.scaleSettings?.minReplicas);
  const first = mins[0];
  if (first === undefined) return undefined;

  return mins.every((m) => m === first) ? first : undefined;
}

export function toWorkload(raw: ComDatumapisComputeV1AlphaWorkload): Workload {
  const conditions = raw.status?.conditions ?? [];
  const placements = raw.spec?.placements ?? [];
  const runtime = raw.spec?.template?.spec?.runtime;

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(String(raw.metadata.creationTimestamp))
      : new Date(),
    image: runtime?.sandbox?.containers?.[0]?.image,
    health: deriveHealth(conditions),
    currentReplicas: raw.status?.currentReplicas ?? 0,
    desiredReplicas: raw.status?.desiredReplicas ?? 0,
    placements: placements.map((p) => p.name),
    runtimeType: runtime ? (runtime.sandbox ? 'Container sandbox' : 'Virtual machine') : undefined,
    regions: Array.from(new Set(placements.flatMap((p) => p.cityCodes ?? []))),
    resources: deriveResources(runtime),
    replicasPerRegion: deriveReplicasPerRegion(placements),
    conditions: conditions.map((c) => ({
      type: c.type,
      status: c.status,
      reason: c.reason,
      message: c.message,
      lastTransitionTime: String(c.lastTransitionTime),
      observedGeneration:
        c.observedGeneration !== undefined ? Number(c.observedGeneration) : undefined,
    })),
  };
}

export function toWorkloadList(
  items: ComDatumapisComputeV1AlphaWorkload[],
  nextCursor?: string
): WorkloadList {
  return {
    items: items.map(toWorkload),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}
