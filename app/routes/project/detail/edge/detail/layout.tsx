import { type SubNavigationTab } from '@/components/sub-navigation';
import { ProxyHeaderActions } from '@/features/edge/proxy/proxy-header-actions';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { createHttpProxyService, httpProxyKeys, type HttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useParams } from 'react-router';

const route = defineResourceRoute<HttpProxy>({
  type: 'detail',
  resource: 'httpproxies',
  paramName: 'proxyId',
  notFoundLabel: 'AI Edge',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this AI Edge.",
  breadcrumb: ({ data }) => <span>{data?.name ?? 'AI Edge'}</span>,
  metaTitle: ({ data }) => data?.name ?? 'Proxy',
  seedCache: ({ data, projectId, id }) => [[httpProxyKeys.detail(projectId, id), data]] as never,
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<HttpProxy, Record<string, never>>(args, {
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    paramName: 'proxyId',
    notFoundLabel: 'AI Edge',
    fetch: ({ projectId, id }) => createHttpProxyService().get(projectId!, id),
  });
export const handle = route.handle;
export const meta = route.meta;

export default route.Page(({ data: proxy }) => {
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
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
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.proxy.detail.activity, {
          projectId,
          proxyId: id,
        }),
      },
    ];
  }, [projectId, proxyId, proxy?.name]);

  return (
    <SubLayout
      title={proxy.chosenName || proxy?.name}
      actions={<ProxyHeaderActions projectId={projectId} proxy={proxy} />}
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
});
