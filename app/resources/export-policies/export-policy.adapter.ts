import type {
  ExportPolicy,
  ExportPolicyList,
  CreateExportPolicyInput,
  UpdateExportPolicyInput,
} from './export-policy.schema';
import { ExportPolicySinkTypeEnum, ExportPolicyAuthenticationType } from './export-policy.schema';
import { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry';
import { convertLabelsToObject } from '@/utils/helpers/object.helper';

/**
 * Transform raw API ExportPolicy to domain ExportPolicy type
 */
export function toExportPolicy(raw: ComDatumapisTelemetryV1Alpha1ExportPolicy): ExportPolicy {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion,
    createdAt: raw.metadata?.creationTimestamp,
    sources: raw.spec?.sources,
    sinks: raw.spec?.sinks,
    status: raw.status,
    labels: raw.metadata?.labels ?? {},
    annotations: raw.metadata?.annotations ?? {},
  };
}

/**
 * Transform raw API list to domain ExportPolicyList
 */
export function toExportPolicyList(
  items: ComDatumapisTelemetryV1Alpha1ExportPolicy[],
  nextCursor?: string
): ExportPolicyList {
  return {
    items: items.map(toExportPolicy),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Transform CreateExportPolicyInput to API payload
 */
export function toCreateExportPolicyPayload(
  input: CreateExportPolicyInput
): ComDatumapisTelemetryV1Alpha1ExportPolicy & { apiVersion: string; kind: string } {
  return {
    apiVersion: 'telemetry.miloapis.com/v1alpha1',
    kind: 'ExportPolicy',
    metadata: {
      name: input.metadata.name,
      labels: convertLabelsToObject(input.metadata.labels ?? []),
      annotations: convertLabelsToObject(input.metadata.annotations ?? []),
    },
    spec: {
      sources: (input.sources ?? []).map((source) => ({
        name: source.name,
        metrics: {
          metricsql: source.metricQuery,
        },
      })),
      sinks: (input.sinks ?? []).map((sink) => ({
        name: sink.name,
        sources: [...new Set(sink.sources ?? [])],
        target: {
          ...(sink.type === ExportPolicySinkTypeEnum.PROMETHEUS && {
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
}

/**
 * Transform UpdateExportPolicyInput to API payload
 */
export function toUpdateExportPolicyPayload(
  input: UpdateExportPolicyInput
): ComDatumapisTelemetryV1Alpha1ExportPolicy & { apiVersion: string; kind: string } {
  const payload = toCreateExportPolicyPayload(input);
  return {
    ...payload,
    metadata: {
      ...payload.metadata,
      resourceVersion: input.resourceVersion,
    },
  };
}
