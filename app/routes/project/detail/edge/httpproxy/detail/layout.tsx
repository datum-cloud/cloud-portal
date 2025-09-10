import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, MetaFunction, Outlet, data } from 'react-router';

export const handle = {
  breadcrumb: (data: IHttpProxyControlResponse) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  const { httpProxy } = data as any;
  return metaObject((httpProxy as IHttpProxyControlResponse)?.name || 'HTTPProxy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, proxyId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !proxyId) {
    throw new BadRequestError('Project ID and proxy ID are required');
  }

  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

  const httpProxy = await httpProxiesControl.detail(projectId, proxyId);

  if (!httpProxy) {
    throw new NotFoundError('HTTPProxy not found');
  }

  return data(httpProxy);
};

export default function HttpProxyDetailLayout() {
  return <Outlet />;
}
