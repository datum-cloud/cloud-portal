import { BadgeCopy } from '@/components/badge/badge-copy';
import { Table } from '@/components/table';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { IExportPolicyControlResponse } from '@/resources/export-policies';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@datum-cloud/datum-ui/card';
import { CodeEditor, type EditorLanguage } from '@datum-cloud/datum-ui/code-editor';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { MobileSheet } from '@datum-cloud/datum-ui/mobile-sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { CodeIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

function QueryButton({ value }: { value: string }) {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [open, setOpen] = useState(false);

  const buttonContent = (
    <>
      <Icon icon={CodeIcon} className="size-4" />
      <span>Query</span>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="quaternary"
          theme="outline"
          size="small"
          className="flex h-8 items-center gap-1 focus:ring-0"
          onClick={() => setOpen(true)}>
          {buttonContent}
        </Button>
        <MobileSheet open={open} onOpenChange={setOpen} title="MetricsQL Query">
          <div className="p-4">
            <CodeEditor
              value={value}
              language={'promql' as EditorLanguage}
              readOnly
              minHeight="100px"
            />
          </div>
        </MobileSheet>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="quaternary"
          theme="outline"
          size="small"
          className="flex h-8 items-center gap-1 focus:ring-0">
          {buttonContent}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[400px]">
        <CodeEditor
          value={value}
          language={'promql' as EditorLanguage}
          readOnly
          minHeight="100px"
        />
      </PopoverContent>
    </Popover>
  );
}

export const WorkloadSourcesTable = ({
  data,
}: {
  data: IExportPolicyControlResponse['sources'];
}) => {
  const columns = useMemo(
    () => [
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
        header: 'MetricsQL',
        accessorKey: 'metricsql',
        enableSorting: false,
        cell: ({ row }: any) => {
          return <QueryButton value={row.original?.metrics?.metricsql ?? ''} />;
        },
      },
    ],
    []
  );

  return (
    <Card className="overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardHeader className="mb-2 px-0 sm:px-6">
        <CardTitle>
          <span className="text-lg font-medium">Sources</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <Table.Client columns={columns} data={data ?? []} pagination={false} urlSync={false} />
      </CardContent>
    </Card>
  );
};
