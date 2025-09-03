import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/gateways' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const noCache = url.searchParams.get('noCache');

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const key = `gateways:${projectId}`;

  const [isCached, cachedGateways] = await Promise.all([
    !noCache && cache.hasItem(key),
    !noCache && cache.getItem(key),
  ]);

  if (isCached && cachedGateways) {
    return data({ success: true, data: cachedGateways }, { status: 200 });
  }

  const gateways = await gatewaysControl.list(projectId);

  await cache.setItem(key, gateways).catch((error) => {
    console.error('Failed to cache gateways:', error);
  });
  return data({ success: true, data: gateways }, { status: 200 });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, projectId, redirectUri } = formData;

        await gatewaysControl.delete(projectId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Gateway deleted successfully',
            description: 'The gateway has been deleted successfully',
            type: 'success',
          });
        }

        return data({ success: true, message: 'Gateway deleted successfully' }, { status: 200 });
      }
      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
