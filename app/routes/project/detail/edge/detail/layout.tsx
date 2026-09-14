import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import {
  createHttpProxyService,
  httpProxyKeys,
  type HttpProxy,
  useHttpProxy,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { skipRevalidateWithinSameProjectResource } from '@/utils/helpers/revalidate.helper';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useParams } from 'react-router';

const route = defineResourceRoute<HttpProxy>({
  type: 'detail',
  resource: 'httpproxies',
  paramName: 'proxyId',
  notFoundLabel: 'Application Load Balancer',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this Application Load Balancer.",
  breadcrumb: ({ data }) => <span>{data?.name ?? 'ALB'}</span>,
  metaTitle: ({ data }) => data?.name ?? 'Proxy',
  seedCache: ({ data, projectId, id }) => [[httpProxyKeys.detail(projectId, id), data]] as never,
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<HttpProxy, Record<string, never>>(args, {
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    paramName: 'proxyId',
    notFoundLabel: 'Application Load Balancer',
    fetch: ({ projectId, id }) => createHttpProxyService().get(projectId!, id),
  });
export const handle = route.handle;
export const meta = route.meta;

export const shouldRevalidate = skipRevalidateWithinSameProjectResource('proxyId');

export default route.Page(({ data: loaderProxy }) => {
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();

  // The loader snapshot never changes after a mutation (shouldRevalidate skips
  // same-resource navigations), so read the title from the query cache, which
  // update mutations and the watch keep current. Seeded from the loader.
  const { data: liveProxy } = useHttpProxy(projectId, proxyId, {
    initialData: loaderProxy,
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const proxy = liveProxy ?? loaderProxy;

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = proxyId || proxy?.name || '';
    return [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.proxy.detail.overview, {
          projectId,
          proxyId: id,
        }),
      },
      {
        label: 'Configuration',
        href: getPathWithParams(paths.project.detail.proxy.detail.configuration, {
          projectId,
          proxyId: id,
        }),
      },
      {
        label: 'Metrics',
        href: getPathWithParams(paths.project.detail.proxy.detail.metrics, {
          projectId,
          proxyId: id,
        }),
      },
      {
        label: 'Logs',
        href: getPathWithParams(paths.project.detail.proxy.detail.logs, {
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
  }, [projectId, proxyId, proxy?.name]);

  return (
    <SubLayout title={proxy.chosenName || proxy?.name} navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
});
