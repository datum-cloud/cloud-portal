import { listDiscoveryV1NamespacedEndpointSlice } from '@/modules/control-plane/discovery/sdk.gen'
import { IoK8sApiDiscoveryV1EndpointSlice } from '@/modules/control-plane/discovery/types.gen'
import { IEndpointSliceControlResponseLite } from '@/resources/interfaces/endpoint-slice.interface'
import { Client } from '@hey-api/client-axios'

export const createEndpointSlicesControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformEndpointSliceLite = (
    endpointSlice: IoK8sApiDiscoveryV1EndpointSlice,
  ): IEndpointSliceControlResponseLite => {
    const { metadata, addressType } = endpointSlice
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      addressType,
      createdAt: metadata?.creationTimestamp,
    }
  }

  return {
    list: async (projectId: string) => {
      const response = await listDiscoveryV1NamespacedEndpointSlice({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
      })

      return response.data?.items?.map(transformEndpointSliceLite) ?? []
    },
  }
}
