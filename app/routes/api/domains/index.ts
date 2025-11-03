import { createDomainsControl } from '@/resources/control-plane';
import { redirectWithToast } from '@/utils/cookies';
import { HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/domains' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  try {
    const domainsControl = createDomainsControl(controlPlaneClient as Client);

    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, projectId, redirectUri } = formData;

        await domainsControl.delete(projectId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Domain deleted successfully',
            description: 'The domain has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'Domain deleted successfully' }, { status: 200 });
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
