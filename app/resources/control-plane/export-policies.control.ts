import { ExportPolicySchema } from '../schemas/export-policy.schema'
import { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry'
import {
  createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  listTelemetryDatumapisComV1Alpha1ExportPolicyForAllNamespaces,
  readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus,
} from '@/modules/control-plane/telemetry/sdk.gen'
import { IExportPolicyControlResponse } from '@/resources/interfaces/policy.interface'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createExportPoliciesControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformPolicy = (
    policy: ComDatumapisTelemetryV1Alpha1ExportPolicy,
  ): IExportPolicyControlResponse => {
    const { metadata, spec, status } = policy
    return {
      uid: metadata?.uid,
      resourceVersion: metadata?.resourceVersion,
      namespace: metadata?.namespace,
      name: metadata?.name,
      numberOfSources: spec.sources.length,
      numberOfSinks: spec.sinks.length,
      status: status,
      createdAt: metadata?.creationTimestamp,
    }
  }

  return {
    list: async (projectId: string) => {
      const response =
        await listTelemetryDatumapisComV1Alpha1ExportPolicyForAllNamespaces({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        })

      return response.data?.items?.map(transformPolicy) ?? []
    },
    create: async (
      projectId: string,
      policy: ExportPolicySchema,
      dryRun: boolean = false,
    ) => {
      const response = await createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        headers: {
          'Content-Type':
            policy.format === 'yaml' ? 'application/yaml' : 'application/json',
        },
        body: policy.configuration as unknown as ComDatumapisTelemetryV1Alpha1ExportPolicy,
      })

      if (!response.data) {
        throw new CustomError('Failed to create export policy', 500)
      }

      return dryRun ? response.data : transformPolicy(response.data)
    },
    delete: async (projectId: string, exporterId: string) => {
      const response = await deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: exporterId, namespace: 'default' },
      })

      if (!response.data) {
        throw new CustomError('Failed to delete exporter', 500)
      }

      return response.data
    },
    getStatus: async (projectId: string, exporterId: string) => {
      const response =
        await readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { name: exporterId, namespace: 'default' },
        })

      if (!response.data) {
        throw new CustomError(`Export policy ${exporterId} not found`, 404)
      }

      return transformControlPlaneStatus(response.data.status)
    },
  }
}

export type ExportPoliciesControl = ReturnType<typeof createExportPoliciesControl>
