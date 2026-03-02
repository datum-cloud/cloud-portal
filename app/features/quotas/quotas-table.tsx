import { DataTable } from '@/modules/datum-ui/components/data-table';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpIcon } from 'lucide-react';
import { useMemo } from 'react';

export const QuotasTable = ({
  data,
  resourceType,
  resource,
}: {
  data: AllowanceBucket[];
  resourceType: 'organization' | 'project';
  resource: Organization | Project;
}) => {
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

  const handleRequestIncrease = (quota: AllowanceBucket) => {
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
  };
  const columns: ColumnDef<AllowanceBucket>[] = useMemo(() => {
    const e2ePrefix = resourceType === 'organization' ? 'org-quota' : 'project-quota';

    return [
      {
        header: 'Resource Type',
        accessorKey: 'resourceType',
        cell: ({ row }) => {
          return (
            <div data-e2e={`${e2ePrefix}-card`}>
              <span data-e2e={`${e2ePrefix}-resource-type`}>{row.original.resourceType}</span>
            </div>
          );
        },
      },
      {
        header: 'Usage',
        enableSorting: false,
        accessorKey: 'status',
        cell: ({ row }) => {
          if (!row.original.status) {
            return (
              <div data-e2e={`${e2ePrefix}-usage`}>
                <span>-</span>
              </div>
            );
          }
          const { used, total, percentage } = calculateUsage(row.original.status);

          return (
            <div className="flex items-center gap-4" data-e2e={`${e2ePrefix}-usage`}>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" data-e2e={`${e2ePrefix}-usage-amount`}>
                    {used} / {total}
                  </span>
                  <span
                    className="text-muted-foreground text-xs font-medium"
                    data-e2e={`${e2ePrefix}-usage-percentage`}>
                    ({percentage}%)
                  </span>
                </div>
                <div
                  className="bg-muted h-2 w-full rounded-full"
                  data-e2e={`${e2ePrefix}-usage-bar`}>
                  <div
                    className={`${getProgressBarColor(percentage, total)} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                    data-e2e={`${e2ePrefix}-usage-bar-fill`}
                  />
                </div>
              </div>
              {percentage > 90 && (
                <Button
                  type="quaternary"
                  theme="outline"
                  size="small"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => handleRequestIncrease(row.original)}
                  data-e2e={`${e2ePrefix}-request-limit-button`}>
                  <Icon icon={ArrowUpIcon} className="h-4 w-4" />
                  Request Limit
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [data, resourceType]);

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyContent={{
        title: 'No quotas found',
        subtitle: 'No quota information is available at this time.',
      }}
    />
  );
};
