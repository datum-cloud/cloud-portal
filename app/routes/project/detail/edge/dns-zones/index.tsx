import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { LoaderOverlay } from '@/components/loader-overlay/loader-overlay';
import { NameserverChips } from '@/components/nameserver-chips';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { ROUTE_PATH as DNS_ZONES_ACTIONS_PATH } from '@/routes/api/dns-zones';
import { ROUTE_PATH as DOMAINS_REFRESH_PATH } from '@/routes/api/domains/refresh';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, DataTable, DataTableRowActionsProps, toast } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('DNS');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  // Fetch fresh data from API
  const zones = await dnsZonesControl.list(projectId);

  return data({ zones });
};

export default function DnsZonesPage() {
  const { zones } = useLoaderData<typeof loader>();
  const { projectId } = useParams();
  const deleteFetcher = useDatumFetcher({
    key: 'delete-dns-zone',
    onSuccess: () => {
      toast.success('DNS deleted successfully', {
        description: 'The DNS has been deleted successfully',
      });
    },
    onError: (data) => {
      toast.error(data.error || 'Failed to delete DNS');
    },
  });
  const refreshFetcher = useDatumFetcher({
    key: 'refresh-dns',
    onSuccess: () => {
      toast.success('DNS refreshed successfully', {
        description: 'The DNS has been refreshed successfully',
      });
    },
    onError: (data) => {
      toast.error(data.error || 'Failed to refresh DNS');
    },
  });
  const navigate = useNavigate();

  // revalidate every 3 seconds to keep DNS zones list fresh
  const revalidator = useRevalidateOnInterval({ enabled: false, interval: 3000 });

  const { confirm } = useConfirmationDialog();

  const refreshDomain = async (dnsZone: IDnsZoneControlResponse) => {
    if (!dnsZone?.status?.domainRef?.name) return;
    await refreshFetcher.submit(
      {
        id: dnsZone?.status?.domainRef?.name ?? '',
        projectId: projectId ?? '',
      },
      {
        method: 'PATCH',
        action: DOMAINS_REFRESH_PATH,
      }
    );
  };

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
        await deleteFetcher.submit(
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

  useEffect(() => {
    const hasDeletingZones = zones.some((zone) => zone.deletionTimestamp !== undefined);
    if (hasDeletingZones) {
      revalidator.start();
    } else {
      revalidator.clear();
    }

    return () => {
      revalidator.clear();
    };
  }, [zones]);

  const columns: ColumnDef<IDnsZoneControlResponse>[] = useMemo(
    () => [
      {
        id: 'domainName',
        header: 'Zone Name',
        accessorKey: 'domainName',
        cell: ({ row }) => {
          const status = transformControlPlaneStatus(row.original.status, {
            includeConditionDetails: true,
          });
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.domainName}</span>
              <BadgeProgrammingError
                className="rounded-lg px-2 py-0.5"
                isProgrammed={status.isProgrammed}
                programmedReason={status.programmedReason}
                statusMessage={status.message}
                errorReasons={null}
              />

              {row.original.deletionTimestamp && (
                <LoaderOverlay message="Deleting DNS. This may take a moment..." />
              )}
            </div>
          );
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

          return <NameserverChips data={nameservers} maxVisible={2} />;
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
            getPathWithParams(paths.project.detail.dnsZones.detail.root, {
              projectId,
              dnsZoneId: row.name,
            })
          ),
      },
      {
        key: 'refresh',
        label: 'Refresh',
        variant: 'default',
        hidden: (row) => !row.status?.domainRef?.name,
        action: (row) => refreshDomain(row),
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

  return (
    <DataTable
      columns={columns}
      data={zones}
      rowActions={rowActions}
      onRowClick={(row) => {
        if (row.deletionTimestamp) {
          return;
        }
        navigate(
          getPathWithParams(paths.project.detail.dnsZones.detail.root, {
            projectId,
            dnsZoneId: row.name,
          })
        );
      }}
      emptyContent={{
        title: "Looks like you don't have any DNS added yet",
        actions: [
          {
            type: 'link',
            label: 'Add zone',
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
        title: 'DNS',
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
          placeholder: 'Search DNS',
        },
      }}
    />
  );
}
