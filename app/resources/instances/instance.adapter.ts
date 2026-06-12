import type { Instance, InstanceList, InstanceStatusValue } from './instance.schema';
import type { ComDatumapisComputeV1AlphaInstance } from '@/modules/control-plane/compute';

/** Well-known labels stamped onto instances by the compute controllers. */
export const INSTANCE_LABELS = {
  workloadName: 'compute.datumapis.com/workload-name',
  workloadUid: 'compute.datumapis.com/workload-uid',
  cityCode: 'compute.datumapis.com/city-code',
  placementName: 'compute.datumapis.com/placement-name',
} as const;

type InstanceCondition = NonNullable<
  NonNullable<ComDatumapisComputeV1AlphaInstance['status']>['conditions']
>[number];

// Best-effort: the compute API has no explicit "Failed" status field, so we
// infer it by scanning the reason/message text for failure keywords.
function deriveStatus(conditions?: InstanceCondition[]): InstanceStatusValue {
  if (!conditions || conditions.length === 0) return 'Unknown';

  const available = conditions.find((c) => c.type === 'Available');
  if (!available) return 'Unknown';
  if (available.status === 'True') return 'Available';

  const text = `${available.reason ?? ''} ${available.message ?? ''}`;
  if (/fail|error/i.test(text)) return 'Failed';
  return 'Pending';
}

export function toInstance(raw: ComDatumapisComputeV1AlphaInstance): Instance {
  const labels = raw.metadata?.labels ?? {};
  const assignments = raw.status?.networkInterfaces?.[0]?.assignments;
  const container = raw.spec?.runtime?.sandbox?.containers?.[0];
  const conditions = raw.status?.conditions ?? [];

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(String(raw.metadata.creationTimestamp))
      : new Date(),
    workloadName: labels[INSTANCE_LABELS.workloadName],
    workloadUid: labels[INSTANCE_LABELS.workloadUid],
    city: labels[INSTANCE_LABELS.cityCode],
    placement: labels[INSTANCE_LABELS.placementName],
    instanceType: raw.spec?.runtime?.resources?.instanceType,
    image: container?.image,
    ports: (container?.ports ?? []).map((p) => `${p.port}/${p.protocol ?? 'TCP'}`),
    status: deriveStatus(conditions),
    externalIP: assignments?.externalIP,
    internalIP: assignments?.networkIP,
    conditions: conditions.map((c) => ({
      type: c.type,
      status: c.status,
      reason: c.reason,
      message: c.message,
      lastTransitionTime: c.lastTransitionTime ? String(c.lastTransitionTime) : undefined,
    })),
  };
}

export function toInstanceList(items: ComDatumapisComputeV1AlphaInstance[]): InstanceList {
  return { items: items.map(toInstance) };
}
