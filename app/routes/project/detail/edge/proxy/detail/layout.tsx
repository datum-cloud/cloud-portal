import {
  createHttpProxyService,
  type HttpProxy,
  useHydrateHttpProxy,
  useHttpProxyWatch,
} from '@/resources/http-proxies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  Outlet,
  data,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (loaderData: HttpProxy) => <span>{loaderData?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const httpProxy = loaderData as HttpProxy;
  return metaObject(httpProxy?.name || 'Proxy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, proxyId } = params;
  const { controlPlaneClient, requestId } = context as AppLoadContext;

  if (!projectId || !proxyId) {
    throw new BadRequestError('Project ID and proxy ID are required');
  }

  const httpProxyService = createHttpProxyService({ controlPlaneClient, requestId });

  const httpProxy = await httpProxyService.get(projectId, proxyId);

  if (!httpProxy) {
    throw new NotFoundError('Proxy not found');
  }

  return data(httpProxy);
};

export default function HttpProxyDetailLayout() {
  const { projectId, proxyId } = useParams();
  const httpProxy = useLoaderData<typeof loader>();

  // Hydrate cache with SSR data
  useHydrateHttpProxy(projectId ?? '', proxyId ?? '', httpProxy);

  // Enable watch for real-time updates
  useHttpProxyWatch(projectId ?? '', proxyId ?? '');

  return <Outlet />;
}
