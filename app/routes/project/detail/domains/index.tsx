import { BadgeCopy } from '@/components/badge/badge-copy';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { NameserverChips } from '@/components/nameserver-chips';
import { createActionsColumn, Table } from '@/components/table';
import { BulkAddDomainsAction } from '@/features/edge/domain/bulk-add';
import {
  DomainFormDialog,
  type DomainFormDialogRef,
} from '@/features/edge/domain/domain-form-dialog';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DomainStatus } from '@/features/edge/domain/status';
import { PermissionButton, useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { useApp } from '@/providers/app.provider';
import {
  createDnsZoneService,
  dnsZoneKeys,
  useDnsZones,
  useDnsZonesWatch,
  type DnsZone,
} from '@/resources/dns-zones';
import {
  createDomainService,
  type Domain,
  useDeleteDomain,
  useDomains,
  useDomainsWatch,
  useRefreshDomainRegistration,
  domainKeys,
} from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { useTaskQueue, createProjectMetadata } from '@datum-cloud/datum-ui/task-queue';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { GlobeIcon, ListChecksIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { LoaderFunctionArgs, useNavigate, useParams, useSearchParams } from 'react-router';

type FormattedDomain = {
  name: string;
  domainName: string;
  registrar?: string;
  registrationFetching: boolean;
  nameservers?: NonNullable<Domain['status']>['nameservers'];
  nameserversFetching: boolean;
  expiresAt?: string;
  status: Domain['status'];
  statusType: 'verified' | 'pending';
  dnsZone?: DnsZone;
};

type DomainsListData = { domains: Domain[]; dnsZones: DnsZone[] };

const route = defineResourceRoute<DomainsListData>({
  type: 'list',
  resource: 'domains',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view domains.",
  metaTitle: 'Domains',
  seedCache: ({ data, projectId }) => {
    const d = data as DomainsListData;
    return [
      [domainKeys.list(projectId), d.domains],
      [dnsZoneKeys.list(projectId), d.dnsZones],
    ] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<DomainsListData>(args, {
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    fetch: async ({ projectId }) => {
      const [domains, dnsZones] = await Promise.all([
        createDomainService().list(projectId!),
        createDnsZoneService()
          .list(projectId!)
          .catch(() => [] as DnsZone[]),
      ]);
      return { domains, dnsZones };
    },
  });

export const meta = route.meta;

export default route.Page(({ data: { domains: initialDomains, dnsZones: initialDnsZones } }) => (
  <DomainsInner initialDomains={initialDomains} initialDnsZones={initialDnsZones} />
));

function DomainsInner({
  initialDomains,
  initialDnsZones,
}: {
  initialDomains: Domain[];
  initialDnsZones: DnsZone[];
}) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Cancel in-flight queries on unmount to prevent orphaned requests
  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey: domainKeys.list(projectId ?? '') });
      queryClient.cancelQueries({ queryKey: dnsZoneKeys.list(projectId ?? '') });
    };
  }, [queryClient, projectId]);

  // Subscribe to watch for real-time updates
  useDomainsWatch(projectId ?? '');
  useDnsZonesWatch(projectId ?? '');

  const { canCreate, canUpdate, canDelete, canViewDnsZones } = useResourcePermissions({
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['create', 'update', 'delete'],
    subResources: [
      {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        alias: 'dnsZones',
        verbs: ['list'],
      },
    ],
  });

  // Read from React Query cache (seeded synchronously from SSR loader data)
  const { data: domainsData } = useDomains(projectId ?? '', {
    initialData: initialDomains,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const { data: dnsZonesData } = useDnsZones(projectId ?? '', undefined, {
    initialData: initialDnsZones,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  // Use React Query data, fallback to SSR data
  const domains = domainsData ?? initialDomains;
  const dnsZones = dnsZonesData ?? initialDnsZones;

  // Build O(1) lookup map for DNS zones by domain name
  const dnsZoneMap = useMemo(() => {
    const map = new Map<string, DnsZone>();
    for (const zone of dnsZones) {
      if (zone.domainName) map.set(zone.domainName, zone);
    }
    return map;
  }, [dnsZones]);

  // Format domains for display
  const formattedDomains = useMemo<FormattedDomain[]>(() => {
    return domains.map((domain) => ({
      name: domain.name,
      domainName: domain.domainName,
      registrar: domain.status?.registration?.registrar?.name,
      registrationFetching: !!domain.status && !domain.status?.registration,
      nameservers: domain.status?.nameservers,
      nameserversFetching: !!domain.status && !domain.status?.nameservers?.length,
      expiresAt: domain.status?.registration?.expiresAt,
      status: domain.status,
      statusType: domain.status?.verified ? 'verified' : 'pending',
      dnsZone: dnsZoneMap.get(domain.domainName),
    }));
  }, [domains, dnsZoneMap]);

  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm } = useConfirmationDialog();
  const { enqueue, showSummary } = useTaskQueue();
  const { project, organization } = useApp();
  const domainFormRef = useRef<DomainFormDialogRef>(null);
  const [bulkAddPopoverOpen, setBulkAddPopoverOpen] = useState(false);

  // Open create dialog from URL search params (e.g. ?action=create)
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      if (canCreate) {
        domainFormRef.current?.show();
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, canCreate]);

  const deleteDomainMutation = useDeleteDomain(projectId ?? '');

  const refreshDomainMutation = useRefreshDomainRegistration(projectId ?? '', {
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been refreshed successfully',
      });
    },
    onError: (error) => {
      toast.error('Domain', {
        description: error.message || 'Failed to refresh domain',
      });
    },
  });

  const handleDeleteDomain = useCallback(
    async (domain: FormattedDomain) => {
      await confirm({
        title: 'Delete Domain',
        description: (
          <span>
            Are you sure you want to delete&nbsp;
            <strong>{domain.domainName}</strong>?
          </span>
        ),
        submitText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
        showConfirmInput: false,
        onSubmit: async () => {
          try {
            await deleteDomainMutation.mutateAsync(domain?.name ?? '');
          } catch (error) {
            toast.error('Domain', {
              description: (error as Error).message || 'Failed to delete domain',
            });
          }
        },
      });
    },
    [confirm, deleteDomainMutation]
  );

  const handleRefreshDomain = useCallback(
    async (domain: FormattedDomain) => {
      refreshDomainMutation.mutate(domain?.name ?? '');
    },
    [refreshDomainMutation]
  );

  const handleManageDnsZone = useCallback(
    async (domain: FormattedDomain) => {
      if (domain.dnsZone) {
        navigate(
          getPathWithParams(paths.project.detail.dnsZones.detail.root, {
            projectId,
            dnsZoneId: domain.dnsZone.name ?? '',
          })
        );
      } else {
        navigate(
          getPathWithParams(
            paths.project.detail.dnsZones.root,
            {
              projectId,
            },
            new URLSearchParams({
              action: 'create',
              domainName: domain.domainName,
            })
          )
        );
      }
    },
    [navigate, projectId]
  );

  const handleNavigateToDomain = useCallback(
    (row: FormattedDomain) => {
      navigate(
        getPathWithParams(paths.project.detail.domains.detail.overview, {
          projectId,
          domainId: row.name,
        })
      );
    },
    [navigate, projectId]
  );

  const columns: ColumnDef<FormattedDomain>[] = useMemo(
    () => [
      {
        header: 'Domain',
        accessorKey: 'domainName',
        id: 'domainName',
        cell: ({ row }) => {
          return (
            <span data-e2e="domain-card">
              <span data-e2e="domain-name">{row.original.domainName}</span>
            </span>
          );
        },
        meta: {
          sortPath: 'domainName',
          sortType: 'text',
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return <DomainStatus domainStatus={row.original.status} />;
        },
        meta: {
          sortPath: 'status.verified',
          sortType: 'boolean',
        },
      },
      {
        id: 'registrar',
        header: 'Registrar',
        accessorKey: 'registrar',
        cell: ({ row }) => {
          if (row.original.registrationFetching) {
            return (
              <span data-e2e="domain-registrar">
                <Tooltip message="Registrar information is being fetched and will appear shortly.">
                  <span className="text-muted-foreground animate-pulse text-xs">Looking up...</span>
                </Tooltip>
              </span>
            );
          }
          if (row.original.registrar) {
            return (
              <span data-e2e="domain-registrar">
                <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
                  {row.original.registrar}
                </Badge>
              </span>
            );
          }
          if (row.original.status?.registration) {
            return (
              <span data-e2e="domain-registrar">
                <Tooltip message="Registrar information is not publicly available. This is common when WHOIS privacy protection is enabled.">
                  <Badge
                    type="quaternary"
                    theme="outline"
                    className="rounded-xl text-xs font-normal">
                    Private
                  </Badge>
                </Tooltip>
              </span>
            );
          }
          return <span data-e2e="domain-registrar">-</span>;
        },
        meta: {
          sortPath: 'registrar',
          sortType: 'text',
        },
      },
      {
        id: 'nameservers',
        header: 'DNS Host',
        accessorKey: 'nameservers',
        cell: ({ row }) => {
          if (row.original.nameserversFetching) {
            return (
              <span data-e2e="domain-nameservers">
                <Tooltip message="DNS host information is being fetched and will appear shortly.">
                  <span className="text-muted-foreground animate-pulse text-xs">Looking up...</span>
                </Tooltip>
              </span>
            );
          }
          return (
            <span data-e2e="domain-nameservers">
              <NameserverChips data={row.original?.nameservers} maxVisible={2} />
            </span>
          );
        },
        meta: {
          sortPath: 'status.nameservers',
          sortType: 'array',
          sortArrayBy: 'ips.registrantName',
        },
      },
      {
        id: 'expiresAt',
        header: 'Expiration Date',
        accessorKey: 'expiresAt',
        cell: ({ row }) => {
          return (
            <span data-e2e="domain-expiration">
              <DomainExpiration expiresAt={row.original.expiresAt} />
            </span>
          );
        },
        meta: {
          sortPath: 'expiresAt',
          sortType: 'date',
        },
      },
      {
        id: 'resourceName',
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <BadgeCopy value={row.original.name} badgeType="muted" badgeTheme="solid" />;
        },
        meta: {
          sortPath: 'name',
          sortType: 'text',
        },
      },
      createActionsColumn<FormattedDomain>([
        {
          label: 'Refresh',
          hidden: () => !canUpdate,
          onClick: (row) => handleRefreshDomain(row),
        },
        {
          label: 'Manage DNS Zone',
          hidden: () => !canViewDnsZones,
          onClick: (row) => handleManageDnsZone(row),
        },
        {
          label: 'Delete',
          variant: 'destructive',
          hidden: () => !canDelete,
          onClick: (row) => handleDeleteDomain(row),
        },
      ]),
    ],
    [
      projectId,
      handleNavigateToDomain,
      handleRefreshDomain,
      handleManageDnsZone,
      handleDeleteDomain,
      canUpdate,
      canViewDnsZones,
      canDelete,
    ]
  );

  const handleDeleteDomains = async (domains: FormattedDomain[], clearSelection: () => void) => {
    await confirm({
      title: 'Delete Domains',
      description: (
        <span>
          Are you sure you want to delete <strong>{domains.length}</strong> domains?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => {
        const metadata =
          project && organization
            ? createProjectMetadata(
                { id: project.name, name: project.displayName || project.name },
                { id: organization.name, name: organization.displayName || organization.name }
              )
            : undefined;

        const taskTitle = `Delete ${domains.length} domains`;

        enqueue({
          title: taskTitle,
          icon: <Icon icon={GlobeIcon} className="size-4" />,
          items: domains,
          metadata,
          itemConcurrency: 2,
          getItemId: (d) => d.name,
          processItem: async (domain) => {
            await deleteDomainMutation.mutateAsync(domain.name);
          },
          completionActions: (_result, { failed, items }) => {
            return [
              ...(failed > 0
                ? [
                    {
                      children: 'Summary',
                      type: 'quaternary' as const,
                      theme: 'outline' as const,
                      size: 'xs' as const,
                      onClick: () =>
                        showSummary(
                          taskTitle,
                          items.map((item) => ({
                            id: item.id,
                            label: item.data?.domainName ?? item.id,
                            status: item.status === 'failed' ? 'failed' : 'success',
                            message: item.message,
                          }))
                        ),
                    },
                  ]
                : []),
              {
                children: 'View Domains',
                type: 'primary',
                theme: 'outline',
                size: 'xs',
                onClick: () =>
                  navigate(
                    getPathWithParams(paths.project.detail.domains.root, { projectId: projectId! })
                  ),
              },
            ];
          },
          onComplete: () => {
            queryClient.invalidateQueries({ queryKey: domainKeys.list(projectId ?? '') });
          },
        });

        clearSelection();
      },
    });
  };

  return (
    <>
      <Table.Client
        columns={columns}
        data={formattedDomains}
        getRowId={(row) => row.name}
        title="Domains"
        onRowClick={handleNavigateToDomain}
        description="Manage domains as programmatic resources no matter where they are registered, or where the DNS is hosted. Note: verification of domain ownership is required for some features."
        search="Search"
        actions={[
          canCreate ? <BulkAddDomainsAction key="bulk-add" projectId={projectId!} /> : null,
          <PermissionButton
            key="create"
            resource="domains"
            verb="create"
            group="networking.datumapis.com"
            scope="project"
            deniedReason="You don't have permission to add a domain"
            type="primary"
            theme="solid"
            size="small"
            className="w-full sm:w-auto"
            data-e2e="create-domain-button"
            onClick={() => domainFormRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            Add domain
          </PermissionButton>,
        ].filter(Boolean)}
        multiActions={
          canDelete
            ? [
                {
                  label: 'Delete Selected',
                  icon: <Icon icon={TrashIcon} className="size-4" />,
                  variant: 'destructive',
                  onClick: (
                    selectedRows: FormattedDomain[],
                    { clearSelection }: { clearSelection: () => void }
                  ) => handleDeleteDomains(selectedRows, clearSelection),
                },
              ]
            : []
        }
        empty={{
          // Title stays constant; action buttons hide when canCreate is false so
          // restricted users aren't presented with a dialog they can't submit.
          title: "let's add a domain to get you started",
          actions: canCreate
            ? [
                {
                  label: 'Add domain',
                  type: 'button',
                  icon: <Icon icon={PlusIcon} className="size-3" />,
                  onClick: () => domainFormRef.current?.show(),
                },
                {
                  label: 'Bulk add domains',
                  type: 'button',
                  variant: 'outline',
                  icon: <Icon icon={ListChecksIcon} className="size-3" />,
                  onClick: () => setBulkAddPopoverOpen(true),
                },
              ]
            : [],
        }}
      />

      <DomainFormDialog
        ref={domainFormRef}
        projectId={projectId!}
        onSuccess={(domain) => {
          navigate(
            getPathWithParams(paths.project.detail.domains.detail.overview, {
              projectId,
              domainId: domain.name,
            })
          );
        }}
      />

      {/* Controlled BulkAddDomainsAction for empty content button - renders as Dialog */}
      <BulkAddDomainsAction
        projectId={projectId!}
        popoverOpen={bulkAddPopoverOpen}
        onPopoverOpenChange={setBulkAddPopoverOpen}
      />
    </>
  );
}
