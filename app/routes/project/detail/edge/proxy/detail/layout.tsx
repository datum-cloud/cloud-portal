import {
  createHttpProxyService,
  type HttpProxy,
  useHydrateHttpProxy,
} from '@/resources/http-proxies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, proxyId } = params;

  if (!projectId || !proxyId) {
    throw new BadRequestError('Project ID and proxy ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const httpProxyService = createHttpProxyService();

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

  return <Outlet />;
}
