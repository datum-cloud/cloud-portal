import { CodeEditor } from '@/components/code-editor/code-editor';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { TextCopy } from '@/components/text-copy/text-copy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { transformControlPlaneStatus } from '@/utils/misc';
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
        header: 'Name',
        accessorKey: 'name',
        enableSorting: false,
        cell: ({ row }: any) => {
          return (
            <TextCopy
              value={row.original?.name ?? ''}
              className="text-primary leading-none font-semibold"
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
          return <Badge variant="outline">{type}</Badge>;
        },
      },
      {
        header: 'Sources',
        accessorKey: 'sources',
        enableSorting: false,
        cell: ({ row }: any) => {
          return row.original?.sources?.map((source: string) => (
            <Badge variant="secondary" key={source}>
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
            <StatusBadge
              status={transformedStatus}
              type="badge"
              showTooltip
              badgeClassName="px-0"
              tooltipText={
                transformedStatus?.status === ControlPlaneStatus.Success ? 'Active' : undefined
              }
              readyText="Available"
            />
          );
        },
      },
      {
        header: '',
        accessorKey: 'config',
        enableSorting: false,
        meta: {
          className: 'w-[100px]',
        },
        cell: ({ row }: any) => {
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex h-8 items-center gap-1 focus:ring-0">
                  <SettingsIcon className="size-4" />
                  <span>Configuration</span>
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
    <Card className="bg-card text-card-foreground w-full rounded-xl border shadow">
      <CardHeader className="px-6">
        <CardTitle className="text-base leading-none font-medium">Sinks</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-0">
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No sinks found.' }}
        />
      </CardContent>
    </Card>
  );
};
