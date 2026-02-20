import { toConnectorList } from './connector.adapter';
import type { Connector } from './connector.schema';
import {
  listNetworkingDatumapisComV1Alpha1NamespacedConnector,
  deleteNetworkingDatumapisComV1Alpha1NamespacedConnector,
  type ComDatumapisNetworkingV1Alpha1ConnectorList,
  type ListNetworkingDatumapisComV1Alpha1NamespacedConnectorData,
} from '@/modules/control-plane/networking-alpha1';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const connectorKeys = {
  all: ['connectors'] as const,
  lists: () => [...connectorKeys.all, 'list'] as const,
  list: (projectId: string) => [...connectorKeys.lists(), projectId] as const,
  details: () => [...connectorKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...connectorKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'ConnectorService';

export function createConnectorService() {
  return {
    async list(
      projectId: string,
      query?: ListNetworkingDatumapisComV1Alpha1NamespacedConnectorData['query']
    ): Promise<Connector[]> {
      const startTime = Date.now();

      try {
        const baseURL = getProjectScopedBase(projectId);
        const path = { namespace: 'default' as const };

        const response = await listNetworkingDatumapisComV1Alpha1NamespacedConnector({
          baseURL,
          path,
          query,
        });

        const data = response.data as ComDatumapisNetworkingV1Alpha1ConnectorList;

        console.log('CONNECTOR LIST', JSON.stringify(data, null, 2));

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });

        return toConnectorList(data?.items ?? []).items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteNetworkingDatumapisComV1Alpha1NamespacedConnector({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type ConnectorService = ReturnType<typeof createConnectorService>;
