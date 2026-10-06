import { toConnector } from './connector.adapter';
import type { Connector } from './connector.schema';
import { CONNECTOR_SYNC_KIND, connectorKeys } from './connector.service';
import type { ComDatumapisNetworkingV1Alpha1Connector } from '@/modules/control-plane/networking-alpha1';
import { useResourceWatch } from '@/modules/watch';
import type { WatchCacheConfig } from '@/modules/watch/watch-cache-handler';

export const connectorListWatchCache = (projectId: string) =>
  ({
    queryKey: connectorKeys.list(projectId),
    getItemKey: (connector) => connector.name,
    syncKind: CONNECTOR_SYNC_KIND,
    syncScope: projectId,
  }) satisfies Omit<WatchCacheConfig<Connector>, 'isDetail'>;

/**
 * Watch connectors list for real-time updates.
 */
export function useConnectorsWatch(projectId: string, options?: { enabled?: boolean }) {
  useResourceWatch<Connector>({
    resourceType: 'apis/networking.datumapis.com/v1alpha1/connectors',
    projectId,
    namespace: 'default',
    transform: (item) => toConnector(item as ComDatumapisNetworkingV1Alpha1Connector),
    enabled: options?.enabled ?? true,
    ...connectorListWatchCache(projectId),
  });
}

/**
 * Watch a single connector for real-time updates (e.g. status changes when it comes online/offline).
 */
export function useConnectorWatch(
  projectId: string,
  name: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryKey = connectorKeys.detail(projectId, name ?? '');

  useResourceWatch<Connector>({
    resourceType: 'apis/networking.datumapis.com/v1alpha1/connectors',
    projectId,
    namespace: 'default',
    name: name ?? undefined,
    queryKey,
    transform: (item) => toConnector(item as ComDatumapisNetworkingV1Alpha1Connector),
    enabled: (options?.enabled ?? true) && !!projectId && !!name,
  });
}
