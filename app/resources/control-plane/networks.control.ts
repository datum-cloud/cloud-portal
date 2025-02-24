import {
  ComDatumapisNetworkingV1AlphaNetwork,
  createNetworkingDatumapisComV1AlphaNamespacedNetwork,
  deleteNetworkingDatumapisComV1AlphaNamespacedNetwork,
  listNetworkingDatumapisComV1AlphaNamespacedNetwork,
  readNetworkingDatumapisComV1AlphaNamespacedNetwork,
  replaceNetworkingDatumapisComV1AlphaNamespacedNetwork,
} from '@/modules/control-plane/networking'
import { Client } from '@hey-api/client-axios'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { NewNetworkSchema, UpdateNetworkSchema } from '@/resources/schemas/network.schema'
import { CustomError } from '@/utils/errorHandle'
export const createNetworksControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformNetwork = (
    network: ComDatumapisNetworkingV1AlphaNetwork,
  ): INetworkControlResponse => {
    const { metadata, spec } = network

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
    }
  }

  return {
    getNetworks: async (projectId: string) => {
      const response = await listNetworkingDatumapisComV1AlphaNamespacedNetwork({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      })

      return response.data?.items?.map(transformNetwork) ?? []
    },
    getNetwork: async (projectId: string, networkId: string) => {
      const response = await readNetworkingDatumapisComV1AlphaNamespacedNetwork({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: networkId },
      })

      if (!response.data) {
        throw new CustomError(`Network ${networkId} not found`, 404)
      }

      return transformNetwork(response.data)
    },
    createNetwork: async (
      projectId: string,
      payload: NewNetworkSchema,
      dryRun: boolean,
    ) => {
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
            annotations: {
              'app.kubernetes.io/name': payload.displayName,
            },
          },
          spec: {
            ipFamilies: [payload.ipFamily],
            ipam: {
              mode: payload.ipam,
            },
            mtu: payload.mtu,
          },
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to create location', 500)
      }

      return dryRun ? response.data : transformNetwork(response.data)
    },
    updateNetwork: async (
      projectId: string,
      networkId: string,
      payload: UpdateNetworkSchema,
      dryRun: boolean,
    ) => {
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
            annotations: {
              'app.kubernetes.io/name': payload.displayName,
            },
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
      })

      if (!response.data) {
        throw new CustomError('Failed to update network', 500)
      }

      return dryRun ? response.data : transformNetwork(response.data)
    },
    deleteNetwork: async (projectId: string, networkId: string) => {
      const response = await deleteNetworkingDatumapisComV1AlphaNamespacedNetwork({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: networkId },
      })

      if (!response.data) {
        throw new CustomError('Failed to delete network', 500)
      }

      return response.data
    },
  }
}

export type NetworksControl = ReturnType<typeof createNetworksControl>
