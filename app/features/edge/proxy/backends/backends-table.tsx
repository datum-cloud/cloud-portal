import { backendShares, formatSharePercent } from './share';
import {
  BACKEND_KIND_LABELS,
  addBackendBlockedReason,
  backendLabel,
  backendScheme,
  routePathLabel,
} from './target';
import { StatusChip } from '@/components/card';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Table, createActionsColumn, type ColumnDef, type RowAction } from '@/components/table';
import { PermissionButton } from '@/modules/rbac';
import type { ProxyBackend, ProxyRoute } from '@/resources/http-proxies';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { MoreActions } from '@datum-cloud/datum-ui/more-actions';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { LockIcon, PlusIcon, ShieldOffIcon } from 'lucide-react';
import { useMemo } from 'react';

/** A backend row, carrying the share computed across its own pool. */
interface BackendRow extends ProxyBackend {
  /** What the Backend column renders, and what the filter box searches. */
  label: string;
  percent: number;
  excluded: boolean;
  noTraffic: boolean;
  color: string;
}

export const BackendsCard = ({
  route,
  projectId,
  canEdit,
  showPath,
  canDeleteRoute,
  onAddBackend,
  onEditBackend,
  onRemoveBackend,
  onEditRoute,
  onDeleteRoute,
}: {
  route: ProxyRoute;
  projectId: string;
  canEdit: boolean;
  /** Name the route when there is more than one pool on the page. */
  showPath: boolean;
  canDeleteRoute: boolean;
  onAddBackend: (route: ProxyRoute) => void;
  onEditBackend: (route: ProxyRoute, backend: ProxyBackend) => void;
  onRemoveBackend: (route: ProxyRoute, backend: ProxyBackend) => void;
  onEditRoute: (route: ProxyRoute) => void;
  onDeleteRoute: (route: ProxyRoute) => void;
}) => {
  const { confirm } = useConfirmationDialog();
  const addBlocked = addBackendBlockedReason(route);
  const editable = canEdit && !route.readOnly;

  const rows = useMemo<BackendRow[]>(() => {
    const { shares, noTraffic } = backendShares(route.backends);
    return shares.map((s) => ({
      ...s.backend,
      label: backendLabel(s.backend),
      percent: s.percent,
      excluded: s.excluded,
      color: s.color,
      noTraffic,
    }));
  }, [route.backends]);

  const confirmRemove = (backend: ProxyBackend) => {
    void confirm({
      title: 'Remove backend',
      description: `${backendLabel(backend)} will stop receiving traffic from this route.`,
      submitText: 'Remove',
      variant: 'destructive',
      onSubmit: async () => onRemoveBackend(route, backend),
    });
  };

  const confirmDeleteRoute = () => {
    void confirm({
      title: 'Delete route',
      description: `Requests matching ${routePathLabel(route)} will no longer be sent to this pool.`,
      submitText: 'Delete',
      variant: 'destructive',
      onSubmit: async () => onDeleteRoute(route),
    });
  };

  const columns = useMemo<ColumnDef<BackendRow>[]>(() => {
    const base: ColumnDef<BackendRow>[] = [
      {
        header: 'Backend',
        accessorKey: 'label',
        // A pool holds at most 16 rows and its order is meaningful as written;
        // sortable headers on every column were Table.Client's default, not a
        // decision.
        enableSorting: false,
        cell: ({ row }) => {
          const backend = row.original;
          return (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-mono text-sm">{backend.label}</span>
              <div className="flex items-center gap-1.5 empty:hidden">
                {/* A URL backend is the ordinary kind and the target above
                    already shows a URL — labelling every row "URL" is noise.
                    The badge earns its place only when the kind is not
                    obvious from the target. */}
                {backend.kind !== 'endpoint' ? (
                  <Badge type="muted" theme="solid" className="text-2xs">
                    {BACKEND_KIND_LABELS[backend.kind]}
                  </Badge>
                ) : null}
                {!backend.editable ? (
                  <Tooltip
                    message={
                      backend.kind === 'connector' || backend.kind === 'instance'
                        ? `${BACKEND_KIND_LABELS[backend.kind]} backends are managed elsewhere.`
                        : 'This backend carries filters the portal cannot edit.'
                    }>
                    <Badge type="muted" theme="outline" className="text-2xs">
                      Read only
                    </Badge>
                  </Tooltip>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        header: 'TLS',
        accessorKey: 'tlsHostname',
        enableSorting: false,
        meta: { className: 'w-28' },
        cell: ({ row }) => {
          const scheme = backendScheme(row.original);
          if (scheme === 'https') {
            return (
              <StatusChip tone="success" tooltip="Traffic to this backend is encrypted">
                <Icon icon={LockIcon} size={10} aria-hidden="true" />
                HTTPS
              </StatusChip>
            );
          }
          if (scheme === 'http') {
            return (
              <StatusChip
                tone="warning"
                tooltip="Traffic between Datum and this backend is not encrypted">
                <Icon icon={ShieldOffIcon} size={10} aria-hidden="true" />
                HTTP
              </StatusChip>
            );
          }
          return <span className="text-muted-foreground">&mdash;</span>;
        },
      },
      {
        header: 'Weight',
        accessorKey: 'weight',
        enableSorting: false,
        meta: { className: 'w-24 text-right' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.weight}</span>,
      },
      {
        header: 'Share',
        accessorKey: 'percent',
        enableSorting: false,
        meta: { className: 'w-44' },
        cell: ({ row }) => {
          const { noTraffic, excluded, percent, color } = row.original;
          if (noTraffic) return <span className="text-muted-foreground">&mdash;</span>;
          return (
            <div className="flex items-center justify-end gap-2">
              <div className="bg-muted h-1.5 w-16 shrink-0 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: color }}
                />
              </div>
              <span
                className={
                  excluded
                    ? 'text-muted-foreground w-9 text-right tabular-nums'
                    : 'w-9 text-right tabular-nums'
                }>
                {formatSharePercent(percent)}
              </span>
            </div>
          );
        },
      },
    ];

    if (!editable) return base;

    const actions = (row: BackendRow): RowAction<BackendRow>[] => [
      { key: 'edit', label: 'Edit backend', onClick: () => onEditBackend(route, row) },
      {
        key: 'remove',
        label: 'Remove backend',
        variant: 'destructive',
        onClick: () => confirmRemove(row),
      },
    ];

    return [
      ...base,
      createActionsColumn<BackendRow>(actions, {
        // A backend the portal must not rewrite gets no actions at all, rather
        // than actions that would fail or quietly drop what it carries.
        hideRowActions: (row) => !row.editable,
      }),
    ];
  }, [editable, route, onEditBackend]);

  const addButton = (
    <PermissionButton
      resource="httpproxies"
      verb="patch"
      group="networking.datumapis.com"
      namespace="default"
      scope="project"
      projectId={projectId}
      deniedReason="You don't have permission to edit this Application Load Balancer"
      type="secondary"
      theme="outline"
      size="xs"
      disabled={!!addBlocked}
      onClick={() => onAddBackend(route)}
      data-e2e="alb-add-backend">
      <Icon icon={PlusIcon} size={12} />
      Add backend
    </PermissionButton>
  );

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-backends-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          Backends
          <Badge type="muted" theme="solid" className="text-2xs tabular-nums">
            {route.backends.length}
          </Badge>
          {showPath ? <StatusChip tone="muted">{routePathLabel(route)}</StatusChip> : null}
          {route.readOnly ? (
            <StatusChip
              tone="muted"
              tooltip="This route uses matches or filters the portal cannot represent, so it is shown read-only to avoid a lossy write.">
              Read only
            </StatusChip>
          ) : null}
        </CardTitle>

        {/* For a sole pool the page header already carries the primary
            "Add backend"; a second one here is the same action twice. With
            several routes each card needs its own, since the header's
            primary action becomes "Add route". */}
        {editable && showPath ? (
          <CardAction className="flex items-center gap-1">
            {addBlocked ? <Tooltip message={addBlocked}>{addButton}</Tooltip> : addButton}
            {showPath ? (
              <MoreActions
                actions={[
                  { key: 'edit', label: 'Edit path', onClick: () => onEditRoute(route) },
                  {
                    key: 'delete',
                    label: 'Delete route',
                    variant: 'destructive',
                    disabled: !canDeleteRoute,
                    // An ALB with no backend rule has nowhere to send traffic.
                    tooltip: canDeleteRoute
                      ? undefined
                      : 'A load balancer needs at least one route with backends.',
                    onClick: confirmDeleteRoute,
                  },
                ]}
                data-e2e="alb-route-actions"
              />
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent padding="none">
        <Table.Client
          columns={columns}
          data={rows}
          getRowId={(row) => row.key}
          pagination={false}
          urlSync={false}
          // Without this the table scans every row value and over-matches —
          // a filter for "http" would hit the TLS chip and the kind badge too.
          search="Filter backends..."
          searchableColumns={['label']}
          empty={{
            title: 'No backends',
            description: 'Add a backend so this route has somewhere to send traffic.',
          }}
        />
      </CardContent>
    </Card>
  );
};
