import { CodeEditor } from '@/components/code-editor/code-editor';
import { DataTable } from '@/components/data-table/data-table';
import { TextCopy } from '@/components/text-copy/text-copy';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { Button } from '@datum-ui/components';
import { Card, CardHeader, CardTitle, CardContent } from '@shadcn/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { CodeIcon } from 'lucide-react';
import { useMemo } from 'react';

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
            <TextCopy
              value={row.original?.name ?? ''}
              className="text-primary leading-none font-semibold"
            />
          );
        },
      },
      {
        header: 'MetricsQL',
        accessorKey: 'metricsql',
        enableSorting: false,
        cell: ({ row }: any) => {
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex h-8 items-center gap-1 focus:ring-0">
                  <CodeIcon className="size-4" />
                  <span>Query</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="min-w-[400px]">
                <CodeEditor
                  value={row.original?.metrics?.metricsql}
                  language="promql"
                  readOnly
                  minHeight="100px"
                />
              </PopoverContent>
            </Popover>
          );
        },
      },
    ],
    []
  );

  return (
    <Card className="bg-card text-card-foreground w-full rounded-xl border shadow">
      <CardHeader className="px-6">
        <CardTitle className="text-base leading-none font-medium">Sources</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-0">
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No sources found.' }}
        />
      </CardContent>
    </Card>
  );
};
