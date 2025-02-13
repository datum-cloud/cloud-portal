import { AxiosInstance } from 'axios'
import {
  IProjectControl,
  IProjectControlResponse,
} from '@/resources/interfaces/project.interface'
import { NewProjectSchema } from '../schemas/project.schema'

const path = 'apis/resourcemanager.datumapis.com/v1alpha/projects'

const transformProject = (project: IProjectControl): IProjectControlResponse => {
  const metadata = {
    name: project.metadata.name,
    description: project.metadata.annotations?.['kubernetes.io/description'],
    createdAt: project.metadata.creationTimestamp,
    organizationId:
      project.metadata.labels?.['resourcemanager.datumapis.com/organization-id'],
    resourceVersion: project.metadata.resourceVersion,
    uid: project.metadata.uid,
    status: project.status,
  }

  return metadata
}

export const createProjectsControl = (client: AxiosInstance) => {
  return {
    getProjects: async (orgEntityId: string) => {
      const response = await client.get(
        `/organizations/${orgEntityId}/control-plane/${path}`,
      )
      return response.data.map(transformProject)
    },
    getProject: async (orgEntityId: string, projectName: string) => {
      const response = await client.get(
        `/organizations/${orgEntityId}/control-plane/${path}/${projectName}`,
      )
      return transformProject(response.data)
    },
    createProject: async (orgEntityId: string, payload: NewProjectSchema) => {
      const projectPayload = {
        apiVersion: 'resourcemanager.datumapis.com/v1alpha',
        kind: 'Project',
        metadata: {
          name: payload.name,
          annotations: {
            'kubernetes.io/description': payload.description,
          },
        },
      }

      const response = await client.post(
        `/organizations/${orgEntityId}/control-plane/${path}`,
        projectPayload,
      )

      return transformProject(response.data)
    },
  }
}

export type ProjectsControl = ReturnType<typeof createProjectsControl>
