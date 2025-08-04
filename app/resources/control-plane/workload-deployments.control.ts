import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import {
  ComDatumapisComputeV1AlphaWorkloadDeployment,
  ComDatumapisComputeV1AlphaWorkloadDeploymentList,
  listComputeDatumapisComV1AlphaNamespacedWorkloadDeployment,
  readComputeDatumapisComV1AlphaNamespacedWorkloadDeploymentStatus,
} from '@/modules/control-plane/compute';
import { IWorkloadDeploymentControlResponse } from '@/resources/interfaces/workload.interface';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';

export const createWorkloadDeploymentsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transform = (
    workload: ComDatumapisComputeV1AlphaWorkloadDeployment
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
    };
  };

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
      });

      const deployments = response.data as ComDatumapisComputeV1AlphaWorkloadDeploymentList;

      return deployments.items.map(transform);
    },
    getStatus: async (projectId: string, deploymentId: string) => {
      const response = await readComputeDatumapisComV1AlphaNamespacedWorkloadDeploymentStatus({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: deploymentId },
      });

      if (!response.data) {
        throw new CustomError(`Workload deployment ${deploymentId} not found`, 404);
      }

      const deployment = response.data as ComDatumapisComputeV1AlphaWorkloadDeployment;

      return transformControlPlaneStatus(deployment.status);
    },
  };
};

export type WorkloadDeploymentsControl = ReturnType<typeof createWorkloadDeploymentsControl>;
