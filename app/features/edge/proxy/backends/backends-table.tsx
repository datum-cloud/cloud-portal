import { backendShares, formatSharePercent } from './share';
import { BACKEND_KIND_LABELS, backendLabel, backendScheme } from './target';
import { StatusChip } from '@/components/card';
import { Table, createActionsColumn, type ColumnDef, type RowAction } from '@/components/table';
import type { ProxyBackend, ProxyRoute } from '@/resources/http-proxies';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { LockIcon, ShieldOffIcon } from 'lucide-react';
import { useMemo } from 'react';

/** A backend row, carrying the share computed across its own pool. */
interface BackendRow extends ProxyBackend {
  percent: number;
  excluded: boolean;
  noTraffic: boolean;
}

export const BackendsTable = ({
  route,
  canEdit,
  onEdit,
  onRemove,
}: {
  route: ProxyRoute;
  canEdit: boolean;
  onEdit: (backend: ProxyBackend) => void;
  onRemove: (backend: ProxyBackend) => void;
}) => {
  const rows = useMemo<BackendRow[]>(() => {
    const { shares, noTraffic } = backendShares(route.backends);
    return shares.map((s) => ({
      ...s.backend,
      percent: s.percent,
      excluded: s.excluded,
      noTraffic,
    }));
  }, [route.backends]);

  const columns = useMemo<ColumnDef<BackendRow>[]>(() => {
    const base: ColumnDef<BackendRow>[] = [
      {
        header: 'Backend',
        accessorKey: 'key',
        cell: ({ row }) => {
          const backend = row.original;
          return (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-mono text-sm">{backendLabel(backend)}</span>
              <div className="flex items-center gap-1.5">
                <Badge type="muted" theme="solid" className="text-2xs">
                  {BACKEND_KIND_LABELS[backend.kind]}
                </Badge>
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
        meta: { className: 'text-right' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.weight}</span>,
      },
      {
        header: 'Share',
        accessorKey: 'percent',
        meta: { className: 'text-right' },
        cell: ({ row }) => {
          const { noTraffic, excluded, percent } = row.original;
          if (noTraffic) return <span className="text-muted-foreground">&mdash;</span>;
          return (
            <span className={excluded ? 'text-muted-foreground tabular-nums' : 'tabular-nums'}>
              {formatSharePercent(percent)}
            </span>
          );
        },
      },
    ];

    if (!canEdit) return base;

    const actions = (row: BackendRow): RowAction<BackendRow>[] => [
      { key: 'edit', label: 'Edit backend', onClick: () => onEdit(row) },
      {
        key: 'remove',
        label: 'Remove backend',
        variant: 'destructive',
        onClick: () => onRemove(row),
      },
    ];

    return [
      ...base,
      createActionsColumn<BackendRow>(actions, {
        // A backend the portal must not rewrite gets no actions at all,
        // rather than actions that would fail or quietly drop what it carries.
        hideRowActions: (row) => !row.editable,
      }),
    ];
  }, [canEdit, onEdit, onRemove]);

  return (
    <Table.Client
      columns={columns}
      data={rows}
      getRowId={(row) => row.key}
      pagination={false}
      urlSync={false}
      empty={{
        title: 'No backends',
        description: 'Add a backend so this route has somewhere to send traffic.',
      }}
    />
  );
};
