import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { type HttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components/sidebar';
import { useMemo } from 'react';
import { Outlet, useParams, useRouteLoaderData } from 'react-router';

export default function HttpProxyDetailLayout() {
  const httpProxy = useRouteLoaderData('proxy-detail') as HttpProxy | undefined;
  const { projectId } = useParams();

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.proxy.detail.overview, {
          projectId,
          proxyId: httpProxy?.name ?? '',
        }),
        type: 'link',
      },
      {
        title: 'Metrics',
        href: getPathWithParams(paths.project.detail.proxy.detail.metrics, {
          projectId,
          proxyId: httpProxy?.name ?? '',
        }),
        type: 'link',
      },
    ];
  }, [projectId, httpProxy]);

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            to={getPathWithParams(paths.project.detail.proxy.root, {
              projectId,
            })}>
            Back to Proxy
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage Proxy</span>
        </div>
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
