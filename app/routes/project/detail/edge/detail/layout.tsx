import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { type SubNavigationTab } from '@/components/sub-navigation';
import { ProxyHeaderActions } from '@/features/edge/proxy/proxy-header-actions';
import { SubLayout } from '@/layouts';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
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

type LayoutLoaderData = { restricted: true } | { restricted: false; proxy: HttpProxy };

export const handle = {
  breadcrumb: (loaderData: LayoutLoaderData | undefined) => {
    const name = loaderData && !loaderData.restricted ? loaderData.proxy?.name : undefined;
    return <span>{name ?? 'AI Edge'}</span>;
  },
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const name = loaderData && !loaderData.restricted ? loaderData.proxy?.name : undefined;
  return metaObject(name || 'Proxy');
});

const _loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, proxyId } = params;

  if (!projectId || !proxyId) {
    throw new BadRequestError('Project ID and proxy ID are required');
  }

  // Access gate first — skip the proxy fetch if the user can't view it.
  // For project-scoped checks the control-plane base is resolved from
  // `projectId`; the first arg (organizationId) is unused for this scope.
  const canView = await gateRouteAccess(projectId, {
    resource: 'httpproxies',
    verb: 'get',
    group: 'networking.datumapis.com',
    namespace: 'default',
    scope: 'project',
    projectId,
  });

  if (!canView) {
    return data({ restricted: true as const });
  }

  // Services now use global axios client with AsyncLocalStorage
  const httpProxyService = createHttpProxyService();

  const httpProxy = await httpProxyService.get(projectId, proxyId);

  if (!httpProxy) {
    throw new NotFoundError('AI Edge', proxyId);
  }

  return data({ restricted: false as const, proxy: httpProxy });
};

export const loader = withLoaderErrors(_loader);

export default function HttpProxyDetailLayout() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to view this AI Edge."
      />
    );
  }

  return <HttpProxyDetailLayoutInner proxy={loaderData.proxy} />;
}

function HttpProxyDetailLayoutInner({ proxy }: { proxy: HttpProxy }) {
  const { projectId, proxyId } = useParams();

  // Seed cache synchronously with SSR data (eliminates skeleton flash on first render)
  useHttpProxy(projectId ?? '', proxyId ?? '', {
    initialData: proxy,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = proxyId ?? proxy?.name ?? '';
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
      actions={proxy && <ProxyHeaderActions projectId={projectId ?? ''} proxy={proxy} />}
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
