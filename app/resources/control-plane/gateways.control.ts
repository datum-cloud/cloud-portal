import {
  createGatewayNetworkingV1NamespacedGateway,
  deleteGatewayNetworkingV1NamespacedGateway,
  listGatewayNetworkingV1GatewayForAllNamespaces,
  readGatewayNetworkingV1NamespacedGatewayStatus,
} from '@/modules/control-plane/gateway/sdk.gen'
import { IoK8sNetworkingGatewayV1Gateway } from '@/modules/control-plane/gateway/types.gen'
import { IGatewayControlResponse } from '@/resources/interfaces/gateway.interface'
import { GatewaySchema } from '@/resources/schemas/gateway.schema'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createGatewaysControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformGateway = (
    gateway: IoK8sNetworkingGatewayV1Gateway,
  ): IGatewayControlResponse => {
    const { metadata, spec, status } = gateway
    return {
      uid: metadata?.uid,
      resourceVersion: metadata?.resourceVersion,
      namespace: metadata?.namespace,
      name: metadata?.name,
      gatewayClass: spec.gatewayClassName,
      numberOfListeners: spec.listeners.length,
      status: status,
      createdAt: metadata?.creationTimestamp,
    }
  }

  return {
    list: async (projectId: string) => {
      const response = await listGatewayNetworkingV1GatewayForAllNamespaces({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
      })

      return response.data?.items?.map(transformGateway) ?? []
    },
    create: async (
      projectId: string,
      gateway: GatewaySchema,
      dryRun: boolean = false,
    ) => {
      const response = await createGatewayNetworkingV1NamespacedGateway({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        headers: {
          'Content-Type':
            gateway.format === 'yaml' ? 'application/yaml' : 'application/json',
        },
        body: gateway.configuration as unknown as IoK8sNetworkingGatewayV1Gateway,
      })

      if (!response.data) {
        throw new CustomError('Failed to create gateway', 500)
      }

      return dryRun ? response.data : transformGateway(response.data)
    },
    delete: async (projectId: string, gatewayId: string) => {
      const response = await deleteGatewayNetworkingV1NamespacedGateway({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: gatewayId, namespace: 'default' },
      })

      if (!response.data) {
        throw new CustomError('Failed to delete gateway', 500)
      }

      return response.data
    },
    getStatus: async (projectId: string, gatewayId: string) => {
      const response = await readGatewayNetworkingV1NamespacedGatewayStatus({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: gatewayId, namespace: 'default' },
      })

      if (!response.data) {
        throw new CustomError(`Gateway ${gatewayId} not found`, 404)
      }

      return transformControlPlaneStatus(response.data.status)
    },
  }
}

export type GatewaysControl = ReturnType<typeof createGatewaysControl>
