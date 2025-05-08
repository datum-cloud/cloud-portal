import { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry'
import {
  createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  listTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  readTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus,
  replaceTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
} from '@/modules/control-plane/telemetry/sdk.gen'
import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkType,
  IExportPolicyControlResponse,
} from '@/resources/interfaces/export-policy.interface'
import { NewExportPolicySchema } from '@/resources/schemas/export-policy.schema'
import { CustomError } from '@/utils/errorHandle'
import { convertLabelsToObject, transformControlPlaneStatus } from '@/utils/misc'
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
      sources: spec.sources,
      sinks: spec.sinks,
      status: status,
      createdAt: metadata?.creationTimestamp,
      labels: metadata?.labels ?? {},
      annotations: metadata?.annotations ?? {},
    }
  }

  const formatPolicy = (
    value: NewExportPolicySchema,
    resourceVersion?: string,
  ): ComDatumapisTelemetryV1Alpha1ExportPolicy => {
    return {
      metadata: {
        name: value?.metadata?.name,
        labels: convertLabelsToObject(value?.metadata?.labels ?? []),
        annotations: convertLabelsToObject(value?.metadata?.annotations ?? []),
        ...(resourceVersion && { resourceVersion }),
      },
      spec: {
        sources: (value?.sources ?? []).map((source) => ({
          name: source.name,
          metrics: {
            metricsql: source.metricQuery,
          },
        })),
        sinks: (value?.sinks ?? []).map((sink) => ({
          name: sink.name,
          sources: [...new Set(sink.sources ?? [])],
          target: {
            ...(sink.type === ExportPolicySinkType.PROMETHEUS && {
              prometheusRemoteWrite: {
                endpoint: sink.prometheusRemoteWrite?.endpoint ?? '',
                batch: {
                  maxSize: sink.prometheusRemoteWrite?.batch?.maxSize ?? 100,
                  timeout: `${sink.prometheusRemoteWrite?.batch?.timeout ?? 5}s`,
                },
                retry: {
                  backoffDuration: `${sink.prometheusRemoteWrite?.retry?.backoffDuration ?? 1}s`,
                  maxAttempts: sink.prometheusRemoteWrite?.retry?.maxAttempts ?? 3,
                },
                ...(sink.prometheusRemoteWrite?.authentication?.authType && {
                  authentication: {
                    ...(sink.prometheusRemoteWrite?.authentication?.authType ===
                      ExportPolicyAuthenticationType.BASIC_AUTH && {
                      basicAuth: {
                        secretRef: {
                          name:
                            sink.prometheusRemoteWrite?.authentication?.secretName ?? '',
                        },
                      },
                    }),
                  },
                }),
              },
            }),
          },
        })),
      },
    }
  }

  return {
    list: async (projectId: string) => {
      const response = await listTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
      })

      return response.data?.items?.map(transformPolicy) ?? []
    },
    create: async (
      projectId: string,
      policy: NewExportPolicySchema,
      dryRun: boolean = false,
    ) => {
      const formatted = formatPolicy(policy)
      const response = await createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          ...formatted,
          apiVersion: 'telemetry.datumapis.com/v1alpha1',
          kind: 'ExportPolicy',
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to create export policy', 500)
      }

      return dryRun ? response.data : transformPolicy(response.data)
    },
    detail: async (projectId: string, exportPolicyId: string) => {
      const response = await readTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: exportPolicyId },
      })

      if (!response.data) {
        throw new CustomError(`Export policy ${exportPolicyId} not found`, 404)
      }

      return transformPolicy(response.data)
    },
    update: async (
      projectId: string,
      exportPolicyId: string,
      policy: NewExportPolicySchema,
      resourceVersion: string,
      dryRun: boolean = false,
    ) => {
      const formatted = formatPolicy(policy, resourceVersion)
      const response = await replaceTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: exportPolicyId },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          ...formatted,
          apiVersion: 'telemetry.datumapis.com/v1alpha1',
          kind: 'ExportPolicy',
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to update export policy', 500)
      }

      return dryRun ? response.data : transformPolicy(response.data)
    },
    delete: async (projectId: string, exportPolicyId: string) => {
      const response = await deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: exportPolicyId, namespace: 'default' },
      })

      if (!response.data) {
        throw new CustomError('Failed to delete export policy', 500)
      }

      return response.data
    },
    getStatus: async (projectId: string, exportPolicyId: string) => {
      const response =
        await readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { name: exportPolicyId, namespace: 'default' },
        })

      if (!response.data) {
        throw new CustomError(`Export policy ${exportPolicyId} not found`, 404)
      }

      return transformControlPlaneStatus(response.data.status)
    },
  }
}

export type ExportPoliciesControl = ReturnType<typeof createExportPoliciesControl>
