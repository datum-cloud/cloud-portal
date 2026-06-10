import { groupQuotas, type QuotaRow } from './quotas-grouping';
import { resolveServiceDisplayName } from './service-catalog';
import { sortableHeader, TableSearch } from '@/components/table';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import type { ResourceRegistration } from '@/resources/resource-registrations';
import { openSupportMessage } from '@/utils/open-support-message';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import { GroupedTable } from '@datum-cloud/datum-ui/grouped-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const NEAR_LIMIT = 90;

const calculateUsage = (usage: { allocated: bigint; limit: bigint }) => {
  const used =
    typeof usage.allocated === 'bigint' ? Number(usage.allocated) : (usage.allocated ?? 0);
  const total = typeof usage.limit === 'bigint' ? Number(usage.limit) : (usage.limit ?? 0);
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  return { used, total, percentage };
};

const getProgressBarColor = (percentage: number, limit: number) => {
  if (limit === 0) {
    return 'bg-gray-400'; // Gray for no limit set
  }
  if (percentage <= 70) {
    return 'bg-green-500'; // Green for healthy usage (0-70%)
  }
  if (percentage <= 90) {
    return 'bg-yellow-500'; // Yellow for warning (70-90%)
  }
  return 'bg-red-500'; // Red for critical (90-100%)
};

/** Internal row model: the grouping `QuotaRow` joined to its bucket + registration. */
interface QuotaTableRow extends QuotaRow {
  bucket: AllowanceBucket;
  description?: string;
}

const quotaSearchFn = (row: QuotaTableRow, query: string): boolean => {
  const s = query.toLowerCase();
  return row.displayName.toLowerCase().includes(s) || row.resourceType.toLowerCase().includes(s);
};

export const QuotasTable = ({
  data,
  registrations,
  resourceType,
  resource,
}: {
  data: AllowanceBucket[];
  /**
   * Map of `resourceType` → full `ResourceRegistration`. Buckets whose
   * registration `type` is `Feature` are hidden — visibility flags have no
   * countable usage and the X/Y bar always reads "0 / N". The registration's
   * `displayName`, `description`, and `service` (owner) drive the row label and
   * service grouping. Optional + defaults to empty so legacy callers (and the
   * degraded-fetch path) keep every row, ungrouped under "Other".
   */
  registrations?: Record<string, ResourceRegistration>;
  resourceType: 'organization' | 'project';
  resource: Organization | Project;
}) => {
  const regs = registrations ?? {};

  const tableRows = useMemo<QuotaTableRow[]>(() => {
    return data
      .filter((b) => regs[b.resourceType]?.type !== 'Feature')
      .map((b) => {
        const reg = regs[b.resourceType];
        const { percentage } = calculateUsage(b.status ?? { allocated: 0n, limit: 0n });
        return {
          resourceType: b.resourceType,
          displayName: reg?.displayName ?? b.resourceType,
          group: resolveServiceDisplayName(reg?.service, b.resourceType),
          percentage,
          description: reg?.description,
          bucket: b,
        };
      });
  }, [data, regs]);

  const groups = useMemo(() => groupQuotas(tableRows), [tableRows]);

  const e2ePrefix = resourceType === 'organization' ? 'org-quota' : 'project-quota';

  const handleRequestIncrease = useCallback(
    (quota: AllowanceBucket) => {
      const resourceInfo =
        resourceType === 'organization'
          ? `- Organization: ${(resource as Organization)?.displayName} (${(resource as Organization)?.name})\n`
          : `- Project: ${(resource as Project)?.displayName} (${(resource as Project)?.name})\n`;

      openSupportMessage({
        subject: `Quota increase request: ${quota.resourceType}`,
        text:
          `Hello team,\n\n` +
          `I'd like to request an increase for the "${quota.resourceType}" quota.\n\n` +
          `Details:\n` +
          resourceInfo +
          `- Requested new limit: [please specify]\n` +
          `- Reason/justification: [brief context, e.g., upcoming workload/traffic]\n\n` +
          `Thank you!`,
      });
    },
    [resource, resourceType]
  );

  const columns = useMemo<ColumnDef<QuotaTableRow, unknown>[]>(
    () => [
      {
        id: 'resource',
        header: sortableHeader<QuotaTableRow>('Resource'),
        accessorFn: (row) => row.displayName,
        cell: ({ row }) => (
          <div data-e2e={`${e2ePrefix}-card`}>
            <span
              data-e2e={`${e2ePrefix}-resource-type`}
              className="block font-medium"
              title={row.original.resourceType}>
              {row.original.displayName}
            </span>
            {row.original.description && (
              <span
                className="text-muted-foreground mt-0.5 block text-xs"
                title={row.original.description}
                data-e2e={`${e2ePrefix}-description`}>
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'usage',
        header: sortableHeader<QuotaTableRow>('Usage'),
        accessorFn: (row) => calculateUsage(row.bucket.status ?? { allocated: 0n, limit: 0n }).used,
        size: 120,
        cell: ({ row }) => {
          const status = row.original.bucket.status;
          if (!status) {
            return <span data-e2e={`${e2ePrefix}-usage-amount`}>-</span>;
          }
          const { used, total } = calculateUsage(status);
          return (
            <span
              className="text-xs font-semibold whitespace-nowrap"
              data-e2e={`${e2ePrefix}-usage-amount`}>
              {used} / {total}
            </span>
          );
        },
      },
      {
        id: 'percent',
        header: sortableHeader<QuotaTableRow>('% Used'),
        accessorFn: (row) => row.percentage,
        size: 220,
        cell: ({ row }) => {
          const status = row.original.bucket.status;
          if (!status) {
            return <span data-e2e={`${e2ePrefix}-usage`}>-</span>;
          }
          const { total, percentage } = calculateUsage(status);
          return (
            <div className="flex items-center gap-3" data-e2e={`${e2ePrefix}-usage`}>
              <div className="bg-muted h-2 flex-1 rounded-full" data-e2e={`${e2ePrefix}-usage-bar`}>
                <div
                  className={`${getProgressBarColor(percentage, total)} h-2 rounded-full transition-all`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                  data-e2e={`${e2ePrefix}-usage-bar-fill`}
                />
              </div>
              <span
                className="text-muted-foreground text-xs font-medium whitespace-nowrap"
                data-e2e={`${e2ePrefix}-usage-percentage`}>
                {percentage}%
              </span>
            </div>
          );
        },
      },
      {
        id: 'action',
        size: 170,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.percentage > NEAR_LIMIT ? (
            <div className="flex justify-end pr-1">
              <Button
                type="quaternary"
                theme="outline"
                size="small"
                className="h-7 gap-1 px-2 text-xs whitespace-nowrap"
                onClick={() => handleRequestIncrease(row.original.bucket)}
                data-e2e={`${e2ePrefix}-request-limit-button`}>
                <Icon icon={ArrowUpIcon} className="h-4 w-4" />
                Request Limit
              </Button>
            </div>
          ) : null,
      },
    ],
    [e2ePrefix, handleRequestIncrease]
  );

  const groupedTableGroups = useMemo(
    () =>
      groups.map((g) => {
        const items = g.items as QuotaTableRow[];
        return {
          id: g.group,
          title: (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{g.group}</span>
              <span data-e2e={`${e2ePrefix}-group-count`}>
                <Badge
                  type="secondary"
                  className="text-2xs flex cursor-default items-center gap-1.5 px-1 py-0.5 font-bold">
                  {items.length}
                </Badge>
              </span>
            </div>
          ),
          rows: items,
        };
      }),
    [groups, e2ePrefix]
  );

  const [search, setSearch] = useState('');

  return (
    <div className="space-y-3">
      <TableSearch value={search} onChange={setSearch} placeholder="Search resources…" />
      <GroupedTable<QuotaTableRow>
        columns={columns}
        groups={groupedTableGroups}
        className="quotas-grouped-table"
        defaultExpanded="all"
        enableSorting
        enableSearch={false}
        search={search}
        onSearchChange={setSearch}
        searchFn={quotaSearchFn}
        getRowId={(row) => row.resourceType}
        groupHeaderClassName="bg-background text-foreground h-[42px] border-r px-4 py-3 text-xs font-medium transition-all dark:bg-white/2 dark:hover:bg-white/5"
        empty={<EmptyContent title="No quotas found" />}
      />
    </div>
  );
};
