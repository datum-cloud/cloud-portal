import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createHttpRoutesControl } from '@/resources/control-plane/http-routes.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/http-routes' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const httpRoutesControl = createHttpRoutesControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, projectId, redirectUri } = formData;

        await httpRoutesControl.delete(projectId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'HTTP route deleted successfully',
            description: 'The HTTP route has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'HTTP route deleted successfully' }, { status: 200 });
      }
      default:
        throw new CustomError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
