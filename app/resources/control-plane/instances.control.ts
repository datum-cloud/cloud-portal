import {
  ComDatumapisComputeV1AlphaInstance,
  listComputeDatumapisComV1AlphaNamespacedInstance,
  readComputeDatumapisComV1AlphaNamespacedInstanceStatus,
} from '@/modules/control-plane/compute';
import { IInstanceControlResponse } from '@/resources/interfaces/workload.interface';
import { CustomError } from '@/utils/errorHandle';
import { transformControlPlaneStatus } from '@/utils/misc';
import { Client } from '@hey-api/client-axios';

export const createInstancesControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL;

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

      return response.data?.items?.map(transform) ?? [];
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

      return transformControlPlaneStatus(response.data.status);
    },
  };
};

export type InstancesControl = ReturnType<typeof createInstancesControl>;
