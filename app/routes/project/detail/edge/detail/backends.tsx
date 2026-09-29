import { AlgorithmMenu } from '@/features/edge/proxy/backends/algorithm-menu';
import {
  BackendFormDialog,
  type BackendFormDialogRef,
} from '@/features/edge/proxy/backends/backend-form-dialog';
import {
  addBackendBlockReason,
  hostOverrideConflict,
  poolLockReason,
  toBackendRows,
} from '@/features/edge/proxy/backends/backend-pool';
import { HttpProxyBackendsTableCard } from '@/features/edge/proxy/backends/backends-table-card';
import { HttpProxyHealthChecksCard } from '@/features/edge/proxy/backends/health-checks-card';
import { HttpProxyPoolStats } from '@/features/edge/proxy/backends/pool-stats';
import { HttpProxyTrafficDistributionCard } from '@/features/edge/proxy/backends/traffic-distribution-card';
import { useAlbTrafficPresence } from '@/features/edge/proxy/overview/use-alb-traffic-presence';
import { useResolvedComputeWorkload } from '@/features/edge/proxy/overview/use-network-service';
import { PermissionButton, useGuardedRouteData, usePermission } from '@/modules/rbac';
import { type HttpProxy, useHttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { InfoIcon, PlusIcon, ServerIcon, TriangleAlertIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Link, useParams, type MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Backends</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Backends'));

const EDIT_DENIED = "You don't have permission to edit this Application Load Balancer";

/**
 * The ALB's backend pool: where requests go, how they're split by weight,
 * the algorithm, and passive health checking. Everything here is read from
 * and written to the HTTPProxy spec; Envoy doesn't report per-backend health
 * or traffic yet, so shares are the configured split rather than measured.
 */
export default function HttpProxyBackendsPage() {
  const { data: proxy } = useGuardedRouteData<HttpProxy, Record<string, never>>('proxy-detail');
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const dialogRef = useRef<BackendFormDialogRef>(null);

  const { data: httpProxy } = useHttpProxy(projectId, proxyId, {
    initialData: proxy,
    staleTime: QUERY_STALE_TIME,
  });
  const current = httpProxy ?? proxy;

  const computeBackend = useResolvedComputeWorkload(projectId, current);
  const traffic = useAlbTrafficPresence(projectId, current?.name ?? proxyId);
  const { hasPermission: canPatch, isLoading: permLoading } = usePermission(
    'httpproxies',
    'patch',
    {
      group: 'networking.datumapis.com',
      namespace: 'default',
      scope: 'project',
      projectId,
      enabled: !!projectId,
    }
  );

  const rows = useMemo(() => toBackendRows(current?.backends), [current?.backends]);

  if (!current) throw new NotFoundError('Application Load Balancer', proxyId);

  // A compute-labelled proxy is reconciled by its workload; once the workload
  // is gone the pool is the user's again.
  const computeManaged = !!current.workloadName && !computeBackend.workloadMissing;
  const lockReason = poolLockReason(current, computeManaged);
  const addBlocked = lockReason ?? addBackendBlockReason(current);
  const configurationHref = getPathWithParams(paths.project.detail.proxy.detail.configuration, {
    projectId,
    proxyId,
  });

  const addButton = (
    <PermissionButton
      resource="httpproxies"
      verb="patch"
      group="networking.datumapis.com"
      namespace="default"
      scope="project"
      projectId={projectId}
      deniedReason={EDIT_DENIED}
      type="primary"
      className="h-9 shrink-0"
      disabled={!!addBlocked}
      onClick={() => dialogRef.current?.show()}
      data-e2e="alb-add-backend">
      <Icon icon={PlusIcon} size={14} />
      Add backend
    </PermissionButton>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Title as="h2" level={6} weight="semibold">
            Backend pool
          </Title>
          <Text as="p" size="xs" textColor="muted">
            {rows.length === 0
              ? 'No backends yet'
              : `${rows.length} ${rows.length === 1 ? 'backend' : 'backends'} · requests split by weight`}
          </Text>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <AlgorithmMenu
            proxy={current}
            projectId={projectId}
            disabledReason={lockReason ?? (!canPatch && !permLoading ? EDIT_DENIED : undefined)}
          />
          {addBlocked && canPatch ? (
            <Tooltip message={addBlocked} contentClassName="max-w-xs text-pretty">
              <span>{addButton}</span>
            </Tooltip>
          ) : (
            addButton
          )}
        </div>
      </div>

      {lockReason ? (
        <Alert variant="info">
          <InfoIcon className="size-4" />
          <AlertTitle>Backends are read-only here</AlertTitle>
          <AlertDescription>
            {lockReason}
            {computeManaged && computeBackend.href ? (
              <>
                {' '}
                <Link to={computeBackend.href} className="underline">
                  Open workload
                </Link>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {hostOverrideConflict(current) ? (
        <Alert variant="warning">
          <TriangleAlertIcon className="size-4" />
          <AlertTitle>Every backend receives Host: {current.hostHeader}</AlertTitle>
          <AlertDescription>
            A Host header override applies to the whole pool, so origins that route by hostname
            (Vercel, Fly.io, Netlify and most SaaS hosts) may answer each other’s requests with
            404s. Without the override, each origin receives its own hostname.{' '}
            <Link to={`${configurationHref}#general`} className="underline">
              Review the override
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <HttpProxyPoolStats proxy={current} projectId={projectId} rows={rows} idle={traffic.idle} />

      {rows.length === 0 ? (
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon icon={ServerIcon} size={20} className="text-muted-foreground" />
            <Text weight="medium">No backends configured</Text>
            <Text size="xs" textColor="muted" className="max-w-sm text-pretty">
              Add an origin so this load balancer has somewhere to send traffic.
            </Text>
          </CardContent>
        </Card>
      ) : (
        <>
          <HttpProxyTrafficDistributionCard rows={rows} />
          <HttpProxyBackendsTableCard
            proxy={current}
            projectId={projectId}
            rows={rows}
            lockReason={lockReason}
            onEdit={(row) => dialogRef.current?.show(row)}
          />
        </>
      )}

      <HttpProxyHealthChecksCard proxy={current} projectId={projectId} lockReason={lockReason} />

      <BackendFormDialog ref={dialogRef} projectId={projectId} proxy={current} />
    </div>
  );
}
