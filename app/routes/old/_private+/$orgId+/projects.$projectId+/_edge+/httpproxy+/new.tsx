import { HttpProxyForm } from '@/features/edge/httpproxy/form';
import { HttpProxyPreview } from '@/features/edge/httpproxy/preview';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { httpProxySchema } from '@/resources/schemas/http-proxy.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  data,
  useActionData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New HTTPProxy');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new Error('Project ID is required');
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

    const dryRunRes = await httpProxiesControl.create(projectId, parsed.value, true);

    let res: IHttpProxyControlResponse = {};
    if (dryRunRes) {
      res = await httpProxiesControl.create(projectId, parsed.value, false);
    }

    return data(res);
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function EdgeHttpProxyNewPage() {
  const { projectId } = useParams();
  const res = useActionData<typeof action>();

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      {res && res?.uid ? (
        <HttpProxyPreview data={res} projectId={projectId} />
      ) : (
        <HttpProxyForm projectId={projectId} />
      )}
    </div>
  );
}
