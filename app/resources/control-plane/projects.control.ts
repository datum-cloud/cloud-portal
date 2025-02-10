import { NewProjectSchema } from '@/resources/schemas/project.schema'
import { ControlPlaneClient } from '@/modules/axios/control-plane'
import {
  IProjectControl,
  IProjectControlResponse,
} from '@/resources/interfaces/project.interface'

export class ProjectsControl extends ControlPlaneClient {
  path = 'apis/resourcemanager.datumapis.com/v1alpha/projects'

  transformProject(project: IProjectControl): IProjectControlResponse {
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
  /**
   * Get all projects for an organization
   * @param orgEntityId - The entity ID of the organization
   * @param request - The request object
   * @returns The projects for the organization
   */
  async getProjects(orgEntityId: string, request?: Request) {
    if (request) {
      await this.setToken(request)
    }

    const { data } = await this.authClient(
      `/organizations/${orgEntityId}/control-plane/${this.path}`,
      'GET',
    )
    return (
      data?.items?.map((project: IProjectControl) => this.transformProject(project)) ?? []
    )
  }

  async getProject(orgEntityId: string, projectName: string, request?: Request) {
    if (request) {
      await this.setToken(request)
    }

    const { data } = await this.authClient(
      `/organizations/${orgEntityId}/control-plane/${this.path}/${projectName}`,
      'GET',
    )

    return this.transformProject(data)
  }

  /**
   * Create a project
   * @param orgEntityId - The entity ID of the organization
   * @param payload - The payload for the project
   * @param request - The request object
   * @returns The created project
   */
  async createProject(orgEntityId: string, payload: NewProjectSchema, request?: Request) {
    if (request) {
      await this.setToken(request)
    }

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

    const { data } = await this.authClient(
      `/organizations/${orgEntityId}/control-plane/${this.path}`,
      'POST',
      projectPayload,
    )

    return this.transformProject(data)
  }
}

export const projectsControl = new ProjectsControl()
