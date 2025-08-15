import { redirectWithToast } from '@/modules/cookie/toast.server';
import { deletedWorkloadIdsCookie } from '@/modules/cookie/workload.server';
import { createInstancesControl } from '@/resources/control-plane/instances.control';
import { createWorkloadDeploymentsControl } from '@/resources/control-plane/workload-deployments.control';
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/workloads' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client);
  const workloadDeploymentsControl = createWorkloadDeploymentsControl(controlPlaneClient as Client);
  const instancesControl = createInstancesControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const id = url.searchParams.get('id');
  const type = url.searchParams.get('type');

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  // Handle status fetching
  if (id && type) {
    try {
      let status;
      if (type === 'deployment') {
        status = await workloadDeploymentsControl.getStatus(projectId, id);
      } else if (type === 'workload') {
        status = await workloadsControl.getStatus(projectId, id);
      } else if (type === 'instance') {
        status = await instancesControl.getStatus(projectId, id);
      } else {
        throw new CustomError('Invalid workload type', 400);
      }
      return data({ success: true, data: status }, { status: 200 });
    } catch (error: any) {
      return data({ success: false, error: error.message }, { status: error.status || 500 });
    }
  }

  // Handle listing workloads
  try {
    const workloads = await workloadsControl.list(projectId);
    const cookieValue = await deletedWorkloadIdsCookie.parse(request.headers.get('Cookie'));

    let deletedIds: string[] = [];
    if (Array.isArray(cookieValue) && cookieValue.length > 0) {
      const workloadNames = new Set(workloads.map((w) => w.name));
      deletedIds = cookieValue.filter((id) => workloadNames.has(id));
    }

    return data(
      { success: true, data: { workloads, deletedIds } },
      {
        status: 200,
        headers: {
          'Set-Cookie': await deletedWorkloadIdsCookie.serialize(deletedIds),
        },
      }
    );
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status || 500 });
  }
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { workloadId, projectId, redirectUri } = formData;

        if (typeof workloadId !== 'string' || typeof projectId !== 'string') {
          throw new CustomError('Invalid request body', 400);
        }

        await workloadsControl.delete(projectId, workloadId);

        const cookieValue = await deletedWorkloadIdsCookie.parse(request.headers.get('Cookie'));
        const deletedIds = Array.isArray(cookieValue) ? cookieValue : [];

        if (!deletedIds.includes(workloadId)) {
          deletedIds.push(workloadId);
        }

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Workload deleted successfully',
            description: 'The workload has been deleted successfully',
            type: 'success',
          });
        }

        return data(
          { success: true, message: 'Workload deleted successfully' },
          {
            status: 200,
            headers: {
              'Set-Cookie': await deletedWorkloadIdsCookie.serialize(deletedIds),
            },
          }
        );
      }
      default:
        throw new CustomError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status || 500 });
  }
};
