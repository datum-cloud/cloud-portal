import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs } from 'react-router';

export const ROUTE_PATH = '/api/edge/httpproxy/:proxyId' as const;

export const loader = withMiddleware(async ({ params, context, request }: LoaderFunctionArgs) => {
  const { proxyId } = params;

  if (!proxyId) {
    throw new CustomError('Proxy ID is required', 400);
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

  const httpProxy = await httpProxiesControl.detail(projectId, proxyId);

  return httpProxy;
}, authMiddleware);
