import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { NameserverChips } from '@/components/nameserver-chips';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { useRevalidation } from '@/hooks/useRevalidation';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IExtendedControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { ROUTE_PATH as DNS_ZONES_ACTIONS_PATH } from '@/routes/api/dns-zones';
import { ROUTE_PATH as DOMAINS_REFRESH_PATH } from '@/routes/api/domains/refresh';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Button,
  DataTable,
  DataTableRowActionsProps,
  SpinnerIcon,
  toast,
} from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
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

// Extended zone type with pre-computed status
interface IDnsZoneWithComputed extends IDnsZoneControlResponse {
  _computed: {
    status: IExtendedControlPlaneStatus;
    hasError: boolean;
    hasNameservers: boolean;
    isLoading: boolean;
  };
}

export default function DnsZonesPage() {
  const { zones } = useLoaderData<typeof loader>();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  // Pre-compute status for all zones (called once per zones change)
  const zonesWithStatus = useMemo<IDnsZoneWithComputed[]>(() => {
    return zones.map((zone) => {
      const status = transformControlPlaneStatus(zone.status, {
        includeConditionDetails: true,
      });
      const hasError = status.isProgrammed === false && !!status.programmedReason;
      const hasNameservers = !!zone.status?.domainRef?.status?.nameservers;

      return {
        ...zone,
        _computed: {
          status,
          hasError,
          hasNameservers,
          isLoading: !hasNameservers && !hasError,
        },
      };
    });
  }, [zones]);

  // Check if any zone is still loading
  const hasLoadingZones = useMemo(
    () => zonesWithStatus.some((zone) => zone._computed.isLoading),
    [zonesWithStatus]
  );

  // Revalidate every 3 seconds when zones are loading
  const { revalidate } = useRevalidation({
    interval: hasLoadingZones ? 3000 : false,
  });

  const deleteFetcher = useDatumFetcher({
    key: 'delete-dns-zone',
    onSuccess: () => {
      toast.success('DNS', {
        description: 'The DNS has been deleted successfully',
      });
      revalidate();
    },
    onError: (data) => {
      toast.error('DNS', {
        description: data.error || 'Failed to delete DNS',
      });
    },
  });

  const refreshFetcher = useDatumFetcher({
    key: 'refresh-dns',
    onSuccess: () => {
      toast.success('DNS', {
        description: 'The DNS has been refreshed successfully',
      });
    },
    onError: (data) => {
      toast.error('DNS', {
        description: data.error || 'Failed to refresh DNS',
      });
    },
  });

  const refreshDomain = useCallback(
    async (dnsZone: IDnsZoneWithComputed) => {
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
    },
    [projectId, refreshFetcher]
  );

  const deleteDnsZone = useCallback(
    async (dnsZone: IDnsZoneWithComputed) => {
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
        confirmValue: dnsZone.domainName,
        confirmInputLabel: `Type "${dnsZone.domainName}" to confirm.`,
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
    },
    [projectId, deleteFetcher, confirm]
  );

  const handleRowClick = useCallback(
    (row: IDnsZoneWithComputed) => {
      navigate(
        getPathWithParams(paths.project.detail.dnsZones.detail.root, {
          projectId,
          dnsZoneId: row.name,
        })
      );
    },
    [projectId, navigate]
  );

  const columns: ColumnDef<IDnsZoneWithComputed>[] = useMemo(
    () => [
      {
        id: 'domainName',
        header: 'Zone Name',
        accessorKey: 'domainName',
        cell: ({ row }) => {
          const { status } = row.original._computed;

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
            </div>
          );
        },
      },
      {
        id: 'nameservers',
        header: 'DNS Host',
        accessorKey: 'nameservers',
        cell: ({ row }) => {
          const { hasNameservers, hasError } = row.original._computed;
          const nameservers = row.original?.status?.domainRef?.status?.nameservers;

          if (!hasNameservers) {
            // Show dash if there's an error, spinner if still loading
            if (hasError) {
              return <>-</>;
            }
            return <SpinnerIcon size="sm" aria-hidden="true" className="text-muted-foreground" />;
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
    []
  );

  const rowActions: DataTableRowActionsProps<IDnsZoneWithComputed>[] = useMemo(
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
    [projectId, navigate, refreshDomain, deleteDnsZone]
  );

  return (
    <DataTable
      columns={columns}
      data={zonesWithStatus}
      rowActions={rowActions}
      onRowClick={handleRowClick}
      emptyContent={{
        title: "let's add a DNS to get you started",
        actions: [
          {
            type: 'link',
            label: 'Add zone',
            to: getPathWithParams(paths.project.detail.dnsZones.new, {
              projectId,
            }),
            variant: 'default',
            icon: <Icon icon={PlusIcon} className="size-3" />,
            iconPosition: 'start',
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
              <Icon icon={PlusIcon} className="size-4" />
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
