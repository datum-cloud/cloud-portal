import { ChipsOverflow } from '@/components/chips-overflow';
import { DateTime } from '@/components/date-time';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns-zone.interface';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, DataTable } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('DNS Zones');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const httpProxies = await dnsZonesControl.list(projectId);
  return httpProxies;
};

export default function DnsZonesPage() {
  const data = useLoaderData<typeof loader>();
  const { projectId } = useParams();

  const navigate = useNavigate();

  const columns: ColumnDef<IDnsZoneControlResponse>[] = useMemo(
    () => [
      {
        id: 'domainName',
        header: 'Zone Name',
        accessorKey: 'domainName',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.domainName}</span>;
        },
      },
      {
        id: 'nameservers',
        header: 'DNS Host',
        accessorKey: 'status.nameservers',
        cell: ({ row }) => {
          const status = row.original.status;

          if (!status?.nameservers || status?.nameservers.length === 0) return <>-</>;
          return (
            <ChipsOverflow items={status?.nameservers} maxVisible={2} variant="outline" wrap />
          );
        },
        meta: {
          sortPath: 'status.nameservers',
          sortType: 'array',
        },
      },
      {
        id: 'recordCount',
        header: 'Record Count',
        accessorKey: 'status.recordCount',
        cell: ({ row }) => {
          const status = row.original.status;

          if (!status?.recordCount) return <>-</>;
          return status?.recordCount;
        },
        meta: {
          sortPath: 'status.recordCount',
          sortType: 'number',
        },
      },
      {
        id: 'createdAt',
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
        meta: {
          sortPath: 'createdAt',
          sortType: 'date',
        },
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
      },
    ],
    [projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.dnsZones.detail.overview, {
            projectId,
            dnsZoneId: row.name,
          })
        );
      }}
      emptyContent={{
        title: 'No DNS Zone found.',
        subtitle: 'Create your first DNS zone to get started.',
        actions: [
          {
            type: 'link',
            label: 'New DNS Zone',
            to: getPathWithParams(paths.project.detail.dnsZones.new, {
              projectId,
            }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'DNS Zones',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.dnsZones.new, {
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New DNS Zone
            </Button>
          </Link>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search DNS zones...',
        },
      }}
    />
  );
}
