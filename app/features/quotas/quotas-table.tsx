import { DataTable } from '@/modules/datum-ui/components/data-table';
import { helpScoutAPI } from '@/modules/helpscout';
import { IAllowanceBucketControlResponse } from '@/resources/interfaces/allowance-bucket.interface';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { Button } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpIcon } from 'lucide-react';
import { useMemo } from 'react';

export const QuotasTable = ({
  data,
  resourceType,
  resource,
}: {
  data: IAllowanceBucketControlResponse[];
  resourceType: 'organization' | 'project';
  resource: IOrganization | IProjectControlResponse;
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

  const handleRequestIncrease = (quota: IAllowanceBucketControlResponse) => {
    helpScoutAPI.open();
    helpScoutAPI.navigate('/ask/message/');

    helpScoutAPI.prefill({
      subject: `Quota increase request: ${quota.resourceType}`,
      text:
        `Hello team,\n\n` +
        `I'd like to request an increase for the "${quota.resourceType}" quota.\n\n` +
        `Details:\n` +
        (resourceType === 'organization'
          ? `- Organization: ${(resource as IOrganization)?.displayName} (${(resource as IOrganization)?.name})\n`
          : `- Project: ${(resource as IProjectControlResponse)?.description} (${(resource as IProjectControlResponse)?.name})\n`) +
        `- Requested new limit: [please specify]\n` +
        `- Reason/justification: [brief context, e.g., upcoming workload/traffic]\n\n` +
        `Thank you!`,
    });
  };
  const columns: ColumnDef<IAllowanceBucketControlResponse>[] = useMemo(() => {
    return [
      {
        header: 'Resource Type',
        accessorKey: 'resourceType',
      },
      {
        header: 'Usage',
        enableSorting: false,
        accessorKey: 'status',
        cell: ({ row }) => {
          if (!row.original.status) {
            return <div>-</div>;
          }
          const { used, total, percentage } = calculateUsage(row.original.status);

          return (
            <div className="flex items-center gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">
                    {used} / {total}
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">({percentage}%)</span>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className={`${getProgressBarColor(percentage, total)} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
              {percentage > 90 && (
                <Button
                  type="quaternary"
                  theme="outline"
                  size="small"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => handleRequestIncrease(row.original)}>
                  <ArrowUpIcon className="h-4 w-4" />
                  Request Limit
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [data]);

  return <DataTable columns={columns} data={data} />;
};
