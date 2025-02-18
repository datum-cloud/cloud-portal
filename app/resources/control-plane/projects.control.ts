import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { NewProjectSchema } from '../schemas/project.schema'
import {
  ComDatumapisResourcemanagerV1AlphaProject,
  createResourcemanagerDatumapisComV1AlphaProject,
  deleteResourcemanagerDatumapisComV1AlphaProject,
  listResourcemanagerDatumapisComV1AlphaProject,
  readResourcemanagerDatumapisComV1AlphaProject,
} from '@/modules/control-plane/projects'
import { Client } from '@hey-api/client-axios'

const transformProject = (
  project: ComDatumapisResourcemanagerV1AlphaProject,
): IProjectControlResponse => {
  const metadata = {
    name: project?.metadata?.name ?? '',
    description: project?.metadata?.annotations?.['kubernetes.io/description'] ?? '',
    createdAt: project?.metadata?.creationTimestamp ?? new Date(),
    organizationId:
      project?.metadata?.labels?.['resourcemanager.datumapis.com/organization-id'] ?? '',
    resourceVersion: project?.metadata?.resourceVersion ?? '',
    uid: project?.metadata?.uid ?? '',
    status: project.status ?? {},
  }

  return metadata
}

export const createProjectsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

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
        throw new Response(`Project ${projectName} not found`, {
          status: 404,
          statusText: `Project ${projectName} not found`,
        })
      }

      return transformProject(response.data)
    },
    createProject: async (payload: NewProjectSchema) => {
      const response = await createResourcemanagerDatumapisComV1AlphaProject({
        client,
        baseURL: `${baseUrl}/organizations/${payload.orgEntityId}/control-plane`,
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
        throw new Response('Failed to create project', {
          status: 500,
          statusText: 'Failed to create project',
        })
      }

      return transformProject(response.data)
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
        throw new Response(`Project ${projectName} not found`, {
          status: 404,
          statusText: `Project ${projectName} not found`,
        })
      }

      return response.data
    },
  }
}

export type ProjectsControl = ReturnType<typeof createProjectsControl>
