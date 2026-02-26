import { toConnector } from './connector.adapter';
import type { Connector } from './connector.schema';
import { connectorKeys } from './connector.service';
import type { ComDatumapisNetworkingV1Alpha1Connector } from '@/modules/control-plane/networking-alpha1';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch connectors list for real-time updates.
 */
export function useConnectorsWatch(projectId: string, options?: { enabled?: boolean }) {
  const queryKey = connectorKeys.list(projectId);

  useResourceWatch<Connector>({
    resourceType: 'apis/networking.datumapis.com/v1alpha1/connectors',
    projectId,
    namespace: 'default',
    queryKey,
    transform: (item) => toConnector(item as ComDatumapisNetworkingV1Alpha1Connector),
    enabled: options?.enabled ?? true,
    getItemKey: (connector) => connector.name,
  });
}
