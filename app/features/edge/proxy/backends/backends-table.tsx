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
import { PermissionButton } from '@/modules/rbac';
import type { ProxyBackend, ProxyRoute } from '@/resources/http-proxies';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { MoreActions, type ActionItem } from '@datum-cloud/datum-ui/more-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { LockIcon, PencilIcon, PlusIcon, ShieldOffIcon, Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';

/** A backend row, carrying the share computed across its own pool. */
interface BackendRow extends ProxyBackend {
  /** Primary line: what the backend is. */
  title: string;
  /** Secondary line: where it points, when that adds something. */
  subtitle?: string;
  percent: number;
  excluded: boolean;
  noTraffic: boolean;
  color: string;
}

/**
 * Two lines per backend, as the mockup has it. Its primary line is a
 * per-backend name, which the API has no field for, so the split falls back to
 * what each kind actually knows: the thing being addressed above, the address
 * below — and nothing below where that would only repeat it.
 */
function describeBackend(backend: ProxyBackend): { title: string; subtitle?: string } {
  switch (backend.kind) {
    case 'networkService':
      return backend.networkService
        ? { title: backend.networkService.name, subtitle: `port · ${backend.networkService.port}` }
        : { title: 'Network service' };
    case 'connector':
      return { title: backend.connector?.name ?? 'Connector', subtitle: backend.endpoint };
    case 'instance':
      return backend.instance
        ? { title: backend.instance.name, subtitle: `port · ${backend.instance.port}` }
        : { title: 'Instance' };
    default: {
      if (!backend.endpoint) return { title: '—' };
      try {
        // Host on top, full endpoint beneath, so a path or a port stays
        // visible without the host being buried in it.
        return { title: new URL(backend.endpoint).host, subtitle: backend.endpoint };
      } catch {
        return { title: backend.endpoint };
      }
    }
  }
}

const HEAD_CLASS = 'text-2xs text-muted-foreground font-medium tracking-wider uppercase';

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
      ...describeBackend(s.backend),
      percent: s.percent,
      excluded: s.excluded,
      color: s.color,
      noTraffic,
    }));
  }, [route.backends]);

  // Ties a row to its segment in the distribution bar above. Identity, not
  // health: there is no per-backend health to report, and the palette carries
  // no good/bad meaning.
  const showSwatch = route.backends.length >= 2;

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

  const rowActions: ActionItem<BackendRow>[] = [
    {
      key: 'edit',
      label: 'Edit backend',
      icon: <Icon icon={PencilIcon} className="size-4" />,
      onClick: (row) => onEditBackend(route, row),
    },
    {
      key: 'remove',
      label: 'Remove backend',
      icon: <Icon icon={Trash2Icon} className="size-4" />,
      variant: 'destructive',
      onClick: (row) => confirmRemove(row),
    },
  ];

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
            several routes each card needs its own, since the header's primary
            action becomes "Add route". */}
        {editable && showPath ? (
          <CardAction className="flex items-center gap-1">
            {addBlocked ? <Tooltip message={addBlocked}>{addButton}</Tooltip> : addButton}
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
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent padding="none">
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-(--card-px) py-6 text-sm">
            No backends. Add one so this route has somewhere to send traffic.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={HEAD_CLASS}>Backend</TableHead>
                <TableHead className={`${HEAD_CLASS} w-32`}>TLS</TableHead>
                <TableHead className={`${HEAD_CLASS} w-24 text-right`}>Weight</TableHead>
                <TableHead className={`${HEAD_CLASS} w-48`}>Share</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => {
                const scheme = backendScheme(row);
                return (
                  <TableRow key={row.key} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex min-w-0 items-start gap-2.5">
                        {showSwatch ? (
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: row.color }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium">{row.title}</span>
                            {/* A URL backend is the ordinary kind and the line
                                below already shows a URL. The badge earns its
                                place only when the kind is not obvious. */}
                            {row.kind !== 'endpoint' ? (
                              <Badge type="muted" theme="solid" className="text-2xs">
                                {BACKEND_KIND_LABELS[row.kind]}
                              </Badge>
                            ) : null}
                            {!row.editable ? (
                              <Tooltip
                                message={
                                  row.kind === 'connector' || row.kind === 'instance'
                                    ? `${BACKEND_KIND_LABELS[row.kind]} backends are managed elsewhere.`
                                    : 'This backend carries filters the portal cannot edit.'
                                }>
                                <Badge type="muted" theme="outline" className="text-2xs">
                                  Read only
                                </Badge>
                              </Tooltip>
                            ) : null}
                          </div>
                          {row.subtitle ? (
                            <span className="text-muted-foreground truncate font-mono text-xs">
                              {row.subtitle}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {scheme === 'https' ? (
                        <StatusChip tone="success" tooltip="Traffic to this backend is encrypted">
                          <Icon icon={LockIcon} size={10} aria-hidden="true" />
                          HTTPS
                        </StatusChip>
                      ) : scheme === 'http' ? (
                        <StatusChip
                          tone="warning"
                          tooltip="Traffic between Datum and this backend is not encrypted">
                          <Icon icon={ShieldOffIcon} size={10} aria-hidden="true" />
                          HTTP
                        </StatusChip>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">{row.weight}</TableCell>

                    <TableCell>
                      {row.noTraffic ? (
                        <span className="text-muted-foreground">&mdash;</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-1.5 w-20 shrink-0 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${row.percent}%`, backgroundColor: row.color }}
                            />
                          </div>
                          <span
                            className={`w-9 text-right tabular-nums ${
                              row.excluded ? 'text-muted-foreground' : ''
                            }`}>
                            {formatSharePercent(row.percent)}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {/* A backend the portal must not rewrite gets no actions
                          at all, rather than actions that would fail or quietly
                          drop what it carries. */}
                      {editable && row.editable ? (
                        <MoreActions
                          row={row}
                          actions={rowActions}
                          sheetTitle={`Actions for ${row.title}`}
                          className="size-7"
                          iconClassName="size-4"
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
