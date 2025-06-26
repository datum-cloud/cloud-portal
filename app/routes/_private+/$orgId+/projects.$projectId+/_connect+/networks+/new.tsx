import { routes } from '@/constants/routes';
import { NetworkForm } from '@/features/network/form';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { MetaFunction, useNavigate, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Network');
});

export default function ConnectNetworksNewPage() {
  const { projectId, orgId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <NetworkForm
        projectId={projectId}
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
