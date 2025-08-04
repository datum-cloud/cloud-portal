import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { CustomError } from '@/utils/error';
import { mergeMeta, metaObject } from '@/utils/meta';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, data, MetaFunction } from 'react-router';

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
    throw new CustomError('Project ID and proxy ID are required', 400);
  }

  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

  const httpProxy = await httpProxiesControl.detail(projectId, proxyId);

  if (!httpProxy) {
    throw new CustomError('HTTPProxy not found', 404);
  }

  return data(httpProxy);
};
