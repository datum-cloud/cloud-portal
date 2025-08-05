import { paths } from '@/config/paths';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { deletedWorkloadIdsCookie } from '@/modules/cookie/workload.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext } from 'react-router';

export const ROUTE_PATH = '/api/workloads/actions' as const;

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client);

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData());
      const { workloadId, projectId, orgId } = formData;
      await workloadsControl.delete(projectId as string, workloadId as string);

      // Get the last deleted workloadIds
      const cookieValue = await deletedWorkloadIdsCookie.parse(request.headers.get('Cookie'));
      const deletedIds = Array.isArray(cookieValue) ? cookieValue : [];

      // Add the new ID if it doesn't exist already
      if (!deletedIds.includes(workloadId as string)) {
        deletedIds.push(workloadId as string);
      }

      return redirectWithToast(
        getPathWithParams(paths.projects.deploy.workloads.root, {
          orgId: orgId as string,
          projectId: projectId as string,
        }),
        {
          title: 'Workload deleted successfully',
          description: 'The workload has been deleted successfully',
          type: 'success',
        },
        {
          headers: {
            'Set-Cookie': await deletedWorkloadIdsCookie.serialize(deletedIds),
          },
        }
      );
    }
    default:
      throw new CustomError('Method not allowed', 405);
  }
}, authMiddleware);
