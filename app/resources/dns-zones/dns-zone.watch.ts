// app/resources/dns-zones/dns-zone.watch.ts
import { toDnsZone } from './dns-zone.adapter';
import type { DnsZone, DnsZoneList } from './dns-zone.schema';
import { dnsZoneKeys } from './dns-zone.service';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@/modules/control-plane/dns-networking';
import { useResourceWatch } from '@/modules/watch';
import { waitForWatch } from '@/modules/watch/watch-wait.helper';
import { ControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

/**
 * Watch DNS zones list for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsZonesPage() {
 *   const { data } = useDnsZones(projectId);
 *
 *   // Subscribe to live updates
 *   useDnsZonesWatch(projectId);
 *
 *   return <DnsZoneTable zones={data?.items ?? []} />;
 * }
 * ```
 */
export function useDnsZonesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    projectId,
    namespace: 'default',
    queryKey: dnsZoneKeys.list(projectId),
    transform: (item) => toDnsZone(item as ComMiloapisNetworkingDnsV1Alpha1DnsZone),
    enabled: options?.enabled ?? true,
    // In-place cache update for MODIFIED events (avoids full list refetch)
    getItemKey: (zone) => zone.name,
    updateListCache: (oldData, newItem) => {
      const old = oldData as DnsZoneList;
      return {
        ...old,
        items: old.items.map((z) => (z.name === newItem.name ? newItem : z)),
      };
    },
  });
}

/**
 * Watch a single DNS zone for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsZoneDetailPage() {
 *   const { data } = useDnsZone(projectId, zoneName);
 *
 *   // Subscribe to live updates
 *   useDnsZoneWatch(projectId, zoneName);
 *
 *   return <DnsZoneDetail zone={data} />;
 * }
 * ```
 */
export function useDnsZoneWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    projectId,
    namespace: 'default',
    name,
    queryKey: dnsZoneKeys.detail(projectId, name),
    transform: (item) => toDnsZone(item as ComMiloapisNetworkingDnsV1Alpha1DnsZone),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Wait for DNS zone to reach Ready status.
 * Used in task processors for async K8s operations.
 *
 * Returns a cancellable promise that resolves when the DNS zone status becomes Ready,
 * or rejects if the zone has an error condition. Call `cancel()` to cleanup the
 * watch subscription (important for task cancellation and timeout handling).
 *
 * @param projectId - Project ID (used as namespace)
 * @param zoneName - Name of the DNS zone to watch
 * @returns Object with `promise` and `cancel()` function
 *
 * @example
 * ```typescript
 * processor: async (ctx) => {
 *   // 1. Create DNS zone via API
 *   await createDnsZone({ projectId, body: zoneSpec });
 *
 *   // 2. Wait for K8s reconciliation with auto cleanup
 *   const { promise, cancel } = waitForDnsZoneReady(projectId, zoneName);
 *   ctx.onCancel(cancel); // Cleanup called automatically on cancel/timeout
 *
 *   const zone = await promise;
 *
 *   // 3. Task completes when Ready
 *   ctx.setResult(zone);
 *   ctx.succeed();
 * };
 * ```
 */
export function waitForDnsZoneReady(
  projectId: string,
  zoneName: string
): {
  promise: Promise<DnsZone>;
  cancel: () => void;
} {
  return waitForWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    projectId,
    namespace: 'default',
    name: zoneName,
    onEvent: (event) => {
      if (event.type === 'ADDED' || event.type === 'MODIFIED') {
        const zone = toDnsZone(event.object as ComMiloapisNetworkingDnsV1Alpha1DnsZone);
        const status = transformControlPlaneStatus(zone.status, {
          includeConditionDetails: true,
        });

        if (status.status === ControlPlaneStatus.Success) {
          return { resolve: zone };
        }

        // Check conditions for error states (status is Pending when not all conditions met)
        const failedCondition = status.conditions?.find((c) => c.status === 'False');
        if (failedCondition) {
          return {
            reject: new Error(
              failedCondition.message || status.message || 'DNS zone reconciliation failed'
            ),
          };
        }
      }

      return 'continue';
    },
  });
}
