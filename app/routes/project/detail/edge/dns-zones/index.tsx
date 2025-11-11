import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { DomainDnsHost } from '@/features/edge/domain/dns-host';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns-zone.interface';
import { ROUTE_PATH as DNS_ZONES_ACTIONS_PATH } from '@/routes/api/dns-zones';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, DataTable, DataTableRowActionsProps } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';
import { toast } from 'sonner';

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
  const fetcher = useFetcher({ key: 'delete-dns-zone' });
  const navigate = useNavigate();

  // revalidate every 5 seconds to keep DNS zones list fresh
  const { start: startRevalidator, clear: clearRevalidator } = useRevalidateOnInterval({
    interval: 5000,
    enabled: false,
  });

  const { confirm } = useConfirmationDialog();

  const deleteDnsZone = async (dnsZone: IDnsZoneControlResponse) => {
    await confirm({
      title: 'Delete DNS Zone',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{dnsZone.domainName}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: dnsZone?.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            action: DNS_ZONES_ACTIONS_PATH,
          }
        );
      },
    });
  };

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
        accessorKey: 'nameservers',
        cell: ({ row }) => {
          const nameservers = row.original?.status?.domainRef?.status?.nameservers;

          // Show spinner if nameservers data is not available yet
          if (!nameservers) {
            return <Loader2Icon className="text-muted-foreground size-4 animate-spin" />;
          }

          return <DomainDnsHost nameservers={nameservers} maxVisible={2} />;
        },
        meta: {
          sortPath: 'status.domainRef.status.nameservers',
          sortType: 'array',
          sortArrayBy: 'ips.registrantName',
        },
      },
      {
        id: 'recordCount',
        header: 'Records',
        accessorKey: 'status.recordCount',
        cell: ({ row }) => {
          const status = row.original.status;

          if (!status?.recordCount) return <>-</>;
          return status?.recordCount;
        },
        meta: {
          sortPath: 'status.recordCount',
          sortType: 'number',
          tooltip: 'The number of DNS records hosted in Datum',
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
        cell: ({ row }) => {
          return (
            <>
              {row.original.description && row.original.description.length > 0
                ? row.original.description
                : '-'}
            </>
          );
        },
      },
    ],
    [projectId]
  );

  const rowActions: DataTableRowActionsProps<IDnsZoneControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        variant: 'default',
        action: (row) =>
          navigate(
            getPathWithParams(paths.project.detail.dnsZones.edit, {
              projectId,
              dnsZoneId: row.name,
            })
          ),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteDnsZone(row),
      },
    ],
    [projectId]
  );

  useEffect(() => {
    // Start revalidator if any DNS zone doesn't have nameservers data yet
    const hasIncompleteData = data?.some((zone) => !zone.status?.domainRef?.status?.nameservers);

    if (hasIncompleteData) {
      startRevalidator();
    } else {
      clearRevalidator();
    }
  }, [data]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success('DNS Zone deleted successfully', {
          description: 'The DNS Zone has been deleted successfully',
        });
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      rowActions={rowActions}
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.dnsZones.edit, {
            projectId,
            dnsZoneId: row.name,
          })
        );
      }}
      emptyContent={{
        title: "Looks like you don't have any DNS zones added yet",
        actions: [
          {
            type: 'link',
            label: 'Add a DNS zone',
            to: getPathWithParams(paths.project.detail.dnsZones.new, {
              projectId,
            }),
            variant: 'default',
            icon: <ArrowRightIcon className="size-4" />,
            iconPosition: 'end',
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
            <Button type="primary" theme="solid" size="small">
              <PlusIcon className="size-4" />
              Add zone
            </Button>
          </Link>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search DNS zones',
        },
      }}
    />
  );
}
