import { createHttpProxiesControl } from '@/resources/control-plane';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs } from 'react-router';

export const ROUTE_PATH = '/api/httpproxy/:id' as const;

export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  const { id } = params;

  if (!id) {
    throw new BadRequestError('Proxy ID is required');
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

  const httpProxy = await httpProxiesControl.detail(projectId, id);

  return httpProxy;
};
