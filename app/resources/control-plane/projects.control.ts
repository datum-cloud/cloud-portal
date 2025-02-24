import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { NewProjectSchema } from '../schemas/project.schema'
import {
  ComDatumapisResourcemanagerV1AlphaProject,
  createResourcemanagerDatumapisComV1AlphaProject,
  deleteResourcemanagerDatumapisComV1AlphaProject,
  listResourcemanagerDatumapisComV1AlphaProject,
  readResourcemanagerDatumapisComV1AlphaProject,
} from '@/modules/control-plane/resource-manager'
import { Client } from '@hey-api/client-axios'
import { CustomError } from '@/utils/errorHandle'

export const createProjectsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformProject = (
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
    }

    return metadata
  }

  return {
    getProjects: async (orgEntityId: string) => {
      const response = await listResourcemanagerDatumapisComV1AlphaProject({
        client,
        baseURL: `${baseUrl}/organizations/${orgEntityId}/control-plane`,
      })
      return (
        response?.data?.items?.map((project: ComDatumapisResourcemanagerV1AlphaProject) =>
          transformProject(project),
        ) ?? []
      )
    },
    getProject: async (orgEntityId: string, projectName: string) => {
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

      return transformProject(response.data)
    },
    createProject: async (payload: NewProjectSchema, dryRun: boolean = false) => {
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

      return dryRun ? response.data : transformProject(response.data)
    },
    deleteProject: async (orgEntityId: string, projectName: string) => {
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
  }
}

export type ProjectsControl = ReturnType<typeof createProjectsControl>
