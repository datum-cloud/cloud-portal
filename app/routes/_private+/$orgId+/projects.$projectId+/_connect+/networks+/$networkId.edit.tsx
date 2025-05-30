import { routes } from '@/constants/routes';
import { NetworkForm } from '@/features/network/form';
import { createNetworksControl } from '@/resources/control-plane/networks.control';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(({ data }) => {
  return metaObject(`Edit ${(data as INetworkControlResponse)?.name || 'Network'}`);
});

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

export default function EditNetwork() {
  const network = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { orgId, projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <NetworkForm
        projectId={projectId}
        defaultValue={network}
        onSuccess={() => {
          navigate(
            getPathWithParams(routes.projects.connect.networks.root, {
              orgId,
              projectId,
            })
          );
        }}
      />
    </div>
  );
}
