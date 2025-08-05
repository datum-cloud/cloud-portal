import { paths } from '@/config/paths';
import { HttpProxyForm } from '@/features/edge/httpproxy/form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { httpProxySchema } from '@/resources/schemas/http-proxy.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import {
  MetaFunction,
  AppLoadContext,
  useRouteLoaderData,
  useParams,
  ActionFunctionArgs,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export const action = async ({ params, context, request }: ActionFunctionArgs) => {
  const { projectId, proxyId } = params;

  if (!projectId || !proxyId) {
    throw new Error('Project ID and proxy ID are required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: httpProxySchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

    const dryRunRes = await httpProxiesControl.update(projectId, proxyId, parsed.value, true);

    if (dryRunRes) {
      await httpProxiesControl.update(projectId, proxyId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(paths.project.detail.httpProxy.root, {
        projectId,
      }),
      {
        title: 'HTTPProxy updated successfully',
        description: 'You have successfully updated an HTTPProxy.',
        type: 'success',
      }
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'httpproxy-detail') as any;

  const httpProxy = match.data;
  return metaObject((httpProxy as IHttpProxyControlResponse)?.name || 'HTTPProxy');
});

export default function HttpProxyEditPage() {
  const httpProxy = useRouteLoaderData('httpproxy-detail');

  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <HttpProxyForm projectId={projectId} defaultValue={httpProxy} />
    </div>
  );
}
