import {
  organizationSchema,
  organizationListSchema,
  type Organization,
  type OrganizationList,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from './organization.schema';
import type {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1OrganizationList,
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
} from '@/modules/control-plane/resource-manager';

export function toOrganization(raw: ComMiloapisResourcemanagerV1Alpha1Organization): Organization {
  const transformed = {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace,
    displayName:
      raw.metadata?.annotations?.['kubernetes.io/display-name'] ?? raw.metadata?.name ?? '',
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    updatedAt: raw.metadata?.creationTimestamp,
    type: raw.spec?.type ?? 'Standard',
    status: mapStatusFromConditions(raw.status?.conditions),
    memberCount: undefined,
    projectCount: undefined,
  };

  return organizationSchema.parse(transformed);
}

export function toOrganizationList(
  raw: ComMiloapisResourcemanagerV1Alpha1OrganizationList
): OrganizationList {
  const items = raw.items?.map(toOrganization) ?? [];

  return organizationListSchema.parse({
    items,
    nextCursor: raw.metadata?.continue ?? null,
    hasMore: !!raw.metadata?.continue,
  });
}

export function toOrganizationFromMembership(
  raw: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership
): Organization {
  const { metadata, spec, status } = raw;

  const transformed = {
    uid: metadata?.uid ?? '',
    name: spec?.organizationRef?.name ?? '',
    namespace: metadata?.namespace,
    displayName: status?.organization?.displayName ?? spec?.organizationRef?.name ?? '',
    description: undefined,
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ?? new Date(),
    updatedAt: metadata?.creationTimestamp,
    type: (status?.organization?.type as Organization['type']) ?? 'Standard',
    status: mapStatusFromConditions(status?.conditions as Condition[]),
    memberCount: undefined,
    projectCount: undefined,
  };

  return organizationSchema.parse(transformed);
}

export function toCreatePayload(
  input: CreateOrganizationInput
): ComMiloapisResourcemanagerV1Alpha1Organization {
  return {
    apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
    kind: 'Organization',
    metadata: {
      name: input.name,
      annotations: {
        'kubernetes.io/display-name': input.displayName,
        ...(input.description && {
          'kubernetes.io/description': input.description,
        }),
      },
    },
    spec: {
      type: input.type,
    },
  };
}

type JsonPatchOp = {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
};

export function toUpdatePayload(input: UpdateOrganizationInput): JsonPatchOp[] {
  const patches: JsonPatchOp[] = [];

  if (input.displayName !== undefined) {
    patches.push({
      op: 'replace',
      path: '/metadata/annotations/kubernetes.io~1display-name',
      value: input.displayName,
    });
  }

  if (input.description !== undefined) {
    patches.push({
      op: 'replace',
      path: '/metadata/annotations/kubernetes.io~1description',
      value: input.description,
    });
  }

  return patches;
}

type Condition = {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason: string;
};

function mapStatusFromConditions(conditions?: Condition[]): Organization['status'] {
  if (!conditions || conditions.length === 0) {
    return 'Pending';
  }

  const readyCondition = conditions.find((c) => c.type === 'Ready');
  if (!readyCondition) {
    return 'Pending';
  }

  if (readyCondition.status === 'True') {
    return 'Active';
  }

  // Check reason for specific states
  if (readyCondition.reason === 'Suspended') {
    return 'Suspended';
  }

  if (readyCondition.reason === 'Deleting') {
    return 'Deleting';
  }

  return 'Pending';
}
