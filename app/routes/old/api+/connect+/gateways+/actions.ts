import { paths } from '@/config/paths';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext } from 'react-router';

export const ROUTE_PATH = '/api/connect/gateways/actions' as const;

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData());
      const { id, projectId, orgId } = formData;

      await gatewaysControl.delete(projectId as string, id as string);

      return redirectWithToast(
        getPathWithParams(paths.projects.connect.gateways.root, {
          orgId: orgId as string,
          projectId: projectId as string,
        }),
        {
          title: 'Gateway deleted successfully',
          description: 'The gateway has been deleted successfully',
          type: 'success',
        }
      );
    }
    default:
      throw new CustomError('Method not allowed', 405);
  }
}, authMiddleware);
