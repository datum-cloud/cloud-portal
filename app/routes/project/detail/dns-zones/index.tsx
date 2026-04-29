import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { NameserverChips } from '@/components/nameserver-chips';
import { createActionsColumn, Table } from '@/components/table';
import {
  DnsZoneFormDialog,
  type DnsZoneFormDialogRef,
} from '@/features/edge/dns-zone/dns-zone-form-dialog';
import { IExtendedControlPlaneStatus } from '@/resources/base';
import {
  createDnsZoneService,
  useDeleteDnsZone,
  useDnsZones,
  useDnsZonesWatch,
  type DnsZone,
} from '@/resources/dns-zones';
import { useRefreshDomainRegistration } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import type { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
  useNavigate,
  useParams,
  useSearchParams,
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
  const zones = await dnsZoneService.list(projectId);

  return data({ zones });
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

  // Subscribe to watch for real-time updates
  useDnsZonesWatch(projectId ?? '');

  // Read from React Query cache (seeded synchronously from SSR loader data)
  const { data: zonesData = [] } = useDnsZones(projectId ?? '', undefined, {
    initialData: initialZones,
    initialDataUpdatedAt: Date.now(),
    // Don't refetch on mount - initialData already seeded the cache
    refetchOnMount: false,
    // Consider data fresh for 5 minutes (watch keeps it updated)
    staleTime: QUERY_STALE_TIME,
  });

  // Use React Query data, fallback to SSR data
  const zones = zonesData ?? initialZones;

  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const dialogRef = useRef<DnsZoneFormDialogRef>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync dialog state from URL search params (for external links like ?action=create&domainName=...)
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      const domainName = searchParams.get('domainName') ?? undefined;
      dialogRef.current?.show(domainName);
      setSearchParams(
        (prev) => {
          prev.delete('action');
          prev.delete('domainName');
          return prev;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

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
      const displayLabel = dnsZone.displayName || dnsZone.domainName || dnsZone.name;

      await confirm({
        title: 'Delete DNS Zone',
        description: (
          <span>
            Are you sure you want to delete&nbsp;
            <strong>{displayLabel}</strong>?
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: true,
        onSubmit: async () => {
          await deleteMutation.mutateAsync(dnsZone.name ?? '');
        },
      });
    },
    [deleteMutation, confirm]
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
            <div className="flex items-center gap-2" data-e2e="dns-zone-card">
              <span className="font-medium" data-e2e="dns-zone-name">
                {row.original.domainName}
              </span>
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
            if (hasError) {
              return <span data-e2e="dns-zone-nameservers">-</span>;
            }
            return (
              <Tooltip message="DNS host information is being fetched and will appear shortly.">
                <span
                  className="text-muted-foreground animate-pulse text-xs"
                  data-e2e="dns-zone-nameservers">
                  Looking up...
                </span>
              </Tooltip>
            );
          }

          return (
            <span data-e2e="dns-zone-nameservers">
              <NameserverChips data={nameservers} maxVisible={2} />
            </span>
          );
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

          if (!status?.recordCount) {
            return <span data-e2e="dns-zone-records">-</span>;
          }
          return <span data-e2e="dns-zone-records">{status?.recordCount}</span>;
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
          return (
            row.original.createdAt && (
              <span data-e2e="dns-zone-created-at">
                <DateTime date={row.original.createdAt} />
              </span>
            )
          );
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
            <span data-e2e="dns-zone-description">
              {row.original.description && row.original.description.length > 0
                ? row.original.description
                : '-'}
            </span>
          );
        },
      },
      createActionsColumn<DnsZoneWithComputed>([
        {
          label: 'Edit',
          onClick: (row) =>
            navigate(
              getPathWithParams(paths.project.detail.dnsZones.detail.root, {
                projectId,
                dnsZoneId: row.name,
              })
            ),
        },
        {
          label: 'Refresh nameservers',
          hidden: (row) => !row.status?.domainRef?.name,
          onClick: (row) => refreshDomain(row),
        },
        {
          label: 'Delete',
          variant: 'destructive',
          onClick: (row) => deleteDnsZone(row),
        },
      ]),
    ],
    [projectId, navigate, refreshDomain, deleteDnsZone]
  );

  return (
    <>
      <DnsZoneFormDialog ref={dialogRef} projectId={projectId ?? ''} />
      <Table.Client
        columns={columns}
        data={zonesWithStatus}
        title="DNS"
        description="Manage DNS zones as collections of records that control how your domains route traffic. Each zone covers a single domain or subdomain."
        search="Search"
        onRowClick={(row) =>
          navigate(
            getPathWithParams(paths.project.detail.dnsZones.detail.root, {
              projectId,
              dnsZoneId: row.name,
            })
          )
        }
        empty={{
          title: "let's add a DNS to get you started",
          actions: [
            {
              type: 'button',
              label: 'Add zone',
              onClick: () => dialogRef.current?.show(),
              icon: <Icon icon={PlusIcon} className="size-3" />,
            },
          ],
        }}
        actions={[
          <Button
            key="add-zone"
            type="primary"
            theme="solid"
            size="small"
            className="w-full sm:w-auto"
            data-e2e="create-dns-zone-button"
            onClick={() => dialogRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            Add zone
          </Button>,
        ]}
      />
    </>
  );
}
