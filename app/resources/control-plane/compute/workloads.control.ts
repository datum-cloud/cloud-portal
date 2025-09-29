import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import {
  ComDatumapisComputeV1AlphaWorkload,
  ComDatumapisComputeV1AlphaWorkloadList,
  createComputeDatumapisComV1AlphaNamespacedWorkload,
  deleteComputeDatumapisComV1AlphaNamespacedWorkload,
  listComputeDatumapisComV1AlphaNamespacedWorkload,
  readComputeDatumapisComV1AlphaNamespacedWorkload,
  readComputeDatumapisComV1AlphaNamespacedWorkloadStatus,
  replaceComputeDatumapisComV1AlphaNamespacedWorkload,
} from '@/modules/control-plane/compute';
import {
  ContainerEnvType,
  IWorkloadControlResponse,
  RuntimeType,
} from '@/resources/interfaces/workload.interface';
import { NewWorkloadSchema, RuntimeEnvSchema } from '@/resources/schemas/workload.schema';
import { convertLabelsToObject } from '@/utils/helpers/object.helper';
import { Client } from '@hey-api/client-axios';

export const createWorkloadsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformWorkload = (
    workload: ComDatumapisComputeV1AlphaWorkload
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
    };
  };

  const formatWorkload = (
    value: NewWorkloadSchema,
    resourceVersion?: string
  ): ComDatumapisComputeV1AlphaWorkload => {
    // Runtime Handler
    const isVM = value?.runtime?.runtimeType === RuntimeType.VM;
    const specAnnotations: Record<string, string> = {};

    // Create volume attachments for storage
    const volumeAttachments = (value?.storages ?? []).map((storage) => ({
      name: storage?.name,
      // mountPath will be added when available
    }));

    // Configure runtime based on type (VM or Sandbox)
    let runtimeSpec = {};
    if (isVM) {
      // Add SSH Key to the VM if provided
      if (value?.runtime?.virtualMachine?.sshKey) {
        specAnnotations['compute.datumapis.com/ssh-keys'] = value.runtime.virtualMachine.sshKey;
      }

      runtimeSpec = {
        virtualMachine: {
          ports: value?.runtime?.virtualMachine?.ports ?? [],
          volumeAttachments: [{ name: 'boot' }, ...volumeAttachments],
        },
      };
    } else {
      runtimeSpec = {
        sandbox: {
          containers: (value?.runtime?.containers ?? []).map((container) => ({
            name: container.name,
            image: container.image,
            ports: container.ports ?? [],
            volumeAttachments,
            env: (container.envs ?? []).map((env: RuntimeEnvSchema) => {
              const envPayload = {
                name: env.name,
              };

              if (env.type === ContainerEnvType.TEXT) {
                Object.assign(envPayload, {
                  value: env.value,
                });
              } else if (env.type === ContainerEnvType.SECRET) {
                Object.assign(envPayload, {
                  valueFrom: {
                    secretKeyRef: {
                      name: env.refName,
                      key: env.key,
                    },
                  },
                });
              } else if (env.type === ContainerEnvType.CONFIG_MAP) {
                Object.assign(envPayload, {
                  valueFrom: {
                    configMapKeyRef: {
                      name: env.refName,
                      key: env.key,
                    },
                  },
                });
              }

              return envPayload;
            }),
          })),
        },
      };
    }

    // Construct and return the workload object
    return {
      metadata: {
        name: value?.metadata?.name,
        labels: convertLabelsToObject(value?.metadata?.labels ?? []),
        annotations: convertLabelsToObject(value?.metadata?.annotations ?? []),
        ...(resourceVersion && { resourceVersion }),
      },
      spec: {
        template: {
          metadata: {
            annotations: specAnnotations,
          },
          spec: {
            networkInterfaces: (value?.networks ?? []).map((network) => ({
              network: {
                name: network.name,
              },
              networkPolicy: {
                ingress: [
                  {
                    from: network?.ipFamilies?.map((ipFamily) => ({
                      ipBlock: {
                        cidr: ipFamily === 'IPv4' ? '0.0.0.0/0' : '::/0',
                      },
                    })),
                  },
                ],
              },
            })),
            runtime: {
              resources: {
                instanceType: value?.runtime?.instanceType,
              },
              ...runtimeSpec,
            },
            volumes: [
              // Add boot volume for VM instances
              ...(isVM
                ? [
                    {
                      name: 'boot',
                      disk: {
                        template: {
                          spec: {
                            type: 'pd-standard',
                            populator: {
                              image: {
                                name: value?.runtime?.virtualMachine?.bootImage,
                              },
                            },
                          },
                        },
                      },
                    },
                  ]
                : []),
              // Add storage volumes
              ...(value?.storages ?? []).map((storage) => ({
                name: storage.name,
                disk: {
                  template: {
                    spec: {
                      resources: {
                        requests: {
                          storage: `${storage.size}Gi`,
                        },
                      },
                    },
                  },
                },
              })),
            ],
          },
        },
        placements: (value?.placements ?? []).map((placement) => ({
          cityCodes: [placement.cityCode],
          name: placement.name,
          scaleSettings: {
            minReplicas: Number(placement?.minimumReplicas ?? 1),
          },
        })),
      },
    } as ComDatumapisComputeV1AlphaWorkload;
  };

  return {
    list: async (projectId: string) => {
      try {
        const response = await listComputeDatumapisComV1AlphaNamespacedWorkload({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const workloads = response?.data as ComDatumapisComputeV1AlphaWorkloadList;

        return workloads?.items?.map(transformWorkload) ?? [];
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, workloadId: string) => {
      try {
        const response = await readComputeDatumapisComV1AlphaNamespacedWorkload({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: workloadId },
        });

        const workload = response.data as ComDatumapisComputeV1AlphaWorkload;

        return transformWorkload(workload);
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, payload: NewWorkloadSchema, dryRun: boolean = false) => {
      try {
        const formatted = formatWorkload(payload);
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
        });

        const workload = response.data as ComDatumapisComputeV1AlphaWorkload;

        return dryRun ? workload : transformWorkload(workload);
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      workloadId: string,
      payload: NewWorkloadSchema,
      resourceVersion: string,
      dryRun: boolean = false
    ) => {
      try {
        const formatted = formatWorkload(payload, resourceVersion);
        const response = await replaceComputeDatumapisComV1AlphaNamespacedWorkload({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: workloadId },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            ...formatted,
            apiVersion: 'compute.datumapis.com/v1alpha',
            kind: 'Workload',
          },
        });

        const workload = response.data as ComDatumapisComputeV1AlphaWorkload;

        return dryRun ? workload : transformWorkload(workload);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, workloadId: string) => {
      try {
        const response = await deleteComputeDatumapisComV1AlphaNamespacedWorkload({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: workloadId },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
    getStatus: async (projectId: string, workloadId: string) => {
      try {
        const response = await readComputeDatumapisComV1AlphaNamespacedWorkloadStatus({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: workloadId },
        });

        const workload = response.data as ComDatumapisComputeV1AlphaWorkload;

        return transformControlPlaneStatus(workload.status);
      } catch (e) {
        throw e;
      }
    },
  };
};

export type WorkloadsControl = ReturnType<typeof createWorkloadsControl>;
