import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { ProxySparkline } from '@/features/edge/proxy/metrics/proxy-sparkline';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import { useResourcePermissions, usePermission, PermissionButton } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { ControlPlaneStatus } from '@/resources/base';
import {
  type HttpProxy,
  createHttpProxyService,
  httpProxyKeys,
  useHttpProxies,
  useHttpProxiesWatch,
  useTrafficProtectionPolicies,
  formatWafProtectionDisplay,
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { createProjectListClientLoaderFromQueryKey } from '@/utils/helpers/project-list-client-loader';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon, ShieldCheckIcon, ShieldOffIcon } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { type LoaderFunctionArgs, useNavigate, useParams, useSearchParams } from 'react-router';

const route = defineResourceRoute<HttpProxy[]>({
  type: 'list',
  resource: 'httpproxies',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view AI Edge.",
  metaTitle: 'AI Edge',
  seedCache: ({ data, projectId }) =>
    [[httpProxyKeys.list(projectId), data as HttpProxy[]]] as never,
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<HttpProxy[]>(args, {
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    fetch: ({ projectId }) => createHttpProxyService().list(projectId!),
  });
export const meta = route.meta;

export const shouldRevalidate = skipRevalidateWithinSameProject;

export const clientLoader = createProjectListClientLoaderFromQueryKey<HttpProxy[]>((projectId) =>
  httpProxyKeys.list(projectId)
);

export default route.Page(({ data: initialProxies }) => (
  <HttpProxyInner initialProxies={initialProxies} />
));

function HttpProxyInner({ initialProxies }: { initialProxies: HttpProxy[] }) {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { canCreate, canDelete } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['create', 'delete'],
  });

  // WAF view permission is checked on its own and re-validated on every mount
  // (staleTime 0) so the gate never renders a verdict from a stale cached result.
  // Documented escape hatch from useResourcePermissions — see
  // app/modules/rbac/use-resource-permissions.ts for the per-call freshness note.
  const {
    hasPermission: canViewWaf,
    isLoading: wafPermLoading,
    isFetching: wafPermFetching,
  } = usePermission('trafficprotectionpolicies', 'list', {
    group: 'networking.datumapis.com',
    namespace: 'default',
    scope: 'project',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useHttpProxiesWatch(projectId);

  const { data = initialProxies, isPending } = useHttpProxies(projectId, {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
    initialData: initialProxies,
  });

  // WAF modes are fetched separately, only when viewable, and re-validated on
  // mount so a stale cached map can't drive a wrong "Disabled".
  const {
    data: wafMaps,
    isError: wafError,
    isLoading: wafLoading,
    isFetching: wafFetching,
  } = useTrafficProtectionPolicies(projectId, {
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: canViewWaf,
    retry: false,
  });
  // While the permission check or the WAF fetch is in flight (including mount
  // re-validation) we don't yet know the verdict — show a spinner instead of
  // guessing. Only treat "Disabled" as trustworthy once WAF data has loaded.
  const wafPending =
    wafPermLoading || wafPermFetching || (canViewWaf && (wafLoading || wafFetching));
  const wafReady = canViewWaf && !wafError && !wafLoading && !!wafMaps;

  const proxyFormRef = useRef<HttpProxyFormDialogRef>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      if (canCreate) {
        proxyFormRef.current?.show();
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, canCreate]);

  const { confirmDelete } = useDeleteProxy(projectId, {
    onError: (error) => {
      toast.error(error.message || 'Failed to delete AI Edge');
    },
  });

  const columns: ColumnDef<HttpProxy>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'chosenName',
        meta: { className: 'min-w-32' },
        cell: ({ row }) => {
          return (
            <div data-e2e="ai-edge-card">
              <Tooltip message={row.original.name || row.original.chosenName}>
                <span className="font-medium" data-e2e="ai-edge-name">
                  {row.original.chosenName || row.original.name}
                </span>
              </Tooltip>
            </div>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          if (!row.original.status) return null;
          const transformedStatus = transformControlPlaneStatus(row.original.status);
          const certCondition = getCertificatesReadyCondition(row.original?.status);
          const certDisplay = getCertificatesReadyDisplay(certCondition);
          return (
            <div className="flex items-center gap-2">
              <BadgeStatus
                status={transformedStatus}
                label={
                  transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined
                }
              />
              {certDisplay === 'ready' && (
                <Tooltip
                  message="All hostnames have valid TLS certificates and are secure"
                  side="top"
                  contentClassName="max-w-xs text-wrap">
                  <span className="text-primary inline-flex items-center">
                    <Icon icon={ShieldCheckIcon} size={18} className="shrink-0" />
                  </span>
                </Tooltip>
              )}
              {(certDisplay === 'pending' || certDisplay === 'failed') && (
                <Tooltip
                  message={
                    certCondition?.message ||
                    'One or more hostnames do not have a valid TLS certificate yet'
                  }
                  side="top"
                  contentClassName="max-w-xs text-wrap">
                  <span className="text-destructive inline-flex items-center">
                    <Icon icon={ShieldOffIcon} size={16} className="shrink-0" />
                  </span>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        header: 'Edge Activity',
        accessorKey: 'activity',
        enableSorting: false,
        meta: { tooltip: 'Traffic activity over the last hour to this edge' },
        cell: ({ row }) => {
          return <ProxySparkline projectId={projectId} proxyId={row.original.name} />;
        },
      },
      {
        header: 'Origin',
        accessorKey: 'origin',
        meta: { tooltip: 'Upstream origin URL' },
        cell: ({ row }) => {
          return row.original.endpoint;
        },
      },
      {
        header: 'Hostnames',
        accessorKey: 'hostnames',
        meta: { tooltip: 'Verified hostnames that are pointing to your origin' },
        cell: ({ row }) => {
          const hostnames = row.original.status?.hostnames;
          const hasMultipleHostnames = (hostnames?.length ?? 0) > 1;
          return (
            <div className="flex gap-2">
              {hostnames?.map((hostname: string) => (
                <BadgeCopy
                  key={hostname}
                  value={`https://${hostname}`}
                  text={hostname}
                  badgeTheme="solid"
                  badgeType="muted"
                  textClassName={hasMultipleHostnames ? 'max-w-[10rem] truncate' : undefined}
                  showTooltip={false}
                  wrapperTooltipMessage={hostname}
                />
              ))}
            </div>
          );
        },
      },
      {
        header: 'Protection',
        accessorKey: 'trafficProtectionMode',
        meta: { tooltip: 'What level of WAF protection is applied to this Edge' },
        cell: ({ row }) => {
          // Still resolving permissions or WAF data — show a spinner, not a verdict.
          if (wafPending) {
            return (
              <div className="flex items-center px-1">
                <SpinnerIcon size="sm" />
              </div>
            );
          }
          if (!canViewWaf) {
            return (
              <Tooltip message="You don't have permission to view WAF protection">
                <Badge
                  type="quaternary"
                  theme="outline"
                  className="text-muted-foreground rounded-xl text-xs font-normal">
                  &mdash;
                </Badge>
              </Tooltip>
            );
          }
          // WAF fetch failed — don't imply "Disabled".
          if (!wafReady) {
            return (
              <Badge
                type="quaternary"
                theme="outline"
                className="text-muted-foreground rounded-xl text-xs font-normal">
                &mdash;
              </Badge>
            );
          }
          const name = row.original.name;
          const proxyWithWaf: HttpProxy = {
            ...row.original,
            trafficProtectionMode: wafMaps.modeByName.get(name),
            paranoiaLevels: wafMaps.paranoiaByName.get(name),
          };
          return (
            <Badge
              type="quaternary"
              theme="outline"
              className="rounded-xl text-xs font-normal capitalize">
              {formatWafProtectionDisplay(proxyWithWaf)}
            </Badge>
          );
        },
      },

      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
      },
      createActionsColumn<HttpProxy>([
        {
          label: 'View',
          onClick: (row) => {
            navigate(
              getPathWithParams(paths.project.detail.proxy.detail.root, {
                projectId,
                proxyId: row.name,
              })
            );
          },
        },
        {
          label: 'Delete',
          variant: 'destructive',
          hidden: () => !canDelete,
          onClick: (row) => confirmDelete(row),
        },
      ]),
    ],
    [projectId, navigate, confirmDelete, canDelete, canViewWaf, wafPending, wafReady, wafMaps]
  );

  return (
    <>
      <Table.Client
        columns={columns}
        data={data ?? []}
        loading={isPending}
        title="AI Edge"
        onRowClick={(row) => {
          navigate(
            getPathWithParams(paths.project.detail.proxy.detail.root, {
              projectId,
              proxyId: row.name,
            })
          );
        }}
        description="Give every agent or app a global edge to absorb attacks, interact with the broader internet, and safely route traffic to backend services."
        search="Search"
        empty={{
          title: "let's add an AI Edge to get you started",
          actions: [
            {
              type: 'button',
              label: 'New',
              onClick: () => proxyFormRef.current?.show(),
              icon: <Icon icon={PlusIcon} className="size-3" />,
              disabled: !canCreate,
              tooltip: !canCreate ? "You don't have permission to create an AI Edge" : undefined,
            },
          ],
        }}
        actions={[
          <PermissionButton
            key="create-edge"
            resource="httpproxies"
            verb="create"
            group="networking.datumapis.com"
            namespace="default"
            scope="project"
            deniedReason="You don't have permission to create an AI Edge"
            type="primary"
            theme="solid"
            size="small"
            className="w-full sm:w-auto"
            data-e2e="create-ai-edge-button"
            onClick={() => proxyFormRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            New
          </PermissionButton>,
        ]}
      />

      <HttpProxyFormDialog ref={proxyFormRef} projectId={projectId} />
    </>
  );
}
