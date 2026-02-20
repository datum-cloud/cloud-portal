import type { Connector, ConnectorList } from './connector.schema';
import type { ComDatumapisNetworkingV1Alpha1Connector } from '@/modules/control-plane/networking-alpha1';

export function toConnector(raw: ComDatumapisNetworkingV1Alpha1Connector): Connector {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp
      ? new Date(raw.metadata.creationTimestamp)
      : new Date(),
    connectorClassName: raw.spec.connectorClassName,
    capabilities: raw.spec.capabilities,
    status: raw.status,
  };
}

export function toConnectorList(
  items: ComDatumapisNetworkingV1Alpha1Connector[],
  nextCursor?: string
): ConnectorList {
  return {
    items: items.map(toConnector),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}
