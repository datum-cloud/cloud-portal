import { dataWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createInstancesControl } from '@/resources/control-plane/instances.control';
import { createWorkloadDeploymentsControl } from '@/resources/control-plane/workload-deployments.control';
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control';
import { CustomError } from '@/utils/errorHandle';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/workloads/status' as const;

export const loader = withMiddleware(async ({ request, context }) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;

    const workloadsControl = createWorkloadsControl(controlPlaneClient as Client);
    const workloadDeploymentsControl = createWorkloadDeploymentsControl(
      controlPlaneClient as Client
    );
    const instancesControl = createInstancesControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const projectId = url.searchParams.get('projectId');
    const id = url.searchParams.get('id');

    if (!projectId || !id) {
      throw new CustomError('Project ID and ID are required', 400);
    }

    if (type === 'deployment') {
      const status = await workloadDeploymentsControl.getStatus(projectId, id);
      return data(status);
    } else if (type === 'workload') {
      const status = await workloadsControl.getStatus(projectId, id);
      return data(status);
    } else if (type === 'instance') {
      const status = await instancesControl.getStatus(projectId, id);
      return data(status);
    }

    return dataWithToast(null, {
      title: 'Invalid workload type',
      description: 'Please try again later',
      type: 'error',
    });
  } catch (error) {
    return data(null);
  }
}, authMiddleware);
