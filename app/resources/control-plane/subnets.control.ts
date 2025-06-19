import {
  ComDatumapisNetworkingV1AlphaSubnet,
  ComDatumapisNetworkingV1AlphaSubnetList,
  listNetworkingDatumapisComV1AlphaNamespacedSubnet,
} from '@/modules/control-plane/networking';
import { ISubnetControlResponse } from '@/resources/interfaces/network.interface';
import { Client } from '@hey-api/client-axios';

export const createSubnetsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL;

  const transformSubnet = (subnet: ComDatumapisNetworkingV1AlphaSubnet): ISubnetControlResponse => {
    const { metadata, spec, status } = subnet;
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
    list: async (projectId: string, networkContexts?: string[]) => {
      const response = await listNetworkingDatumapisComV1AlphaNamespacedSubnet({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        /* query: {
          fieldSelector: networkId ? `spec.network.name=${networkId}` : undefined,
        }, */
      });

      const subnets = response.data as ComDatumapisNetworkingV1AlphaSubnetList;

      // Note: Subnets are directly related to NetworkContext resources rather than Network resources
      return subnets.items
        .filter((subnet) => {
          return (
            subnet.spec?.networkContext?.name &&
            (networkContexts ?? []).includes(subnet.spec?.networkContext?.name)
          );
        })
        .map(transformSubnet);
    },
  };
};

export type SubnetsControl = ReturnType<typeof createSubnetsControl>;
