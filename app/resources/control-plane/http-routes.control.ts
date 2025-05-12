import { listGatewayNetworkingV1NamespacedHttpRoute } from '@/modules/control-plane/gateway/sdk.gen'
import { IoK8sNetworkingGatewayV1HttpRoute } from '@/modules/control-plane/gateway/types.gen'
import { IHttpRouteControlResponseLite } from '@/resources/interfaces/http-route.interface'
import { Client } from '@hey-api/client-axios'

export const createHttpRoutesControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformHttpRouteLite = (
    httpRoute: IoK8sNetworkingGatewayV1HttpRoute,
  ): IHttpRouteControlResponseLite => {
    const { metadata } = httpRoute
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      createdAt: metadata?.creationTimestamp,
    }
  }

  return {
    list: async (projectId: string) => {
      const response = await listGatewayNetworkingV1NamespacedHttpRoute({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
      })

      return response.data?.items?.map(transformHttpRouteLite) ?? []
    },
  }
}
