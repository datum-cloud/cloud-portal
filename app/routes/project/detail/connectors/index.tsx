import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { ControlPlaneStatus } from '@/resources/base';
import {
  createConnectorService,
  type Connector,
  useConnectors,
  useConnectorsWatch,
  useHydrateConnectors,
} from '@/resources/connectors';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Badge } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { LoaderFunctionArgs, MetaFunction, useLoaderData, useParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Connectors');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const connectorService = createConnectorService();
  const connectors = await connectorService.list(projectId);
  return connectors;
};

function getConnectorStatus(connector: Connector) {
  return transformControlPlaneStatus(connector.status);
}

function getCapabilitySummary(connector: Connector): string {
  const capabilities = connector.capabilities;
  if (!capabilities || capabilities.length === 0) return 'None';
  return capabilities.map((c) => c.type).join(', ');
}

export default function ConnectorsPage() {
  const { projectId } = useParams();
  const initialData = useLoaderData<typeof loader>();

  useHydrateConnectors(projectId ?? '', initialData ?? []);

  useConnectorsWatch(projectId ?? '');

  const { data: queryData } = useConnectors(projectId ?? '', {
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
  });

  const data = queryData ?? initialData ?? [];

  const columns: ColumnDef<Connector>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        meta: { className: 'min-w-32' },
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const status = getConnectorStatus(row.original);
          return (
            <BadgeStatus
              status={status}
              label={status.status === ControlPlaneStatus.Success ? 'Ready' : undefined}
            />
          );
        },
      },
      {
        header: 'Class',
        accessorKey: 'connectorClassName',
        cell: ({ row }) => {
          return (
            <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
              {row.original.connectorClassName}
            </Badge>
          );
        },
      },
      {
        header: 'Capabilities',
        accessorKey: 'capabilities',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <span className="text-muted-foreground text-sm">
              {getCapabilitySummary(row.original)}
            </span>
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: 'No connectors found',
      }}
      tableTitle={{
        title: 'Connectors',
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search',
        },
      }}
    />
  );
}
