import { HttpProxyForm } from '@/features/edge/proxy/form';
import { createHttpProxiesControl } from '@/resources/control-plane';
import { httpProxySchema } from '@/resources/schemas/http-proxy.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, redirectWithToast, validateCSRF } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, useRouteLoaderData, useParams, ActionFunctionArgs } from 'react-router';

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
      getPathWithParams(paths.project.detail.proxy.root, {
        projectId,
      }),
      {
        title: 'Proxy updated successfully',
        description: 'You have successfully updated an Proxy.',
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

export default function HttpProxyEditPage() {
  const httpProxy = useRouteLoaderData('proxy-detail');

  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <HttpProxyForm projectId={projectId} defaultValue={httpProxy} />
    </div>
  );
}
