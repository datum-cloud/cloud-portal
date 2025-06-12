import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { CustomError } from '@/utils/errorHandle';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/connect/gateways/status' as const;

export const loader = withMiddleware(async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const gatewayId = url.searchParams.get('id');

    if (!projectId || !gatewayId) {
      throw new CustomError('Project ID and Gateway ID are required', 400);
    }

    const status = await gatewaysControl.getStatus(projectId, gatewayId);
    return data(status);
  } catch {
    return data(null);
  }
}, authMiddleware);
