import { ProxyAlgorithmSelect } from '@/features/edge/proxy/backends/algorithm-select';
import {
  ProxyBackendDialog,
  type ProxyBackendDialogRef,
} from '@/features/edge/proxy/backends/backend-dialog';
import { BackendsCard } from '@/features/edge/proxy/backends/backends-table';
import {
  ProxyRouteDialog,
  type ProxyRouteDialogRef,
} from '@/features/edge/proxy/backends/route-dialog';
import { displayRoutes } from '@/features/edge/proxy/backends/target';
import { TrafficDistributionCard } from '@/features/edge/proxy/backends/traffic-distribution';
import { showMutationErrorToast } from '@/modules/quota';
import { useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import {
  useHttpProxy,
  useUpdateProxyRoutes,
  type HttpProxy,
  type ProxyBackend,
  type ProxyRoute,
} from '@/resources/http-proxies';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PlusIcon } from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import { useParams, type MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Backends</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Backends'));

export default function HttpProxyBackendsPage() {
  const { data: loaderProxy } = useGuardedRouteData<HttpProxy, Record<string, never>>(
    'proxy-detail'
  );
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();

  // The detail layout owns the watch and the provisioning poll, so this tab
  // only reads the cache it keeps current.
  const { data: liveProxy } = useHttpProxy(projectId, proxyId, {
    initialData: loaderProxy,
    staleTime: QUERY_STALE_TIME,
  });
  const proxy = liveProxy ?? loaderProxy;

  // The writes here are merge-patches, and every PermissionButton in this
  // feature gates on `patch` — gating the surrounding UI on anything else
  // would show controls the write itself is not allowed to use.
  const { canPatch } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['patch'],
  });

  const backendDialogRef = useRef<ProxyBackendDialogRef>(null);
  const routeDialogRef = useRef<ProxyRouteDialogRef>(null);
  /** Which route the open backend dialog is acting on. */
  const [targetRouteKey, setTargetRouteKey] = useState<string>();

  const updateRoutes = useUpdateProxyRoutes(projectId, proxyId);

  const routes = useMemo(() => displayRoutes(proxy?.routes), [proxy?.routes]);
  const allRoutes = proxy?.routes ?? [];

  if (!proxy) throw new NotFoundError('Application Load Balancer', proxyId);

  // One route matching everything is the ordinary shape, and it reads as a
  // single pool: no path chips, no per-route menu, and the primary action in
  // the page header is about backends rather than routes.
  const solePool = routes.length === 1 && (routes[0].path ?? '/') === '/';
  const routesWithBackends = routes.filter((r) => r.backends.length > 0).length;

  /** Persist a new route list, reporting failures the way the cards do. */
  const save = async (next: ProxyRoute[], successMessage: string) => {
    try {
      // Carry the routes this tab does not display — the synthesized redirect
      // rule — so the writer sees the full picture.
      const hidden = allRoutes.filter((r) => r.isRedirect);
      await updateRoutes.mutateAsync([...hidden, ...next]);
      toast.success('Application Load Balancer', { description: successMessage });
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to update backends',
        scope: 'project',
        projectId,
      });
    }
  };

  const replaceRoute = (key: string, next: ProxyRoute) =>
    routes.map((r) => (r.key === key ? next : r));

  const handleBackendSubmit = async (backend: ProxyBackend, original?: ProxyBackend) => {
    const route = routes.find((r) => r.key === targetRouteKey);
    if (!route) return;

    const backends = original
      ? route.backends.map((b) => (b.key === original.key ? backend : b))
      : [...route.backends, backend];

    await save(
      replaceRoute(route.key, { ...route, backends }),
      original ? 'Backend updated' : 'Backend added'
    );
  };

  const handleRemoveBackend = (route: ProxyRoute, backend: ProxyBackend) =>
    void save(
      replaceRoute(route.key, {
        ...route,
        backends: route.backends.filter((b) => b.key !== backend.key),
      }),
      'Backend removed'
    );

  const handleRouteSubmit = async (
    values: { path: string; pathType: ProxyRoute['pathType'] },
    original?: ProxyRoute
  ) => {
    if (original) {
      await save(replaceRoute(original.key, { ...original, ...values }), 'Route updated');
      return;
    }

    await save(
      [
        ...routes,
        {
          key: `new:${Date.now()}`,
          // No rule to splice onto: the writer treats this as an addition.
          ruleIndex: -1,
          path: values.path,
          pathType: values.pathType,
          isRedirect: false,
          readOnly: false,
          backends: [],
        },
      ],
      'Route added'
    );
  };

  const handleDeleteRoute = (route: ProxyRoute) =>
    void save(
      routes.filter((r) => r.key !== route.key),
      'Route deleted'
    );

  const openAddBackend = (route: ProxyRoute) => {
    setTargetRouteKey(route.key);
    backendDialogRef.current?.show();
  };

  return (
    <div className="flex flex-col gap-6" data-e2e="alb-backends-tab">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold">Backend pool</h2>
          <p className="text-muted-foreground text-sm">
            {routes.reduce((n, r) => n + r.backends.length, 0)} backends
            {routes.length > 1 ? ` across ${routes.length} routes` : ' in pool'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ProxyAlgorithmSelect proxy={proxy} projectId={projectId} canEdit={!!canPatch} />
          {canPatch && routes.length > 0 ? (
            solePool ? (
              <Button
                type="primary"
                className="h-12"
                onClick={() => openAddBackend(routes[0])}
                data-e2e="alb-add-backend-primary">
                <Icon icon={PlusIcon} size={14} />
                Add backend
              </Button>
            ) : (
              <Button
                type="primary"
                className="h-12"
                onClick={() => routeDialogRef.current?.show()}
                data-e2e="alb-add-route">
                <Icon icon={PlusIcon} size={14} />
                Add route
              </Button>
            )
          ) : null}
        </div>
      </section>

      {routes.length === 0 ? (
        <EmptyContent
          variant="dashed"
          title="No routes"
          subtitle="This load balancer has no routes, so it has nowhere to send traffic."
          actions={
            canPatch
              ? [
                  {
                    label: 'Add route',
                    as: 'button',
                    onClick: () => routeDialogRef.current?.show(),
                  },
                ]
              : []
          }
        />
      ) : (
        <>
          {routes.map((route) => (
            <Fragment key={route.key}>
              <TrafficDistributionCard route={route} showPath={!solePool} />
              <BackendsCard
                route={route}
                projectId={projectId}
                canEdit={!!canPatch}
                showPath={!solePool}
                // Removing the last route with backends would leave the load
                // balancer with nowhere to send traffic.
                canDeleteRoute={route.backends.length === 0 || routesWithBackends > 1}
                onAddBackend={openAddBackend}
                onEditBackend={(r, backend) => {
                  setTargetRouteKey(r.key);
                  backendDialogRef.current?.show(backend);
                }}
                onRemoveBackend={handleRemoveBackend}
                onEditRoute={(r) => routeDialogRef.current?.show(r)}
                onDeleteRoute={handleDeleteRoute}
              />
            </Fragment>
          ))}
        </>
      )}

      <ProxyBackendDialog
        ref={backendDialogRef}
        projectId={projectId}
        onSubmit={handleBackendSubmit}
        saving={updateRoutes.isPending}
      />
      <ProxyRouteDialog
        ref={routeDialogRef}
        routes={routes}
        onSubmit={handleRouteSubmit}
        saving={updateRoutes.isPending}
      />
    </div>
  );
}
