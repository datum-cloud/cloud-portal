import { routes } from '@/constants/routes';
import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { redirectWithToast } from '@/utils/cookies/toast';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
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
        getPathWithParams(routes.projects.connect.gateways.root, {
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
      throw new Error('Method not allowed');
  }
}, authMiddleware);
