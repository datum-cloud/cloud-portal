import {
  ComDatumapisComputeV1AlphaWorkload,
  createComputeDatumapisComV1AlphaNamespacedWorkload,
  deleteComputeDatumapisComV1AlphaNamespacedWorkload,
  listComputeDatumapisComV1AlphaNamespacedWorkload,
  readComputeDatumapisComV1AlphaNamespacedWorkload,
  readComputeDatumapisComV1AlphaNamespacedWorkloadStatus,
  replaceComputeDatumapisComV1AlphaNamespacedWorkload,
} from '@/modules/control-plane/compute'
import {
  IWorkloadControlResponse,
  RuntimeType,
} from '@/resources/interfaces/workload.interface'
import { NewWorkloadSchema } from '@/resources/schemas/workload.schema'
import { CustomError } from '@/utils/errorHandle'
import { convertLabelsToObject, transformControlPlaneStatus } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createWorkloadsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformWorkload = (
    workload: ComDatumapisComputeV1AlphaWorkload,
  ): IWorkloadControlResponse => {
    return {
      name: workload.metadata?.name,
      labels: workload.metadata?.labels,
      annotations: workload.metadata?.annotations,
      namespace: workload.metadata?.namespace,
      createdAt: workload.metadata?.creationTimestamp,
      uid: workload.metadata?.uid,
      resourceVersion: workload.metadata?.resourceVersion,
      spec: workload.spec,
      status: workload.status,
    }
  }

  const formatWorkload = (
    value: NewWorkloadSchema,
  ): ComDatumapisComputeV1AlphaWorkload => {
    // Runtime Handler
    let runtime = {}
    let specAnnotations = {}
    if (value?.runtime?.runtimeType === RuntimeType.VM) {
      runtime = {
        virtualMachine: {
          ports: [
            // TODO: Add ports configuration if needed in the future
            {
              name: 'http',
              port: 8080,
              protocol: 'TCP', // Adding default protocol
            },
          ],
          volumeAttachments: (value?.storages ?? []).map((storage) => ({
            name: storage?.name,
            // Add mountPath if available in the future
          })),
        },
      }

      if (value?.runtime?.virtualMachine?.sshKey) {
        specAnnotations = {
          'compute.datumapis.com/ssh-keys': value?.runtime?.virtualMachine?.sshKey ?? '',
        }
      }
    }

    return {
      metadata: {
        name: value?.metadata?.name,
        labels: convertLabelsToObject(value?.metadata?.labels ?? []),
        annotations: convertLabelsToObject(value?.metadata?.annotations ?? []),
      },
      spec: {
        template: {
          metadata: {
            annotations: { ...specAnnotations },
          },
          spec: {
            networkInterfaces: (value?.networks ?? []).map((network) => ({
              network: {
                name: network?.name,
              },
              networkPolicy: {
                ingress: [
                  {
                    from: network?.ipFamilies?.map((ipFamily) => ({
                      ipBlock: {
                        cidr: ipFamily === 'IPv4' ? '0.0.0.0/0' : '::/0',
                      },
                    })),
                    // Adding ports configuration if needed in the future
                    // ports: []
                  },
                ],
              },
            })),
            runtime: {
              resources: {
                instanceType: value?.runtime?.instanceType,
              },
              ...runtime,
            },
            volumes: (value?.storages ?? []).map((storage) => ({
              disk: {
                template: {
                  spec: {
                    populator: {
                      image: {
                        name: storage?.bootImage,
                      },
                    },
                    resources: {
                      requests: {
                        storage: `${storage?.size}Gi`, // Default to GiB
                      },
                    },
                  },
                },
              },
              name: storage?.name,
            })),
          },
        },
        placements: (value?.placements ?? []).map((placement) => ({
          cityCodes: [placement?.cityCode],
          name: placement?.name,
          scaleSettings: {
            minReplicas: Number(placement?.minimumReplicas ?? 1),
            // Add maxReplicas if needed for autoscaling
          },
        })),
      },
    } as ComDatumapisComputeV1AlphaWorkload
  }

  return {
    list: async (projectId: string) => {
      const response = await listComputeDatumapisComV1AlphaNamespacedWorkload({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      })

      return response.data?.items?.map(transformWorkload) ?? []
    },
    detail: async (projectId: string, workloadId: string) => {
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
    create: async (
      projectId: string,
      workload: NewWorkloadSchema,
      dryRun: boolean = false,
    ) => {
      const formatted = formatWorkload(workload)
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
          ...formatted,
          apiVersion: 'compute.datumapis.com/v1alpha',
          kind: 'Workload',
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to create workload', 500)
      }

      return dryRun ? response.data : transformWorkload(response.data)
    },
    update: async (
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
    delete: async (projectId: string, workloadId: string) => {
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
    getStatus: async (projectId: string, workloadId: string) => {
      const response = await readComputeDatumapisComV1AlphaNamespacedWorkloadStatus({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: workloadId },
      })

      if (!response.data) {
        throw new CustomError(`Workload ${workloadId} not found`, 404)
      }

      return transformControlPlaneStatus(response.data.status)
    },
  }
}

export type WorkloadsControl = ReturnType<typeof createWorkloadsControl>
