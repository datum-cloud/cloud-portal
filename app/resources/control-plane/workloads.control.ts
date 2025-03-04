import {
  ComDatumapisComputeV1AlphaWorkload,
  createComputeDatumapisComV1AlphaNamespacedWorkload,
  deleteComputeDatumapisComV1AlphaNamespacedWorkload,
  listComputeDatumapisComV1AlphaNamespacedWorkload,
  readComputeDatumapisComV1AlphaNamespacedWorkload,
  replaceComputeDatumapisComV1AlphaNamespacedWorkload,
} from '@/modules/control-plane/compute'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload-interface'
import { CustomError } from '@/utils/errorHandle'
import { Client } from '@hey-api/client-axios'

export const workloadsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformWorkload = (
    workload: ComDatumapisComputeV1AlphaWorkload,
  ): IWorkloadControlResponse => {
    return {
      name: workload.metadata?.name,
      namespace: workload.metadata?.namespace,
      createdAt: workload.metadata?.creationTimestamp,
      uid: workload.metadata?.uid,
      resourceVersion: workload.metadata?.resourceVersion,
      spec: workload.spec,
    }
  }

  return {
    getWorkloads: async (projectId: string) => {
      const response = await listComputeDatumapisComV1AlphaNamespacedWorkload({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      })

      return response.data?.items?.map(transformWorkload) ?? []
    },
    getWorkload: async (projectId: string, workloadId: string) => {
      const response = await readComputeDatumapisComV1AlphaNamespacedWorkload({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: workloadId },
      })

      if (!response.data) {
        throw new CustomError(`Workload ${workloadId} not found`, 404)
      }

      return transformWorkload(response.data)
    },
    createWorkload: async (
      projectId: string,
      workload: ComDatumapisComputeV1AlphaWorkload,
      dryRun: boolean = false,
    ) => {
      const response = await createComputeDatumapisComV1AlphaNamespacedWorkload({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          ...workload,
          apiVersion: 'compute.datumapis.com/v1alpha',
          kind: 'Workload',
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to create workload', 500)
      }

      return dryRun ? response.data : transformWorkload(response.data)
    },
    updateWorkload: async (
      projectId: string,
      workloadId: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workload: { spec: any; resourceVersion: string },
      dryRun: boolean = false,
    ) => {
      const response = await replaceComputeDatumapisComV1AlphaNamespacedWorkload({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: workloadId },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          apiVersion: 'compute.datumapis.com/v1alpha',
          kind: 'Workload',
          metadata: {
            name: workloadId,
            resourceVersion: workload.resourceVersion,
          },
          spec: workload.spec,
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to update workload', 500)
      }

      return dryRun ? response.data : transformWorkload(response.data)
    },
    deleteWorkload: async (projectId: string, workloadId: string) => {
      const response = await deleteComputeDatumapisComV1AlphaNamespacedWorkload({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: workloadId },
      })

      if (!response.data) {
        throw new CustomError('Failed to delete workload', 500)
      }

      return response.data
    },
  }
}

export type WorkloadsControl = ReturnType<typeof workloadsControl>
