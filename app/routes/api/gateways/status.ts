import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/gateways/:id/status' as const;

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  try {
    const { id, projectId } = params;

    if (!id || !projectId) {
      throw new CustomError('Project ID and Gateway ID are required', 400);
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

    const status = await gatewaysControl.getStatus(projectId, id);
    return data({ success: true, data: status }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
