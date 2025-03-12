import {
  ComDatumapisComputeV1AlphaWorkloadDeployment,
  listComputeDatumapisComV1AlphaNamespacedWorkloadDeployment,
  readComputeDatumapisComV1AlphaNamespacedWorkloadDeploymentStatus,
} from '@/modules/control-plane/compute'
import { IWorkloadDeploymentControlResponse } from '@/resources/interfaces/workload.interface'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createWorkloadDeploymentsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transform = (
    workload: ComDatumapisComputeV1AlphaWorkloadDeployment,
  ): IWorkloadDeploymentControlResponse => {
    return {
      name: workload.metadata?.name,
      namespace: workload.metadata?.namespace,
      createdAt: workload.metadata?.creationTimestamp,
      uid: workload.metadata?.uid,
      resourceVersion: workload.metadata?.resourceVersion,
      spec: workload.spec,
      status: workload.status,
      cityCode: workload.spec?.cityCode,
      location: workload.status?.location,
      currentReplicas: workload.status?.currentReplicas,
      desiredReplicas: workload.status?.desiredReplicas,
    }
  }

  return {
    list: async (projectId: string, workloadUid?: string) => {
      const response = await listComputeDatumapisComV1AlphaNamespacedWorkloadDeployment({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        query: {
          labelSelector: workloadUid
            ? `compute.datumapis.com/workload-uid=${workloadUid}`
            : undefined,
        },
      })

      return response.data?.items?.map(transform) ?? []
    },
    getStatus: async (projectId: string, deploymentId: string) => {
      const response =
        await readComputeDatumapisComV1AlphaNamespacedWorkloadDeploymentStatus({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: deploymentId },
        })

      if (!response.data) {
        throw new CustomError(`Workload deployment ${deploymentId} not found`, 404)
      }

      return transformControlPlaneStatus(response.data.status)
    },
  }
}

export type WorkloadDeploymentsControl = ReturnType<
  typeof createWorkloadDeploymentsControl
>
