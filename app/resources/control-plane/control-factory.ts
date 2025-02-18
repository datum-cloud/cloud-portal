import { createProjectsControl, ProjectsControl } from './projects.control'
import { createControlPlaneClient } from '@/modules/control-plane/axios-client'
import { Client } from '@hey-api/client-axios'
// Define factory return type
export interface ControlPlaneFactory {
  projectsControl: ProjectsControl
}

export const createControlPlaneFactory = (authToken: string): ControlPlaneFactory => {
  const baseURL = `${process.env.API_URL}/apis/resourcemanager.datumapis.com/v1alpha`

  const apiClient: Client = createControlPlaneClient({
    baseURL,
    authToken,
  })

  return {
    projectsControl: createProjectsControl(apiClient),
  }
}
