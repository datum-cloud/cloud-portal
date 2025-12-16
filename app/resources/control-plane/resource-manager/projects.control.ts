import {
  ComMiloapisResourcemanagerV1Alpha1Project,
  ComMiloapisResourcemanagerV1Alpha1ProjectList,
  createResourcemanagerMiloapisComV1Alpha1Project,
  deleteResourcemanagerMiloapisComV1Alpha1Project,
  listResourcemanagerMiloapisComV1Alpha1Project,
  patchResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1ProjectStatus,
} from '@/modules/control-plane/resource-manager';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { UpdateProjectSchema, ProjectSchema } from '@/resources/schemas/project.schema';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { convertLabelsToObject, filterLabels } from '@/utils/helpers/object.helper';
import { Client } from '@hey-api/client-axios';

export const createProjectsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transform = (
    project: ComMiloapisResourcemanagerV1Alpha1Project
  ): IProjectControlResponse => {
    const metadata = {
      name: project?.metadata?.name,
      description:
        project?.metadata?.annotations?.['kubernetes.io/description'] ?? project?.metadata?.name,
      createdAt: project?.metadata?.creationTimestamp ?? new Date(),
      organizationId: project?.spec?.ownerRef?.name ?? '',
      resourceVersion: project?.metadata?.resourceVersion ?? '',
      uid: project?.metadata?.uid ?? '',
      status: project.status ?? {},
      labels: filterLabels(project?.metadata?.labels ?? {}, ['resourcemanager']),
      namespace: project?.metadata?.namespace ?? '',
      annotations: project?.metadata?.annotations ?? {},
    };

    return metadata;
  };

  return {
    list: async (orgEntityId: string) => {
      try {
        const response = await listResourcemanagerMiloapisComV1Alpha1Project({
          client,
          baseURL: `${baseUrl}/organizations/${orgEntityId}/control-plane`,
        });
        const projectList = response?.data as ComMiloapisResourcemanagerV1Alpha1ProjectList;

        return (
          projectList?.items
            ?.filter(
              // Filter out projects that are being deleted
              (project: ComMiloapisResourcemanagerV1Alpha1Project) =>
                typeof project.metadata?.deletionTimestamp === 'undefined'
            )
            .map((project: ComMiloapisResourcemanagerV1Alpha1Project) => transform(project)) ?? []
        );
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectName: string) => {
      try {
        const response = await readResourcemanagerMiloapisComV1Alpha1Project({
          client,
          path: {
            name: projectName,
          },
        });
        const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;
        return transform(project);
      } catch (e) {
        throw e;
      }
    },
    create: async (payload: ProjectSchema, dryRun: boolean = false) => {
      try {
        const response = await createResourcemanagerMiloapisComV1Alpha1Project({
          client,
          baseURL: `${baseUrl}/organizations/${payload.orgEntityId}/control-plane`,
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
            kind: 'Project',
            metadata: {
              name: payload.name,
              annotations: {
                'kubernetes.io/description': payload.description,
              },
              labels: convertLabelsToObject(payload.labels ?? []),
            },
            spec: {
              ownerRef: {
                kind: 'Organization',
                name: payload.orgEntityId ?? '',
              },
            },
          },
        });
        const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;
        return dryRun ? response.data : transform(project);
      } catch (e) {
        throw e;
      }
    },
    update: async (projectName: string, payload: UpdateProjectSchema, dryRun: boolean = false) => {
      try {
        const metadata: Record<string, any> = {};
        if (payload.description) {
          metadata.annotations = {
            'kubernetes.io/description': payload.description,
          };
        }
        if ('labels' in payload && payload.labels && payload.labels.length > 0) {
          metadata.labels = convertLabelsToObject(payload.labels);
        }

        if (
          'annotations' in payload &&
          payload.annotations &&
          Object.keys(payload.annotations).length > 0
        ) {
          metadata.annotations = {
            ...metadata.annotations,
            ...convertLabelsToObject(payload.annotations),
          };
        }

        const response = await patchResourcemanagerMiloapisComV1Alpha1Project({
          client,
          path: { name: projectName },
          query: {
            dryRun: dryRun ? 'All' : undefined,
            fieldManager: 'datum-cloud-portal',
          },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          body: {
            apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
            kind: 'Project',
            metadata,
          },
        });
        const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;
        return dryRun ? response.data : transform(project);
      } catch (e) {
        throw e;
      }
    },
    delete: async (_orgEntityId: string, projectName: string) => {
      try {
        const response = await deleteResourcemanagerMiloapisComV1Alpha1Project({
          client,
          path: { name: projectName },
        });
        const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;
        return project;
      } catch (e) {
        throw e;
      }
    },
    getStatus: async (projectName: string) => {
      try {
        const response = await readResourcemanagerMiloapisComV1Alpha1ProjectStatus({
          client,
          path: { name: projectName },
        });
        const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;
        return transformControlPlaneStatus(project.status);
      } catch (e) {
        throw e;
      }
    },
  };
};
export type ProjectsControl = ReturnType<typeof createProjectsControl>;
