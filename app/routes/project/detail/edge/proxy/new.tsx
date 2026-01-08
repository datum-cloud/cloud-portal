import { HttpProxyForm } from '@/features/edge/proxy/form';
import { HttpProxyPreview } from '@/features/edge/proxy/preview';
import { useCreateHttpProxy, type HttpProxy } from '@/resources/http-proxies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { toast } from '@datum-ui/components';
import { useState } from 'react';
import { MetaFunction, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Proxy');
});

export default function HttpProxyNewPage() {
  const { projectId } = useParams();
  const [createdProxy, setCreatedProxy] = useState<HttpProxy | null>(null);

  const createProxy = useCreateHttpProxy(projectId ?? '', {
    onSuccess: (proxy) => {
      setCreatedProxy(proxy);
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message || 'Failed to create proxy',
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      {createdProxy?.uid ? (
        <HttpProxyPreview data={createdProxy} projectId={projectId} />
      ) : (
        <HttpProxyForm
          projectId={projectId}
          onSubmit={(data) => createProxy.mutate(data)}
          isPending={createProxy.isPending}
        />
      )}
    </div>
  );
}
