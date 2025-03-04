import { coreControl, CoreControl } from './core.control'
import { LocationsControl, locationsControl } from './locations.control'
import { NetworksControl, networksControl } from './networks.control'
import { ProjectsControl, projectsControl } from './projects.control'
import { WorkloadsControl, workloadsControl } from './workloads.control'
import { createControlPlaneClient } from '@/modules/control-plane/axiosControl'
import { Client } from '@hey-api/client-axios'

// Define factory return type
export interface ControlPlaneFactory {
  projectsControl: ProjectsControl
  locationsControl: LocationsControl
  networksControl: NetworksControl
  coreControl: CoreControl
  workloadsControl: WorkloadsControl
}

export const createControlPlaneFactory = (authToken: string): ControlPlaneFactory => {
  const baseURL = `${process.env.API_URL}/apis/resourcemanager.datumapis.com/v1alpha`

  const apiClient: Client = createControlPlaneClient({
    baseURL,
    authToken,
  })

  return {
    projectsControl: projectsControl(apiClient),
    locationsControl: locationsControl(apiClient),
    networksControl: networksControl(apiClient),
    coreControl: coreControl(apiClient),
    workloadsControl: workloadsControl(apiClient),
  }
}
