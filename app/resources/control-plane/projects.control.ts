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
import { CustomError } from '@/utils/errorHandle';
import { convertLabelsToObject, filterLabels, transformControlPlaneStatus } from '@/utils/misc';
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
    };

    return metadata;
  };

  return {
    list: async (orgEntityId: string) => {
      const response = await listResourcemanagerMiloapisComV1Alpha1Project({
        client,
        baseURL: `${baseUrl}/organizations/${orgEntityId}/control-plane`,
      });

      // Type guard to check if data is a valid project list
      const projectList = response?.data as ComMiloapisResourcemanagerV1Alpha1ProjectList;

      return (
        projectList?.items?.map((project: ComMiloapisResourcemanagerV1Alpha1Project) =>
          transform(project)
        ) ?? []
      );
    },
    detail: async (projectName: string) => {
      const response = await readResourcemanagerMiloapisComV1Alpha1Project({
        client,
        path: {
          name: projectName,
        },
      });

      if (!response.data) {
        throw new CustomError(`Project ${projectName} not found`, 404);
      }

      const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;

      return transform(project);
    },
    create: async (payload: ProjectSchema, dryRun: boolean = false) => {
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
              name: payload.orgEntityId,
            },
          },
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to create project', 500);
      }

      const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;

      return dryRun ? response.data : transform(project);
    },
    update: async (projectName: string, payload: UpdateProjectSchema, dryRun: boolean = false) => {
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
          metadata: {
            annotations: {
              'kubernetes.io/description': payload.description,
            },
            labels: convertLabelsToObject(payload.labels ?? []),
          },
        },
      });

      if (!response.data) {
        throw new CustomError(`Project ${projectName} not found`, 404);
      }

      const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;

      return dryRun ? response.data : transform(project);
    },
    delete: async (orgEntityId: string, projectName: string) => {
      const response = await deleteResourcemanagerMiloapisComV1Alpha1Project({
        client,
        path: { name: projectName },
      });

      if (!response.data) {
        throw new CustomError(`Project ${projectName} not found`, 404);
      }

      const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;

      return project;
    },
    getStatus: async (projectName: string) => {
      const response = await readResourcemanagerMiloapisComV1Alpha1ProjectStatus({
        client,
        path: { name: projectName },
      });

      if (!response.data) {
        throw new CustomError(`Project ${projectName} not found`, 404);
      }

      const project = response.data as ComMiloapisResourcemanagerV1Alpha1Project;

      return transformControlPlaneStatus(project.status);
    },
  };
};
export type ProjectsControl = ReturnType<typeof createProjectsControl>;
