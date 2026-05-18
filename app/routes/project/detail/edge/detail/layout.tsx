import { type SubNavigationTab } from '@/components/sub-navigation';
import { ProxyHeaderActions } from '@/features/edge/proxy/proxy-header-actions';
import { SubLayout } from '@/layouts';
import { createHttpProxyService, type HttpProxy, useHttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
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

export const loader = withLoaderErrors(async ({ params }: LoaderFunctionArgs) => {
  const { projectId, proxyId } = params;

  if (!projectId || !proxyId) {
    throw new BadRequestError('Project ID and proxy ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const httpProxyService = createHttpProxyService();

  const httpProxy = await httpProxyService.get(projectId, proxyId);

  if (!httpProxy) {
    throw new NotFoundError('AI Edge', proxyId);
  }

  return data(httpProxy);
});

export default function HttpProxyDetailLayout() {
  const { projectId, proxyId } = useParams();
  const httpProxy = useLoaderData<typeof loader>();

  // Seed cache synchronously with SSR data (eliminates skeleton flash on first render)
  useHttpProxy(projectId ?? '', proxyId ?? '', {
    initialData: httpProxy,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = proxyId ?? httpProxy?.name ?? '';
    return [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.proxy.detail.overview, {
          projectId,
          proxyId: id,
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.proxy.detail.activity, {
          projectId,
          proxyId: id,
        }),
      },
    ];
  }, [projectId, proxyId, httpProxy?.name]);

  return (
    <SubLayout
      title={httpProxy?.name}
      actions={httpProxy && <ProxyHeaderActions projectId={projectId ?? ''} proxy={httpProxy} />}
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
