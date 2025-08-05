import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/httpproxy' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  try {
    const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, projectId, redirectUri } = formData;

        await httpProxiesControl.delete(projectId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'HTTPProxy deleted successfully',
            description: 'The HTTPProxy has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'HTTPProxy deleted successfully' }, { status: 200 });
      }
      default:
        throw new CustomError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
