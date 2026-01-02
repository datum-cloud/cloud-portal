import { HttpProxyForm } from '@/features/edge/proxy/form';
import { useUpdateHttpProxy, type HttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';
import { useRouteLoaderData, useParams, useNavigate } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export default function HttpProxyEditPage() {
  const httpProxy = useRouteLoaderData('proxy-detail') as HttpProxy | undefined;
  const navigate = useNavigate();
  const { projectId, proxyId } = useParams();

  const updateProxy = useUpdateHttpProxy(projectId ?? '', proxyId ?? '', {
    onSuccess: () => {
      toast.success('Proxy', {
        description: 'You have successfully updated the Proxy.',
      });
      navigate(
        getPathWithParams(paths.project.detail.proxy.root, {
          projectId,
        })
      );
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message || 'Failed to update proxy',
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <HttpProxyForm
        projectId={projectId}
        defaultValue={httpProxy}
        onSubmit={(data) =>
          updateProxy.mutate({
            endpoint: data.endpoint,
            hostnames: data.hostnames,
          })
        }
        isPending={updateProxy.isPending}
      />
    </div>
  );
}
