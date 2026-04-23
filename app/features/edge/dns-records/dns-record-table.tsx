import { DnsRecordInlineForm } from './dns-record-inline-form';
import { DnsRecordStatus } from './dns-record-status';
import { Table, createActionsColumn } from '@/components/data-table';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { formatTTL } from '@/utils/helpers/dns-record.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import type { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import { InfoIcon, LockIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

interface DnsRecordTableBaseProps {
  data: IFlattenedDnsRecord[];
  projectId: string;
  className?: string;
  showStatus?: boolean;
  /** When set (full mode), adds an AI Edge column before TTL with this cell renderer. */
  renderAiEdgeCell?: (record: IFlattenedDnsRecord) => ReactNode;
}

/**
 * Compact mode — simple table, optionally with multi-select (overview / import preview pages).
 * No toolbar, pagination, or inline actions.
 */
interface DnsRecordTableCompactProps extends DnsRecordTableBaseProps {
  mode?: 'compact';
  /** CSS class applied to the scrollable table container (e.g. max-height) */
  tableContainerClassName?: string;
  /** Enable row checkboxes for bulk selection */
  enableMultiSelect?: boolean;
  /** Derive a stable row ID from the record (used for selection state) */
  getRowId?: (row: IFlattenedDnsRecord, index: number) => string;
  /** Called when selection changes — receives selected IDs and full row objects */
  onSelectionChange?: (selectedIds: string[], selectedRows: IFlattenedDnsRecord[]) => void;
}

/**
 * Full mode — complete table with toolbar, pagination, row actions, and controlled inline
 * content (create/edit form). The parent owns inline state and provides callbacks.
 */
interface DnsRecordTableFullProps extends DnsRecordTableBaseProps {
  mode: 'full';
  dnsZoneId: string;
  dnsZoneName?: string;
  tableTitle?: {
    title?: string;
    description?: string;
    actions?: ReactNode;
  };
  /** Whether the inline form panel is open */
  inlineOpen: boolean;
  /** Where the inline panel renders: above the table or below the active row */
  inlinePosition: 'top' | 'row';
  /** The tanstack row ID to anchor the inline panel to (required when position='row') */
  inlineRowId?: string;
  /** Called when the inline panel should close */
  onInlineClose: () => void;
  /** Called when the parent should open the create inline form */
  onOpenCreate: () => void;
  /** Called when the parent should open the edit inline form for a row */
  onOpenEdit: (record: IFlattenedDnsRecord) => void;
  /** Optional additional row actions appended after the built-in Edit action */
  extraRowActions?: ActionItem<IFlattenedDnsRecord>[];
}

export type DnsRecordTableProps = DnsRecordTableCompactProps | DnsRecordTableFullProps;

// =============================================================================
// Column definitions
// =============================================================================

function useDnsRecordColumns(
  mode: 'compact' | 'full',
  projectId: string,
  showStatus: boolean,
  renderAiEdgeCell?: (record: IFlattenedDnsRecord) => ReactNode
): ColumnDef<IFlattenedDnsRecord>[] {
  return useMemo(
    () => [
      {
        header: 'Type',
        accessorKey: 'type',
        size: 120,
        filterFn: 'arrayOr',
        cell: ({ row }) => {
          const { type, _meta, lockReason } = row.original;
          const wasTransformed = _meta?.transformedFrom;

          return (
            <div className="flex items-center gap-2">
              <Badge type="quaternary" theme="outline">
                {type}
              </Badge>

              {wasTransformed && (
                <Tooltip
                  side="right"
                  message={`Converted from ${wasTransformed}. CNAME records cannot exist at zone apex (@), so it was automatically converted to ALIAS.`}
                  contentClassName="max-w-64">
                  <Icon
                    icon={InfoIcon}
                    className="text-muted-foreground/70 size-3.5 shrink-0 cursor-help"
                    aria-hidden="true"
                  />
                </Tooltip>
              )}

              {showStatus && (
                <DnsRecordStatus
                  record={row.original}
                  projectId={projectId}
                  className="rounded-lg px-2 py-0.5"
                />
              )}

              {lockReason && (
                <Tooltip side="right" message={lockReason} contentClassName="max-w-64">
                  <Icon
                    icon={LockIcon}
                    className="text-muted-foreground size-3.5 shrink-0"
                    aria-label={`Locked: ${lockReason}`}
                  />
                </Tooltip>
              )}
            </div>
          );
        },
        meta: {
          sortPath: 'type',
          sortType: 'text',
        },
      },
      {
        header: 'Name',
        accessorKey: 'name',
        size: 150,
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
        meta: {
          sortPath: 'name',
          sortType: 'text',
        },
      },
      {
        header: 'Content',
        accessorKey: 'value',
        enableSorting: false,
        meta: {
          className: 'max-w-96 truncate',
        },
        cell: ({ row }) => {
          const { type, value } = row.original;

          // MX records: decode "preference|exchange" format
          if (type === 'MX' && value.includes('|')) {
            const [preference, exchange] = value.split('|');
            return (
              <div className="flex items-center gap-2">
                <Tooltip
                  side="bottom"
                  message={exchange}
                  contentClassName="max-w-96 overflow-x-auto">
                  <span className="truncate text-sm">{exchange}</span>
                </Tooltip>
                <Tooltip
                  side="bottom"
                  message="Priority of mail servers defined by MX records. Lowest value = highest priority."
                  contentClassName="max-w-64 overflow-x-auto">
                  <Badge
                    type="success"
                    theme="light"
                    className="max-w-fit cursor-pointer px-1 py-0.5 text-xs">
                    {preference}
                  </Badge>
                </Tooltip>
              </div>
            );
          }

          // SOA records: parse JSON and format for display
          if (type === 'SOA') {
            try {
              const soa = JSON.parse(value);
              const formattedValue = `${soa.mname} ${soa.rname} ${soa.refresh || 0} ${soa.retry || 0} ${soa.expire || 0} ${soa.ttl || 0}`;
              return (
                <Tooltip
                  side="bottom"
                  message={formattedValue}
                  contentClassName="max-w-96 overflow-x-auto">
                  <span className="truncate text-sm">
                    {soa.mname} {soa.rname} {soa.refresh || 0} {soa.retry || 0} {soa.expire || 0}{' '}
                    {soa.ttl || 0}
                  </span>
                </Tooltip>
              );
            } catch {
              // Fallback if JSON parsing fails
              return (
                <Tooltip side="bottom" message={value} contentClassName="max-w-96 overflow-x-auto">
                  <span className="truncate text-sm">{value}</span>
                </Tooltip>
              );
            }
          }

          return (
            <Tooltip side="bottom" message={value} contentClassName="max-w-96 overflow-x-auto">
              <span className="truncate text-sm">{value}</span>
            </Tooltip>
          );
        },
      },
      ...(mode === 'full' && renderAiEdgeCell
        ? [
            {
              id: 'aiEdge',
              header: () => <span>AI Edge</span>,
              cell: ({ row }) => (
                <div className="flex flex-wrap items-center">{renderAiEdgeCell(row.original)}</div>
              ),
              meta: {
                tooltip: "Protect your origin with Datum's AI Edge",
              },
              enableSorting: false,
              size: 180,
            } as ColumnDef<IFlattenedDnsRecord>,
          ]
        : []),
      {
        header: 'TTL',
        accessorKey: 'ttl',
        size: 100,
        cell: ({ row }) => {
          return <span className="text-sm">{formatTTL(row.original.ttl)}</span>;
        },
        meta: {
          sortPath: 'ttl',
          sortType: 'number',
        },
      },
    ],
    [mode, renderAiEdgeCell, projectId, showStatus]
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Unified DNS record table component.
 *
 * - mode="compact" (default): Simple table, optionally with multi-select. No toolbar/pagination.
 * - mode="full": Full table with toolbar, pagination, row actions, and controlled inline
 *   content. Parent must manage inline state via `inlineOpen`, `inlinePosition`,
 *   `inlineRowId`, `onInlineClose`, `onOpenCreate`, and `onOpenEdit`.
 */
export function DnsRecordTable(props: DnsRecordTableProps) {
  const { data, projectId, className, showStatus = true, renderAiEdgeCell } = props;
  const resolvedMode = props.mode === 'full' ? 'full' : 'compact';

  // Hooks must be called unconditionally — resolve mode first, then call once.
  const baseColumns = useDnsRecordColumns(resolvedMode, projectId, showStatus, renderAiEdgeCell);
  const rowIndexMap = useMemo(() => new Map(data.map((row, i) => [row, i])), [data]);

  if (resolvedMode !== 'full') {
    const {
      tableContainerClassName: _tableContainerClassName,
      enableMultiSelect,
      getRowId,
    } = props as DnsRecordTableCompactProps;

    return (
      <DataTable.Client
        className={className}
        columns={baseColumns}
        data={data}
        getRowId={getRowId ? (row) => getRowId(row, rowIndexMap.get(row) ?? 0) : undefined}
        enableRowSelection={enableMultiSelect ? true : undefined}>
        <DataTable.Content emptyMessage="No DNS records found." />
      </DataTable.Client>
    );
  }

  // Full mode — discriminated union fully narrowed
  const {
    dnsZoneId,
    dnsZoneName,
    tableTitle,
    inlineOpen,
    inlinePosition,
    inlineRowId,
    onInlineClose,
    onOpenEdit,
    extraRowActions = [],
  } = props as DnsRecordTableFullProps;

  const rowActions: ActionItem<IFlattenedDnsRecord>[] = [
    {
      label: 'Edit',
      onClick: (record) => onOpenEdit(record),
    },
    ...extraRowActions,
  ];

  const columns = [...baseColumns, createActionsColumn<IFlattenedDnsRecord>(rowActions)];

  const toolbarActions = tableTitle?.actions ? [tableTitle.actions] : undefined;

  return (
    <Table.Client
      columns={columns}
      data={data}
      className={className}
      title={tableTitle?.title}
      description={tableTitle?.description}
      actions={toolbarActions}
      search
      inlineContent={{
        open: inlineOpen,
        position: inlinePosition,
        rowId: inlineRowId,
        onClose: onInlineClose,
        render: ({ onClose, rowData }) => (
          <DnsRecordInlineForm
            mode={rowData ? 'edit' : 'create'}
            initialData={rowData ?? null}
            projectId={projectId}
            dnsZoneId={dnsZoneId}
            dnsZoneName={dnsZoneName}
            onClose={onClose}
          />
        ),
      }}
      emptyContent="No DNS records found."
    />
  );
}

DnsRecordTable.displayName = 'DnsRecordTable';
