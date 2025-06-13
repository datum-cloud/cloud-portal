import { createNetworksControl } from '@/resources/control-plane/networks.control';
import { CustomError } from '@/utils/errorHandle';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, Outlet } from 'react-router';

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, networkId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const networksControl = createNetworksControl(controlPlaneClient as Client);

  if (!projectId || !networkId) {
    throw new CustomError('Project ID and network ID are required', 400);
  }

  const network = await networksControl.detail(projectId, networkId);

  return network;
};

export default function NetworkLayoutPage() {
  return <Outlet />;
}
