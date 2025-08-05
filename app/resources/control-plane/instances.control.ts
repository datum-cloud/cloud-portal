import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import {
  ComDatumapisComputeV1AlphaInstance,
  ComDatumapisComputeV1AlphaInstanceList,
  listComputeDatumapisComV1AlphaNamespacedInstance,
  readComputeDatumapisComV1AlphaNamespacedInstanceStatus,
} from '@/modules/control-plane/compute';
import { IInstanceControlResponse } from '@/resources/interfaces/workload.interface';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';

export const createInstancesControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transform = (instance: ComDatumapisComputeV1AlphaInstance): IInstanceControlResponse => {
    return {
      name: instance.metadata?.name,
      namespace: instance.metadata?.namespace,
      createdAt: instance.metadata?.creationTimestamp,
      uid: instance.metadata?.uid,
      resourceVersion: instance.metadata?.resourceVersion,
      spec: instance.spec,
      status: instance.status,
      type: instance.spec?.runtime.resources.instanceType,
      externalIp: instance.status?.networkInterfaces?.[0]?.assignments?.externalIP,
      networkIp: instance.status?.networkInterfaces?.[0]?.assignments?.networkIP,
    };
  };

  return {
    list: async (projectId: string, workloadUid?: string) => {
      const response = await listComputeDatumapisComV1AlphaNamespacedInstance({
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
      });

      const instances = response.data as ComDatumapisComputeV1AlphaInstanceList;

      return instances.items.map(transform);
    },
    getStatus: async (projectId: string, instanceId: string) => {
      const response = await readComputeDatumapisComV1AlphaNamespacedInstanceStatus({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: instanceId },
      });

      if (!response.data) {
        throw new CustomError(`Instance ${instanceId} not found`, 404);
      }

      const instance = response.data as ComDatumapisComputeV1AlphaInstance;

      return transformControlPlaneStatus(instance.status);
    },
  };
};

export type InstancesControl = ReturnType<typeof createInstancesControl>;
