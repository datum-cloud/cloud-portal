import { createNetworksControl } from '@/resources/control-plane/networks.control';
import { CustomError } from '@/utils/errorHandle';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/connect/networks/list' as const;

export const loader = withMiddleware(async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const networksControl = createNetworksControl(controlPlaneClient as Client);

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  // Fetch networks from control plane
  const networks = await networksControl.list(projectId);

  return data(networks);
}, authMiddleware);
