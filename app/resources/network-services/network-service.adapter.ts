import type { NetworkService, NetworkServiceList } from './network-service.schema';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';

/**
 * Condition reported when the service has resolved membership and at least one
 * location is taking traffic. Wait on this one rather than on what it
 * summarizes.
 */
export const NETWORK_SERVICE_READY = 'Ready';
/** Condition reported when the selector evaluated to a membership. */
export const NETWORK_SERVICE_MEMBERS_RESOLVED = 'MembersResolved';

type Condition = NonNullable<
  NonNullable<ComDatumapisNetworkingV1AlphaNetworkService['status']>['conditions']
>[number];

function findCondition(conditions: Condition[] | undefined, type: string): Condition | undefined {
  return conditions?.find((c) => c.type === type);
}

export function toNetworkService(raw: ComDatumapisNetworkingV1AlphaNetworkService): NetworkService {
  const conditions = raw.status?.conditions;
  const readyCondition = findCondition(conditions, NETWORK_SERVICE_READY);
  const membersCondition = findCondition(conditions, NETWORK_SERVICE_MEMBERS_RESOLVED);

  const ready = readyCondition?.status === 'True';
  const membersResolved = membersCondition?.status === 'True';

  // Report the more specific cause where there is one: an unresolved selector
  // explains an unready service better than "not ready" does.
  const explaining = !membersResolved ? membersCondition : !ready ? readyCondition : undefined;

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : new Date(),
    ports: raw.spec?.ports ?? [],
    ready,
    membersResolved,
    ...(explaining?.reason ? { notReadyReason: explaining.reason } : {}),
    ...(explaining?.message ? { notReadyMessage: explaining.message } : {}),
    ...(raw.status?.summary ? { summary: raw.status.summary } : {}),
  };
}

export function toNetworkServiceList(
  items: ComDatumapisNetworkingV1AlphaNetworkService[],
  nextCursor?: string
): NetworkServiceList {
  return {
    items: items.map(toNetworkService),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}
