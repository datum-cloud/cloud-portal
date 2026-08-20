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
  const annotations = raw.metadata?.annotations;
  const transformed = {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace ?? '',
    displayName:
      annotations?.['kubernetes.io/display-name'] ||
      annotations?.['kubernetes.io/description'] ||
      raw.metadata?.name ||
      '',
    description: annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    updatedAt: raw.metadata?.creationTimestamp,
    organizationId: raw.spec?.ownerRef?.name ?? '',
    status: raw.status ?? {},
    deletionTimestamp: raw.metadata?.deletionTimestamp,
    labels: filterLabels(raw.metadata?.labels ?? {}, ['resourcemanager']),
    annotations: raw.metadata?.annotations ?? {},
  };

  return projectSchema.parse(transformed);
}

export function toProjectList(raw: ComMiloapisResourcemanagerV1Alpha1ProjectList): ProjectList {
  const items = (raw.items ?? [])
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

/** Like `toProjectList`, but includes in-flight (non-Ready) projects for idempotent guards. */
export function toProjectListAll(raw: ComMiloapisResourcemanagerV1Alpha1ProjectList): ProjectList {
  const items = (raw.items ?? []).filter((p) => !p.metadata?.deletionTimestamp).map(toProject);

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
      generateName: 'project-',
      // Both annotations carry the name: display-name is what the read path
      // above (and graphql-gateway's Project.displayName) prefers, while
      // description stays populated for consumers still reading it.
      annotations: {
        'kubernetes.io/display-name': input.description ?? '',
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
        // Kept in sync with toCreatePayload — writing only description would
        // leave a stale display-name winning the read chain, so the rename
        // would appear to succeed and then revert (#1440).
        ...(input.description !== undefined && {
          'kubernetes.io/display-name': input.description,
          'kubernetes.io/description': input.description,
        }),
        ...input.annotations,
      },
    },
  };
}
