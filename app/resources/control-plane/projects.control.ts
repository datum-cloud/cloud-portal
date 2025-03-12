import {
  ComDatumapisResourcemanagerV1AlphaProject,
  createResourcemanagerDatumapisComV1AlphaProject,
  deleteResourcemanagerDatumapisComV1AlphaProject,
  listResourcemanagerDatumapisComV1AlphaProject,
  readResourcemanagerDatumapisComV1AlphaProject,
  readResourcemanagerDatumapisComV1AlphaProjectStatus,
} from '@/modules/control-plane/resource-manager'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { NewProjectSchema } from '@/resources/schemas/project.schema'
import { CustomError } from '@/utils/errorHandle'
import {
  convertLabelsToObject,
  filterLabels,
  transformControlPlaneStatus,
} from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createProjectsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transform = (
    project: ComDatumapisResourcemanagerV1AlphaProject,
  ): IProjectControlResponse => {
    const metadata = {
      name: project?.metadata?.name ?? '',
      description: project?.metadata?.annotations?.['kubernetes.io/description'] ?? '',
      createdAt: project?.metadata?.creationTimestamp ?? new Date(),
      organizationId:
        project?.metadata?.labels?.['resourcemanager.datumapis.com/organization-id'] ??
        '',
      resourceVersion: project?.metadata?.resourceVersion ?? '',
      uid: project?.metadata?.uid ?? '',
      status: project.status ?? {},
      labels: filterLabels(project?.metadata?.labels ?? {}),
    }

    return metadata
  }

  return {
    list: async (orgEntityId: string) => {
      const response = await listResourcemanagerDatumapisComV1AlphaProject({
        client,
        baseURL: `${baseUrl}/organizations/${orgEntityId}/control-plane`,
      })
      return (
        response?.data?.items?.map((project: ComDatumapisResourcemanagerV1AlphaProject) =>
          transform(project),
        ) ?? []
      )
    },
    detail: async (orgEntityId: string, projectName: string) => {
      const response = await readResourcemanagerDatumapisComV1AlphaProject({
        client,
        baseURL: `${baseUrl}/organizations/${orgEntityId}/control-plane`,
        path: {
          name: projectName,
        },
      })

      if (!response.data) {
        throw new CustomError(`Project ${projectName} not found`, 404)
      }

      return transform(response.data)
    },
    create: async (payload: NewProjectSchema, dryRun: boolean = false) => {
      const response = await createResourcemanagerDatumapisComV1AlphaProject({
        client,
        baseURL: `${baseUrl}/organizations/${payload.orgEntityId}/control-plane`,
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          apiVersion: 'resourcemanager.datumapis.com/v1alpha',
          kind: 'Project',
          metadata: {
            name: payload.name,
            annotations: {
              'kubernetes.io/description': payload.description,
            },
            labels: convertLabelsToObject(payload.labels ?? []),
          },
          spec: {
            parent: {
              external: '', // TODO: need to confirm about this part. because it's required
            },
          },
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to create project', 500)
      }

      return dryRun ? response.data : transform(response.data)
    },
    delete: async (orgEntityId: string, projectName: string) => {
      const response = await deleteResourcemanagerDatumapisComV1AlphaProject({
        client,
        baseURL: `${baseUrl}/organizations/${orgEntityId}/control-plane`,
        path: {
          name: projectName,
        },
      })

      if (!response.data) {
        throw new CustomError(`Project ${projectName} not found`, 404)
      }

      return response.data
    },
    getStatus: async (orgEntityId: string, projectName: string) => {
      const response = await readResourcemanagerDatumapisComV1AlphaProjectStatus({
        client,
        baseURL: `${baseUrl}/organizations/${orgEntityId}/control-plane`,
        path: {
          name: projectName,
        },
      })

      if (!response.data) {
        throw new CustomError(`Project ${projectName} not found`, 404)
      }

      return transformControlPlaneStatus(response.data.status)
    },
  }
}
export type ProjectsControl = ReturnType<typeof createProjectsControl>
