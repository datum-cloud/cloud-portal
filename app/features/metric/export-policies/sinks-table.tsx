import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { CodeEditor } from '@/components/code-editor/code-editor';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Badge } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Card, CardHeader, CardTitle, CardContent } from '@datum-ui/components';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { find } from 'es-toolkit/compat';
import { SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';

export const WorkloadSinksTable = ({
  data,
  status,
}: {
  data: IExportPolicyControlResponse['sinks'];
  status: IExportPolicyControlResponse['status'];
}) => {
  const columns = useMemo(() => {
    const sinkStatus = status?.sinks;
    return [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        enableSorting: false,
        cell: ({ row }: any) => {
          return (
            <BadgeCopy
              value={row.original?.name ?? ''}
              text={row.original?.name ?? ''}
              badgeType="muted"
              badgeTheme="solid"
            />
          );
        },
      },
      {
        header: 'Type',
        accessorKey: 'type',
        enableSorting: false,
        cell: ({ row }: any) => {
          const type = row.original?.target?.prometheusRemoteWrite ? 'Prometheus' : 'Unknown';
          return (
            <Badge type="quaternary" theme="outline">
              {type}
            </Badge>
          );
        },
      },
      {
        header: 'Sources',
        accessorKey: 'sources',
        enableSorting: false,
        cell: ({ row }: any) => {
          return row.original?.sources?.map((source: string) => (
            <Badge theme="outline" key={source}>
              <span>{source}</span>
            </Badge>
          ));
        },
      },
      {
        header: 'Status',
        enableSorting: false,
        cell: ({ row }: any) => {
          const currentStatus = find(sinkStatus, (s) => s.name === row.original?.name);
          const transformedStatus = transformControlPlaneStatus(currentStatus);
          return (
            <BadgeStatus
              status={transformedStatus}
              label={
                transformedStatus?.status === ControlPlaneStatus.Success ? 'Available' : undefined
              }
              showTooltip
              tooltipText={
                transformedStatus?.status === ControlPlaneStatus.Success ? 'Active' : undefined
              }
            />
          );
        },
      },
      {
        header: '',
        accessorKey: 'config',
        enableSorting: false,
        meta: {
          className: 'w-[100px] text-right',
        },
        cell: ({ row }: any) => {
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="quaternary" theme="outline" size="small" className="h-8 focus:ring-0">
                  <SettingsIcon className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="min-w-[500px]">
                <CodeEditor
                  value={JSON.stringify(row.original?.target?.prometheusRemoteWrite, null, 2)}
                  language="json"
                  readOnly
                  minHeight="300px"
                />
              </PopoverContent>
            </Popover>
          );
        },
      },
    ];
  }, [status]);

  return (
    <Card className="px-3 py-8 shadow">
      <CardHeader className="mb-2">
        <CardTitle>
          <span className="text-lg font-medium">Sinks</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No sinks found.' }}
        />
      </CardContent>
    </Card>
  );
};
