import {
  ComDatumapisNetworkingV1AlphaNetwork,
  listNetworkingDatumapisComV1AlphaNamespacedNetwork,
} from '@/modules/control-plane/networking'
import { Client } from '@hey-api/client-axios'
import { INetworkControlResponse } from '../interfaces/network.interface'

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
  }
}

export type NetworksControl = ReturnType<typeof createNetworksControl>
