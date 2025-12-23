import { BadgeCopy } from '@/components/badge/badge-copy';
import { CodeEditor } from '@/components/code-editor/code-editor';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { Button } from '@datum-ui/components';
import { Card, CardHeader, CardTitle, CardContent } from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
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
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="quaternary"
                  theme="outline"
                  size="small"
                  className="flex h-8 items-center gap-1 focus:ring-0">
                  <IconWrapper icon={CodeIcon} className="size-4" />
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
    <Card className="px-3 py-8 shadow">
      <CardHeader className="mb-2">
        <CardTitle>
          <span className="text-lg font-medium">Sources</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No sources found.' }}
        />
      </CardContent>
    </Card>
  );
};
