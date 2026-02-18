import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { NameserverChips } from '@/components/nameserver-chips';
import { IExtendedControlPlaneStatus } from '@/resources/base';
import {
  createDnsZoneService,
  useDeleteDnsZone,
  useDnsZones,
  useDnsZonesWatch,
  useHydrateDnsZones,
  type DnsZone,
} from '@/resources/dns-zones';
import { useRefreshDomainRegistration } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, DataTable, DataTableRowActionsProps, Tooltip, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import {
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const dnsZoneService = createDnsZoneService();
  const zoneList = await dnsZoneService.list(projectId);

  return data({ zones: zoneList.items });
};

interface DnsZoneWithComputed extends DnsZone {
  _computed: {
    status: IExtendedControlPlaneStatus;
    hasError: boolean;
    hasNameservers: boolean;
    isLoading: boolean;
  };
}

export default function DnsZonesPage() {
  const { zones: initialZones } = useLoaderData<typeof loader>();
  const { projectId } = useParams();

  // Hydrate cache with SSR data (runs once on mount)
  useHydrateDnsZones(projectId ?? '', initialZones);

  // Subscribe to watch for real-time updates
  useDnsZonesWatch(projectId ?? '');

  // Read from React Query cache (gets updates from watch!)
  const { data } = useDnsZones(projectId ?? '', undefined, {
    // Don't refetch on mount - hydration already seeded the cache
    refetchOnMount: false,
    // Consider data fresh for 5 minutes (watch keeps it updated)
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const zones = data?.items ?? initialZones;

  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  // Pre-compute status for all zones (called once per zones change)
  const zonesWithStatus = useMemo<DnsZoneWithComputed[]>(() => {
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

  const deleteMutation = useDeleteDnsZone(projectId ?? '', {
    onSuccess: () => {
      toast.success('DNS', {
        description: 'The DNS has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error('DNS', {
        description: error.message || 'Failed to delete DNS',
      });
    },
  });

  const refreshMutation = useRefreshDomainRegistration(projectId ?? '', {
    onSuccess: () => {
      toast.success('DNS', {
        description: 'The DNS has been refreshed successfully',
      });
    },
    onError: (error) => {
      toast.error('DNS', {
        description: error.message || 'Failed to refresh DNS',
      });
    },
  });

  const refreshDomain = useCallback(
    (dnsZone: DnsZoneWithComputed) => {
      if (!dnsZone?.status?.domainRef?.name) return;
      refreshMutation.mutate(dnsZone.status.domainRef.name);
    },
    [refreshMutation]
  );

  const deleteDnsZone = useCallback(
    async (dnsZone: DnsZoneWithComputed) => {
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
          await deleteMutation.mutateAsync(dnsZone.name ?? '');
        },
      });
    },
    [deleteMutation, confirm]
  );

  const handleRowClick = useCallback(
    (row: DnsZoneWithComputed) => {
      navigate(
        getPathWithParams(paths.project.detail.dnsZones.detail.root, {
          projectId,
          dnsZoneId: row.name,
        })
      );
    },
    [projectId, navigate]
  );

  const columns: ColumnDef<DnsZoneWithComputed>[] = useMemo(
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
            return (
              <Tooltip message="DNS host information is being fetched and will appear shortly.">
                <span className="text-muted-foreground animate-pulse text-xs">Looking up...</span>
              </Tooltip>
            );
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

  const rowActions: DataTableRowActionsProps<DnsZoneWithComputed>[] = useMemo(
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
        label: 'Refresh nameservers',
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
