import { BadgeProgrammingError } from '@/components/badge/badge-programming-error';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { NameserverChips } from '@/components/nameserver-chips';
import { createActionsColumn, Table } from '@/components/table';
import {
  DnsZoneFormDialog,
  type DnsZoneFormDialogRef,
} from '@/features/edge/dns-zone/dns-zone-form-dialog';
import { PermissionButton, useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { IExtendedControlPlaneStatus } from '@/resources/base';
import {
  type DnsZone,
  createDnsZoneService,
  dnsZoneKeys,
  useDeleteDnsZone,
  useDnsZones,
  useDnsZonesWatch,
} from '@/resources/dns-zones';
import { useRefreshDomainRegistration } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getDnsZoneErrorGuidance, isDnsZoneErrored } from '@/utils/helpers/dns';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { createProjectListClientLoaderFromQueryKey } from '@/utils/helpers/project-list-client-loader';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import type { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type LoaderFunctionArgs, useNavigate, useParams, useSearchParams } from 'react-router';

const route = defineResourceRoute<DnsZone[]>({
  type: 'list',
  resource: 'dnszones',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view DNS.",
  metaTitle: 'DNS',
  seedCache: ({ data, projectId }) => [[dnsZoneKeys.list(projectId), data as DnsZone[]]] as never,
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<DnsZone[]>(args, {
    resource: 'dnszones',
    group: 'dns.networking.miloapis.com',
    scope: 'project',
    fetch: ({ projectId }) => createDnsZoneService().list(projectId!),
  });
export const meta = route.meta;

export const shouldRevalidate = skipRevalidateWithinSameProject;

export const clientLoader = createProjectListClientLoaderFromQueryKey<DnsZone[]>((projectId) =>
  dnsZoneKeys.list(projectId)
);

interface DnsZoneWithComputed extends DnsZone {
  _computed: {
    status: IExtendedControlPlaneStatus;
    hasError: boolean;
    /** Friendly guidance description (shared with the detail banner) shown in the error tooltip. */
    errorDescription?: string;
    hasNameservers: boolean;
    isLoading: boolean;
  };
}

export default route.Page(({ data: initialZones }) => (
  <DnsZonesInner initialZones={initialZones} />
));

function DnsZonesInner({ initialZones }: { initialZones: DnsZone[] }) {
  const { projectId = '' } = useParams<{ projectId: string }>();

  const { canCreate, canDelete, canEditDomain } = useResourcePermissions({
    resource: 'dnszones',
    group: 'dns.networking.miloapis.com',
    scope: 'project',
    verbs: ['create', 'delete'],
    subResources: [
      {
        resource: 'domains',
        group: 'networking.datumapis.com',
        scope: 'project',
        alias: 'domain',
        verbs: ['patch'],
      },
    ],
  });

  // Subscribe to watch for real-time updates
  useDnsZonesWatch(projectId);

  // Read from React Query cache (seeded synchronously from SSR loader data)
  const { data: zonesData = initialZones } = useDnsZones(projectId, undefined, {
    initialData: initialZones,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const dialogRef = useRef<DnsZoneFormDialogRef>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync dialog state from URL search params (for external links like ?action=create&domainName=...)
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      if (canCreate) {
        const domainName = searchParams.get('domainName') ?? undefined;
        dialogRef.current?.show(domainName);
      }
      setSearchParams(
        (prev) => {
          prev.delete('action');
          prev.delete('domainName');
          return prev;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams, canCreate]);

  // Pre-compute status for all zones (called once per zones change)
  const zonesWithStatus = useMemo<DnsZoneWithComputed[]>(() => {
    return zonesData.map((zone) => {
      const status = transformControlPlaneStatus(zone.status, {
        includeConditionDetails: true,
      });
      const hasError = isDnsZoneErrored(status);
      const hasNameservers = !!zone.status?.domainRef?.status?.nameservers;

      return {
        ...zone,
        _computed: {
          status,
          hasError,
          errorDescription: hasError
            ? getDnsZoneErrorGuidance(status.programmedReason, status.message).description
            : undefined,
          hasNameservers,
          isLoading: !hasNameservers && !hasError,
        },
      };
    });
  }, [zonesData]);

  const deleteMutation = useDeleteDnsZone(projectId, {
    onError: (error) => {
      toast.error('DNS', {
        description: error.message || 'Failed to delete DNS',
      });
    },
  });

  const refreshMutation = useRefreshDomainRegistration(projectId, {
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
          const { status, errorDescription } = row.original._computed;

          return (
            <div className="flex items-center gap-2" data-e2e="dns-zone-card">
              <span className="font-medium" data-e2e="dns-zone-name">
                {row.original.domainName}
              </span>
              <BadgeProgrammingError
                className="rounded-lg px-2 py-0.5"
                isProgrammed={status.isProgrammed}
                programmedReason={status.programmedReason}
                statusMessage={errorDescription ?? status.message}
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
          hidden: (row) => !canEditDomain || !row.status?.domainRef?.name,
          onClick: (row) => refreshDomain(row),
        },
        {
          label: 'Delete',
          variant: 'destructive',
          hidden: () => !canDelete,
          onClick: (row) => deleteDnsZone(row),
        },
      ]),
    ],
    [projectId, navigate, refreshDomain, deleteDnsZone, canEditDomain, canDelete]
  );

  return (
    <>
      <DnsZoneFormDialog ref={dialogRef} projectId={projectId} />
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
              disabled: !canCreate,
              tooltip: !canCreate ? "You don't have permission to add a DNS zone" : undefined,
            },
          ],
        }}
        actions={[
          <PermissionButton
            key="add-zone"
            resource="dnszones"
            verb="create"
            group="dns.networking.miloapis.com"
            scope="project"
            deniedReason="You don't have permission to add a DNS zone"
            type="primary"
            theme="solid"
            size="small"
            className="w-full sm:w-auto"
            data-e2e="create-dns-zone-button"
            onClick={() => dialogRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            Add zone
          </PermissionButton>,
        ]}
      />
    </>
  );
}
