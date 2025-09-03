import {
  ComDatumapisNetworkingV1AlphaSubnet,
  ComDatumapisNetworkingV1AlphaSubnetList,
  listNetworkingDatumapisComV1AlphaNamespacedSubnet,
} from '@/modules/control-plane/networking';
import { ISubnetControlResponse } from '@/resources/interfaces/network.interface';
import { Client } from '@hey-api/client-axios';

export const createSubnetsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

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
      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedSubnet({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const subnets = response?.data as ComDatumapisNetworkingV1AlphaSubnetList;

        // Note: Subnets are directly related to NetworkContext resources rather than Network resources
        return (
          subnets?.items
            ?.filter((subnet) => {
              return (
                subnet.spec?.networkContext?.name &&
                (networkContexts ?? []).includes(subnet.spec?.networkContext?.name)
              );
            })
            .map(transformSubnet) ?? []
        );
      } catch (e) {
        throw e;
      }
    },
  };
};

export type SubnetsControl = ReturnType<typeof createSubnetsControl>;
