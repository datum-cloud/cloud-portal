import { routes } from '@/constants/routes';
import { NetworkForm } from '@/features/network/form';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import {
  MetaFunction, useNavigate,
  useParams,
  useRouteLoaderData
} from 'react-router';

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find(
    (match) =>
      match.id ===
      "routes/_private+/$orgId+/projects.$projectId+/_connect+/networks+/$networkId+/_layout"
  ) as any;

  const network = match.data;
  return metaObject(`Manage ${(network as INetworkControlResponse)?.name || 'Network'}`);
});

export default function NetworkEditPage() {
  const network = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_connect+/networks+/$networkId+/_layout'
  );
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
