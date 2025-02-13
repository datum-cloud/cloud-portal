import { createAxiosClient } from '@/modules/axios/axios'
import { createProjectsControl, ProjectsControl } from './projects.control'
import { AxiosInstance } from 'axios'

// Define factory return type
export interface ControlPlaneFactory {
  projectsControl: ProjectsControl
}

export const createControlPlaneFactory = (authToken: string): ControlPlaneFactory => {
  const apiClient: AxiosInstance = createAxiosClient({
    baseURL: `${process.env.API_URL}/apis/resourcemanager.datumapis.com/v1alpha`,
    authToken,
  })

  return {
    projectsControl: createProjectsControl(apiClient),
  }
}
