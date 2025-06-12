import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { CustomError } from '@/utils/errorHandle';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/connect/gateways/list' as const;

export const loader = withMiddleware(async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  // Fetch fresh networks from control plane
  const gateways = await gatewaysControl.list(projectId);

  return data(gateways);
}, authMiddleware);
