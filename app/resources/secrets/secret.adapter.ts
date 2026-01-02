import type { Secret, SecretList, SecretType, CreateSecretInput } from './secret.schema';
import { IoK8sApiCoreV1Secret } from '@/modules/control-plane/k8s-core';
import { convertLabelsToObject } from '@/utils/helpers/object.helper';
import { isBase64, toBase64 } from '@/utils/helpers/text.helper';

/**
 * Transform raw API Secret to domain Secret type
 */
export function toSecret(raw: IoK8sApiCoreV1Secret): Secret {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    resourceVersion: raw.metadata?.resourceVersion,
    createdAt: raw.metadata?.creationTimestamp,
    data: Object.keys(raw.data ?? {}),
    type: raw.type as SecretType,
    labels: raw.metadata?.labels ?? {},
    annotations: raw.metadata?.annotations ?? {},
  };
}

/**
 * Transform raw API list to domain SecretList
 */
export function toSecretList(items: IoK8sApiCoreV1Secret[], nextCursor?: string): SecretList {
  return {
    items: items.map(toSecret),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Transform CreateSecretInput to API payload
 */
export function toCreateSecretPayload(input: CreateSecretInput): {
  kind: string;
  apiVersion: string;
  metadata: {
    name: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
  };
  data: Record<string, string>;
  type: string;
} {
  return {
    kind: 'Secret',
    apiVersion: 'v1',
    metadata: {
      name: input.name,
      labels: convertLabelsToObject(input.labels ?? []),
      annotations: convertLabelsToObject(input.annotations ?? []),
    },
    data: (input.variables ?? []).reduce(
      (acc, vars) => {
        acc[vars.key] = isBase64(vars.value) ? vars.value : toBase64(vars.value);
        return acc;
      },
      {} as Record<string, string>
    ),
    type: input.type,
  };
}

/**
 * Transform update input to API payload
 */
export function toUpdateSecretPayload(input: {
  data?: Record<string, string | null | undefined>;
  metadata?: {
    labels?: Record<string, string | null>;
    annotations?: Record<string, string | null>;
  };
}): {
  kind: string;
  apiVersion: string;
  data?: Record<string, string | null | undefined>;
  metadata?: {
    labels?: Record<string, string | null>;
    annotations?: Record<string, string | null>;
  };
} {
  return {
    kind: 'Secret',
    apiVersion: 'v1',
    ...(input.data && { data: input.data }),
    ...(input.metadata && { metadata: input.metadata }),
  };
}
