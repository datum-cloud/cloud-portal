import {
  ComDatumapisNetworkingV1AlphaNetworkBinding,
  ComDatumapisNetworkingV1AlphaNetworkBindingList,
  listNetworkingDatumapisComV1AlphaNamespacedNetworkBinding,
} from '@/modules/control-plane/networking';
import { INetworkBindingControlResponse } from '@/resources/interfaces/network.interface';
import { Client } from '@hey-api/client-axios';

export const createNetworkBindingsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformNetworkBinding = (
    networkBinding: ComDatumapisNetworkingV1AlphaNetworkBinding
  ): INetworkBindingControlResponse => {
    const { metadata, spec, status } = networkBinding;
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
      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedNetworkBinding({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const networkBindings = response.data as ComDatumapisNetworkingV1AlphaNetworkBindingList;

        return networkBindings.items
          .filter((networkBinding) => {
            return networkBinding.spec?.network?.name === networkId;
          })
          .map(transformNetworkBinding);
      } catch (e) {
        throw e;
      }
    },
  };
};

export type NetworkBindingsControl = ReturnType<typeof createNetworkBindingsControl>;
