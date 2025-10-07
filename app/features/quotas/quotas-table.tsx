import { DataTable } from '@/components/data-table';
import { IAllowanceBucketControlResponse } from '@/resources/interfaces/allowance-bucket';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const QuotasTable = ({
  data,
  title,
  description,
}: {
  data: IAllowanceBucketControlResponse[];
  title?: string;
  description?: string;
}) => {
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
          const { allocated = 0, limit = 0 } = row.original.status;
          // Ensure both used and total are numbers for safe division, and handle bigint if present
          const used = typeof allocated === 'bigint' ? Number(allocated) : (allocated ?? 0);
          const total = typeof limit === 'bigint' ? Number(limit) : (limit ?? 0);
          const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

          // Determine progress bar color based on thresholds
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

          return (
            <div className="flex flex-col gap-1">
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
          );
        },
      },
    ];
  }, [data]);

  return (
    <DataTable
      columns={columns}
      data={data}
      tableTitle={{
        title: title ?? 'Quotas',
        description: description ?? 'View usage against quotas for each resource.',
      }}
    />
  );
};
