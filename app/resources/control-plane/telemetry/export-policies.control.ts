import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import {
  ComDatumapisTelemetryV1Alpha1ExportPolicy,
  ComDatumapisTelemetryV1Alpha1ExportPolicyList,
} from '@/modules/control-plane/telemetry';
import {
  createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  listTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  readTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus,
  replaceTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
} from '@/modules/control-plane/telemetry/sdk.gen';
import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkType,
  IExportPolicyControlResponse,
} from '@/resources/interfaces/export-policy.interface';
import { NewExportPolicySchema } from '@/resources/schemas/export-policy.schema';
import { convertLabelsToObject } from '@/utils/helpers/object.helper';
import { Client } from '@hey-api/client-axios';

export const createExportPoliciesControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformPolicy = (
    policy: ComDatumapisTelemetryV1Alpha1ExportPolicy
  ): IExportPolicyControlResponse => {
    const { metadata, spec, status } = policy;
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
    };
  };

  const formatPolicy = (
    value: NewExportPolicySchema,
    resourceVersion?: string
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
                  backoffDuration: `${sink.prometheusRemoteWrite?.retry?.backoffDuration ?? 5}s`,
                  maxAttempts: sink.prometheusRemoteWrite?.retry?.maxAttempts ?? 3,
                },
                ...(sink.prometheusRemoteWrite?.authentication?.authType && {
                  authentication: {
                    ...(sink.prometheusRemoteWrite?.authentication?.authType ===
                      ExportPolicyAuthenticationType.BASIC_AUTH && {
                      basicAuth: {
                        secretRef: {
                          name: sink.prometheusRemoteWrite?.authentication?.secretName ?? '',
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
    };
  };

  return {
    list: async (projectId: string) => {
      try {
        const response = await listTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default' },
        });

        const exportPolicies = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicyList;

        return exportPolicies.items.map(transformPolicy);
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, policy: NewExportPolicySchema, dryRun: boolean = false) => {
      try {
        const formatted = formatPolicy(policy);
        const response = await createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default' },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            ...formatted,
            apiVersion: 'telemetry.miloapis.com/v1alpha1',
            kind: 'ExportPolicy',
          },
        });

        const exportPolicy = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

        return dryRun ? exportPolicy : transformPolicy(exportPolicy);
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, exportPolicyId: string) => {
      try {
        const response = await readTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: exportPolicyId },
        });

        const exportPolicy = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

        return transformPolicy(exportPolicy);
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      exportPolicyId: string,
      policy: NewExportPolicySchema,
      resourceVersion: string,
      dryRun: boolean = false
    ) => {
      try {
        const formatted = formatPolicy(policy, resourceVersion);
        const response = await replaceTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: exportPolicyId },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            ...formatted,
            apiVersion: 'telemetry.miloapis.com/v1alpha1',
            kind: 'ExportPolicy',
          },
        });

        const exportPolicy = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

        return dryRun ? exportPolicy : transformPolicy(exportPolicy);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, exportPolicyId: string) => {
      try {
        const response = await deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { name: exportPolicyId, namespace: 'default' },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
    getStatus: async (projectId: string, exportPolicyId: string) => {
      try {
        const response = await readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { name: exportPolicyId, namespace: 'default' },
        });

        const exportPolicy = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

        return transformControlPlaneStatus(exportPolicy.status);
      } catch (e) {
        throw e;
      }
    },
  };
};

export type ExportPoliciesControl = ReturnType<typeof createExportPoliciesControl>;
