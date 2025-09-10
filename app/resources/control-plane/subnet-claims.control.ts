import {
  ComDatumapisNetworkingV1AlphaSubnetClaim,
  ComDatumapisNetworkingV1AlphaSubnetClaimList,
  listNetworkingDatumapisComV1AlphaNamespacedSubnetClaim,
} from '@/modules/control-plane/networking';
import { ISubnetClaimControlResponse } from '@/resources/interfaces/network.interface';
import { Client } from '@hey-api/client-axios';

export const createSubnetClaimsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformSubnetClaim = (
    subnetClaim: ComDatumapisNetworkingV1AlphaSubnetClaim
  ): ISubnetClaimControlResponse => {
    const { metadata, spec, status } = subnetClaim;
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
        const response = await listNetworkingDatumapisComV1AlphaNamespacedSubnetClaim({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const subnetClaims = response.data as ComDatumapisNetworkingV1AlphaSubnetClaimList;

        // Note: Subnets are directly related to NetworkContext resources rather than Network resources
        return subnetClaims.items
          .filter((subnetClaim) => {
            return (
              subnetClaim.spec?.networkContext?.name &&
              (networkContexts ?? []).includes(subnetClaim.spec?.networkContext?.name)
            );
          })
          .map(transformSubnetClaim);
      } catch (e) {
        throw e;
      }
    },
  };
};

export type SubnetClaimsControl = ReturnType<typeof createSubnetClaimsControl>;
