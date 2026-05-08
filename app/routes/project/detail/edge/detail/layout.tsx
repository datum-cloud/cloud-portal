import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createHttpProxyService, type HttpProxy, useHttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
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

  // Seed cache synchronously with SSR data (eliminates skeleton flash on first render)
  useHttpProxy(projectId ?? '', proxyId ?? '', {
    initialData: httpProxy,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: NavItem[] = useMemo(() => {
    const id = proxyId ?? httpProxy?.name ?? '';
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.proxy.detail.overview, {
          projectId,
          proxyId: id,
        }),
        type: 'link',
      },
      {
        title: 'Activity',
        href: getPathWithParams(paths.project.detail.proxy.detail.activity, {
          projectId,
          proxyId: id,
        }),
        type: 'link',
      },
    ];
  }, [projectId, proxyId, httpProxy?.name]);

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            className="hidden md:flex"
            to={getPathWithParams(paths.project.detail.proxy.root, {
              projectId,
            })}>
            Back to AI Edge
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage AI Edge</span>
        </div>
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
