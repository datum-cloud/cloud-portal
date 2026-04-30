import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { Table } from '@/components/table';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ControlPlaneStatus } from '@/resources/base';
import { IExportPolicyControlResponse } from '@/resources/export-policies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@datum-cloud/datum-ui/card';
import { CodeEditor } from '@datum-cloud/datum-ui/code-editor';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { MobileSheet } from '@datum-cloud/datum-ui/mobile-sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { find } from 'es-toolkit/compat';
import { SettingsIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

function SinkConfigButton({ value }: { value: string }) {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [open, setOpen] = useState(false);

  const buttonContent = <Icon icon={SettingsIcon} className="size-4" />;

  if (isMobile) {
    return (
      <>
        <Button
          type="quaternary"
          theme="outline"
          size="small"
          className="h-8 focus:ring-0"
          onClick={() => setOpen(true)}>
          {buttonContent}
        </Button>
        <MobileSheet open={open} onOpenChange={setOpen} title="Sink Configuration">
          <div className="p-4">
            <CodeEditor value={value} language="json" readOnly minHeight="200px" />
          </div>
        </MobileSheet>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="quaternary" theme="outline" size="small" className="h-8 focus:ring-0">
          {buttonContent}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[500px]">
        <CodeEditor value={value} language="json" readOnly minHeight="300px" />
      </PopoverContent>
    </Popover>
  );
}

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
        id: 'status',
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
            <SinkConfigButton
              value={JSON.stringify(row.original?.target?.prometheusRemoteWrite, null, 2)}
            />
          );
        },
      },
    ];
  }, [status]);

  return (
    <Card className="overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardHeader className="mb-2 px-0 sm:px-6">
        <CardTitle>
          <span className="text-lg font-medium">Sinks</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <Table.Client columns={columns} data={data ?? []} pagination={false} urlSync={false} />
      </CardContent>
    </Card>
  );
};
