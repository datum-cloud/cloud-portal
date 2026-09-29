import { poolWith, type BackendRow } from './backend-pool';
import { StatusChip } from '@/components/card/status-chip';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { showMutationErrorToast } from '@/modules/quota';
import { usePermission } from '@/modules/rbac';
import { type HttpProxy, useUpdateHttpProxy } from '@/resources/http-proxies';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { MoreActions, type ActionItem } from '@datum-cloud/datum-ui/more-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  CheckIcon,
  CopyIcon,
  LockIcon,
  NetworkIcon,
  PauseIcon,
  PencilIcon,
  SearchIcon,
  ServerIcon,
  ShieldOffIcon,
  Trash2Icon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

const EDIT_DENIED = "You don't have permission to edit this Application Load Balancer";
const HEAD = 'text-muted-foreground text-3xs h-9 font-semibold uppercase';

/** Scheme and certificate chips. Its own column on desktop, inline under the address on mobile. */
function TransportChips({ row }: { row: BackendRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.scheme === 'https' ? (
        <StatusChip tone="success" tooltip="Traffic to this origin is encrypted">
          <Icon icon={LockIcon} size={10} aria-hidden="true" />
          HTTPS
        </StatusChip>
      ) : row.scheme === 'http' ? (
        <StatusChip tone="warning" tooltip="Traffic between Datum and this origin is not encrypted">
          <Icon icon={ShieldOffIcon} size={10} aria-hidden="true" />
          HTTP
        </StatusChip>
      ) : row.privateNetwork ? (
        <StatusChip
          tone="muted"
          tooltip="Reached over Datum's private network, not the public internet">
          <Icon icon={NetworkIcon} size={10} aria-hidden="true" />
          Private network
        </StatusChip>
      ) : (
        // Only meaningful as an empty column cell; the mobile line just omits it.
        <Text size="xs" textColor="muted" className="hidden md:inline">
          —
        </Text>
      )}
      {row.backend.tlsHostname ? (
        <StatusChip tone="muted" tooltip={`Certificate checked against ${row.backend.tlsHostname}`}>
          SNI · {row.backend.tlsHostname}
        </StatusChip>
      ) : row.isIp ? (
        <StatusChip tone="muted" tooltip="Origin is addressed by IP rather than hostname">
          IP origin
        </StatusChip>
      ) : null}
    </div>
  );
}

function ShareBar({ row }: { row: BackendRow }) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <div className="bg-muted h-1.5 w-10 overflow-hidden rounded-full sm:w-20" aria-hidden="true">
        <div
          className="h-full rounded-full"
          style={{ width: `${row.share}%`, backgroundColor: row.color }}
        />
      </div>
      <Text size="xs" weight="semibold" textColor="muted" className="tabular-nums">
        {row.shareLabel}
      </Text>
    </div>
  );
}

export function HttpProxyBackendsTableCard({
  proxy,
  projectId,
  rows,
  lockReason,
  onEdit,
}: {
  proxy: HttpProxy;
  projectId: string;
  rows: BackendRow[];
  lockReason?: string;
  onEdit: (row: BackendRow) => void;
}) {
  const [query, setQuery] = useState('');
  const { confirm } = useConfirmationDialog();
  const [, copy, isCopied] = useCopyToClipboard();
  const updateProxy = useUpdateHttpProxy(projectId, proxy.name);

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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.title, row.address, row.kindLabel].some((value) => value?.toLowerCase().includes(needle))
    );
  }, [rows, query]);

  const editBlocked = !canPatch || permLoading || !!lockReason;
  const blockedTooltip = (fallback: string) =>
    lockReason ?? (!canPatch && !permLoading ? EDIT_DENIED : fallback);

  const removeBackend = async (row: BackendRow) => {
    const remaining = rows.filter((r) => r.index !== row.index);
    const drainsAll = remaining.every((r) => r.weight === 0);
    await confirm({
      title: 'Remove backend',
      description: (
        <span>
          Stop sending traffic to <strong>{row.title}</strong> and remove it from the pool?
          {drainsAll
            ? ' Every remaining backend has a weight of 0, so the load balancer would have nowhere to send requests.'
            : ' Its share is split across the remaining backends by weight.'}
        </span>
      ),
      submitText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive',
      onSubmit: async () => {
        try {
          await updateProxy.mutateAsync({
            backends: poolWith(proxy.backends, { type: 'remove', index: row.index }),
          });
          toast.success('Application Load Balancer', { description: `${row.title} removed` });
        } catch (error) {
          showMutationErrorToast(error, {
            fallbackTitle: 'Application Load Balancer',
            fallbackDescription: (error as Error).message || 'Failed to remove backend',
            scope: 'project',
            projectId,
          });
          throw error;
        }
      },
    });
  };

  // The last backend with weight can't be drained, or nothing would serve.
  const isLastWeighted = (row: BackendRow) =>
    !row.drained && rows.every((r) => r.index === row.index || r.drained);

  const drainBackend = async (row: BackendRow) => {
    try {
      await updateProxy.mutateAsync({
        backends: poolWith(proxy.backends, {
          type: 'replace',
          index: row.index,
          backend: { raw: row.backend.raw, weight: 0 },
        }),
      });
      toast.success('Application Load Balancer', {
        description: `${row.title} drained. Edit it to give it a weight again.`,
      });
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'Application Load Balancer',
        fallbackDescription: (error as Error).message || 'Failed to drain backend',
        scope: 'project',
        projectId,
      });
    }
  };

  const actions: ActionItem<BackendRow>[] = [
    {
      key: 'edit',
      label: 'Edit backend',
      icon: <Icon icon={PencilIcon} className="size-4" />,
      // A connector backend is edited from Configuration, where its tunnel lives.
      hidden: (row) => row.backend.kind === 'connector',
      disabled: editBlocked,
      tooltip: () => blockedTooltip('Edit backend'),
      onClick: (row) => onEdit(row),
    },
    {
      key: 'drain',
      label: 'Drain backend',
      icon: <Icon icon={PauseIcon} className="size-4" />,
      // Already drained, or a connector, which is always the only backend.
      hidden: (row) => row.drained || row.backend.kind === 'connector',
      disabled: (row) => editBlocked || isLastWeighted(row),
      tooltip: (row) =>
        isLastWeighted(row)
          ? 'This is the only backend receiving traffic'
          : blockedTooltip('Set its weight to 0 so it stops receiving traffic'),
      onClick: (row) => void drainBackend(row),
    },
    {
      key: 'copy',
      label: 'Copy address',
      icon: <Icon icon={CopyIcon} className="size-4" />,
      hidden: (row) => !row.backend.endpoint,
      onClick: (row) => void copy(row.backend.endpoint ?? '', { withToast: true }),
    },
    {
      key: 'remove',
      label: 'Remove backend',
      icon: <Icon icon={Trash2Icon} className="size-4" />,
      variant: 'destructive',
      disabled: editBlocked || rows.length <= 1,
      tooltip: () =>
        rows.length <= 1
          ? 'A load balancer needs at least one backend'
          : blockedTooltip('Remove backend'),
      onClick: (row) => void removeBackend(row),
    },
  ];

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-backends-table">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={ServerIcon} size={16} className="text-secondary" />
          Backends
          <Badge type="muted" theme="solid" className="text-3xs h-5 rounded-md px-1.5 tabular-nums">
            {rows.length}
          </Badge>
        </CardTitle>
        <CardAction>
          <div className="relative">
            <Icon
              icon={SearchIcon}
              size={14}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter backends…"
              aria-label="Filter backends"
              className="h-8 w-36 pl-8 text-xs sm:w-48"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent padding="none">
        <Table className="table-fixed">
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(HEAD, 'pl-(--card-px)')}>Backend</TableHead>
              <TableHead className={cn(HEAD, 'hidden w-44 md:table-cell')}>Transport</TableHead>
              <TableHead className={cn(HEAD, 'hidden w-20 sm:table-cell')}>Weight</TableHead>
              <TableHead className={cn(HEAD, 'w-24 sm:w-40')}>Share</TableHead>
              <TableHead className="w-12 pr-(--card-px)">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-6 text-center">
                  <Text size="xs" textColor="muted">
                    No backends match “{query.trim()}”.
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow key={row.index} className="group/row" data-e2e="alb-backend-row">
                  <TableCell className="max-w-0 py-3.5 pl-(--card-px)">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {row.href ? (
                            <Link
                              to={row.href}
                              className="min-w-0 truncate text-sm font-medium hover:underline">
                              {row.title}
                            </Link>
                          ) : (
                            <Text size="sm" weight="medium" ellipsis>
                              {row.title}
                            </Text>
                          )}
                          {row.kindLabel ? (
                            <StatusChip tone="muted">{row.kindLabel}</StatusChip>
                          ) : null}
                          {row.drained ? (
                            <StatusChip
                              tone="warning"
                              tooltip="Weight 0: kept in the pool but receives no traffic">
                              Drained
                            </StatusChip>
                          ) : null}
                        </div>
                        <div className="flex min-w-0 items-center gap-1">
                          <Text size="xs" textColor="muted" ellipsis className="font-mono">
                            {row.address}
                          </Text>
                          {row.backend.endpoint ? (
                            // Same hover-reveal copy as ValueRow; desktop only, since the
                            // row menu's "Copy address" covers small screens.
                            <Button
                              type="quaternary"
                              theme="borderless"
                              size="xs"
                              className={cn(
                                'text-muted-foreground hidden size-6 shrink-0 p-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:inline-flex',
                                isCopied(row.backend.endpoint) && 'opacity-100'
                              )}
                              aria-label={
                                isCopied(row.backend.endpoint) ? 'Copied' : `Copy ${row.address}`
                              }
                              onClick={() =>
                                void copy(row.backend.endpoint ?? '', { withToast: true })
                              }>
                              <Icon
                                icon={isCopied(row.backend.endpoint) ? CheckIcon : CopyIcon}
                                size={12}
                              />
                            </Button>
                          ) : null}
                        </div>
                        {/* The Transport and Weight columns drop out on narrow screens. */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                          <TransportChips row={row} />
                          <Text size="xs" textColor="muted" className="tabular-nums sm:hidden">
                            Weight {row.weight}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <TransportChips row={row} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Text
                      size="sm"
                      weight="semibold"
                      textColor={row.drained ? 'muted' : 'default'}
                      className="tabular-nums">
                      {row.weight}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <ShareBar row={row} />
                  </TableCell>
                  <TableCell className="pr-(--card-px) text-right">
                    <MoreActions
                      row={row}
                      actions={actions}
                      sheetTitle={`Actions for ${row.title}`}
                      className="size-7"
                      iconClassName="size-4"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
