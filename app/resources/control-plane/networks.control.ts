import {
  ComDatumapisNetworkingV1AlphaNetwork,
  ComDatumapisNetworkingV1AlphaNetworkList,
  createNetworkingDatumapisComV1AlphaNamespacedNetwork,
  deleteNetworkingDatumapisComV1AlphaNamespacedNetwork,
  listNetworkingDatumapisComV1AlphaNamespacedNetwork,
  readNetworkingDatumapisComV1AlphaNamespacedNetwork,
  replaceNetworkingDatumapisComV1AlphaNamespacedNetwork,
} from '@/modules/control-plane/networking';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import { NewNetworkSchema, UpdateNetworkSchema } from '@/resources/schemas/network.schema';
import { Client } from '@hey-api/client-axios';

export const createNetworksControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformNetwork = (
    network: ComDatumapisNetworkingV1AlphaNetwork
  ): INetworkControlResponse => {
    const { metadata, spec } = network;

    return {
      name: metadata?.name,
      displayName: metadata?.annotations?.['app.kubernetes.io/name'],
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      ipFamilies: spec?.ipFamilies ?? [],
      mtu: spec?.mtu ?? 1460, // TODO: this is a default value, we should get it from the network
      namespace: metadata?.namespace ?? 'default',
      ipam: spec?.ipam ?? {},
    };
  };

  return {
    list: async (projectId: string) => {
      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedNetwork({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const networks = response.data as ComDatumapisNetworkingV1AlphaNetworkList;

        return networks.items.map(transformNetwork);
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, networkId: string) => {
      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedNetwork({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: networkId },
        });

        const network = response.data as ComDatumapisNetworkingV1AlphaNetwork;

        return transformNetwork(network);
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, payload: NewNetworkSchema, dryRun: boolean) => {
      try {
        const response = await createNetworkingDatumapisComV1AlphaNamespacedNetwork({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default' },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            apiVersion: 'networking.datumapis.com/v1alpha',
            kind: 'Network',
            metadata: {
              name: payload.name,
              /* annotations: {
                'app.kubernetes.io/name': payload.displayName,
              }, */
            },
            spec: {
              ipFamilies: [payload.ipFamily],
              ipam: {
                mode: payload.ipam,
              },
              mtu: payload.mtu,
            },
          },
        });

        const network = response.data as ComDatumapisNetworkingV1AlphaNetwork;

        return dryRun ? network : transformNetwork(network);
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      networkId: string,
      payload: UpdateNetworkSchema,
      dryRun: boolean
    ) => {
      try {
        const response = await replaceNetworkingDatumapisComV1AlphaNamespacedNetwork({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: networkId },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            apiVersion: 'networking.datumapis.com/v1alpha',
            kind: 'Network',
            metadata: {
              name: payload.name,
              /* annotations: {
                'app.kubernetes.io/name': payload.displayName,
              }, */
              resourceVersion: payload.resourceVersion,
            },
            spec: {
              ipFamilies: [payload.ipFamily],
              ipam: {
                mode: payload.ipam,
              },
              mtu: payload.mtu,
            },
          },
        });

        const network = response.data as ComDatumapisNetworkingV1AlphaNetwork;

        return dryRun ? network : transformNetwork(network);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, networkId: string) => {
      try {
        const response = await deleteNetworkingDatumapisComV1AlphaNamespacedNetwork({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: networkId },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
  };
};

export type NetworksControl = ReturnType<typeof createNetworksControl>;
