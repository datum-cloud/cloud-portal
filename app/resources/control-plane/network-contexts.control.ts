import {
  ComDatumapisNetworkingV1AlphaNetworkContext,
  ComDatumapisNetworkingV1AlphaNetworkContextList,
  listNetworkingDatumapisComV1AlphaNamespacedNetworkContext,
} from '@/modules/control-plane/networking';
import { INetworkContextControlResponse } from '@/resources/interfaces/network.interface';
import { Client } from '@hey-api/client-axios';

export const createNetworkContextControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL;

  const transformNetworkContext = (
    networkContext: ComDatumapisNetworkingV1AlphaNetworkContext
  ): INetworkContextControlResponse => {
    const { metadata, spec, status } = networkContext;
    return {
      uid: metadata?.uid,
      resourceVersion: metadata?.resourceVersion,
      name: metadata?.name,
      createdAt: metadata?.creationTimestamp,
      namespace: metadata?.namespace,
      spec,
      status,
    };
  };

  return {
    list: async (projectId: string, networkId?: string) => {
      const response = await listNetworkingDatumapisComV1AlphaNamespacedNetworkContext({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        /* query: {
          fieldSelector: networkId ? `spec.network.name=${networkId}` : undefined,
        }, */
      });

      const networkContexts = response.data as ComDatumapisNetworkingV1AlphaNetworkContextList;

      return networkContexts.items
        .filter((networkContext) => {
          return networkContext.spec?.network?.name === networkId;
        })
        .map(transformNetworkContext);
    },
  };
};

export type NetworkContextControl = ReturnType<typeof createNetworkContextControl>;
