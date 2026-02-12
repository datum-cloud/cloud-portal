import {
  projectSchema,
  type Project,
  type ProjectList,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project.schema';
import type {
  ComMiloapisResourcemanagerV1Alpha1Project,
  ComMiloapisResourcemanagerV1Alpha1ProjectList,
} from '@/modules/control-plane/resource-manager';
import { ControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { filterLabels } from '@/utils/helpers/object.helper';

export function toProject(raw: ComMiloapisResourcemanagerV1Alpha1Project): Project {
  const transformed = {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace ?? '',
    displayName:
      raw.metadata?.annotations?.['kubernetes.io/description'] ?? raw.metadata?.name ?? '',
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    updatedAt: raw.metadata?.creationTimestamp,
    organizationId: raw.spec?.ownerRef?.name ?? '',
    status: raw.status ?? {},
    labels: filterLabels(raw.metadata?.labels ?? {}, ['resourcemanager']),
    annotations: raw.metadata?.annotations ?? {},
  };

  return projectSchema.parse(transformed);
}

export function toProjectList(raw: ComMiloapisResourcemanagerV1Alpha1ProjectList): ProjectList {
  const items = (raw.items ?? [])
    // Only include projects that are not being deleted
    .filter((p) => !p.metadata?.deletionTimestamp)
    .filter((p) => {
      // Only include projects that are ready
      const status = transformControlPlaneStatus(p.status);
      return status.status === ControlPlaneStatus.Success;
    })
    .map(toProject);

  return {
    items,
    nextCursor: raw.metadata?.continue ?? null,
    hasMore: !!raw.metadata?.continue,
  };
}

export function toCreatePayload(
  input: CreateProjectInput
): ComMiloapisResourcemanagerV1Alpha1Project {
  return {
    apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
    kind: 'Project',
    metadata: {
      name: input.name,
      annotations: {
        'kubernetes.io/description': input.description ?? '',
      },
    },
    spec: {
      ownerRef: {
        kind: 'Organization',
        name: input.organizationId,
      },
    },
  };
}

export function toUpdatePayload(
  input: UpdateProjectInput
): Partial<ComMiloapisResourcemanagerV1Alpha1Project> {
  return {
    apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
    kind: 'Project',
    metadata: {
      annotations: {
        ...(input.description && { 'kubernetes.io/description': input.description }),
        ...input.annotations,
      },
    },
  };
}
