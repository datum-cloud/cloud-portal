import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createEndpointSlicesControl } from '@/resources/control-plane/endpoint-slices.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/endpoint-slices' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const endpointSlicesControl = createEndpointSlicesControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const noCache = url.searchParams.get('noCache');

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const key = `endpoint-slices:${projectId}`;

  // Try to get cached networks if caching is enabled
  const [isCached, cachedEndpointSlices] = await Promise.all([
    !noCache && cache.hasItem(key),
    !noCache && cache.getItem(key),
  ]);

  // Return cached networks if available and caching is enabled
  if (isCached && cachedEndpointSlices) {
    return data({ success: true, data: cachedEndpointSlices }, { status: 200 });
  }

  // Fetch fresh networks from control plane
  const endpointSlices = await endpointSlicesControl.list(projectId);

  // Cache the fresh networks if caching is enabled
  await cache.setItem(key, endpointSlices).catch((error) => {
    console.error('Failed to cache endpoint slices:', error);
  });
  return data({ success: true, data: endpointSlices }, { status: 200 });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const endpointSlicesControl = createEndpointSlicesControl(controlPlaneClient as Client);

  try {
    switch (request.method) {
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { id, projectId, redirectUri } = formData;

        await endpointSlicesControl.delete(projectId as string, id as string);

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: 'Endpoint slice deleted successfully',
            description: 'The endpoint slice has been deleted successfully',
            type: 'success',
          });
        }

        return data(
          { success: true, message: 'Endpoint slice deleted successfully' },
          { status: 200 }
        );
      }
      default:
        throw new CustomError('Method not allowed', 405);
    }
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
