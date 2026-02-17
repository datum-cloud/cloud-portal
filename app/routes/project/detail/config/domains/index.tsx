import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { NameserverChips } from '@/components/nameserver-chips';
import { BulkAddDomainsAction } from '@/features/edge/domain/bulk-add';
import {
  DomainFormDialog,
  type DomainFormDialogRef,
} from '@/features/edge/domain/domain-form-dialog';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DataTable, type DataTableRef } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { useApp } from '@/providers/app.provider';
import {
  createDnsZoneService,
  dnsZoneKeys,
  useDnsZones,
  useDnsZonesWatch,
  useHydrateDnsZones,
  type DnsZone,
} from '@/resources/dns-zones';
import {
  createDomainService,
  type Domain,
  useDeleteDomain,
  useDomains,
  useDomainsWatch,
  useHydrateDomains,
  useRefreshDomainRegistration,
  domainKeys,
} from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Badge,
  Button,
  toast,
  Tooltip,
  useTaskQueue,
  createProjectMetadata,
} from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { GlobeIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useMemo, useEffect, useRef } from 'react';
import {
  data,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

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

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Domains');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const [domains, dnsZones] = await Promise.all([
    createDomainService().list(projectId),
    createDnsZoneService().list(projectId),
  ]);

  return data({ domains, dnsZones });
};

export default function DomainsPage() {
  const { projectId } = useParams();
  const { domains: initialDomains, dnsZones: initialDnsZones } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Cancel in-flight queries on unmount to prevent orphaned requests
  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey: domainKeys.list(projectId ?? '') });
      queryClient.cancelQueries({ queryKey: dnsZoneKeys.list(projectId ?? '') });
    };
  }, [queryClient, projectId]);

  // Hydrate cache with SSR data (runs once on mount)
  useHydrateDomains(projectId ?? '', initialDomains);
  useHydrateDnsZones(projectId ?? '', initialDnsZones.items);

  // Subscribe to watch for real-time updates
  useDomainsWatch(projectId ?? '');
  useDnsZonesWatch(projectId ?? '');

  // Read from React Query cache (gets updates from watch!)
  const { data: domainsData } = useDomains(projectId ?? '', {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dnsZonesData } = useDnsZones(projectId ?? '', undefined, {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const domains = domainsData ?? initialDomains;
  const dnsZones = dnsZonesData?.items ?? initialDnsZones.items;

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

  const { confirm } = useConfirmationDialog();
  const { enqueue, showSummary } = useTaskQueue();
  const { project, organization } = useApp();
  const domainFormRef = useRef<DomainFormDialogRef>(null);
  const tableRef = useRef<DataTableRef<FormattedDomain>>(null);

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

  const handleDeleteDomain = async (domain: FormattedDomain) => {
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
          toast.success('Domain', {
            description: 'The domain has been deleted successfully',
          });
        } catch (error) {
          toast.error('Domain', {
            description: (error as Error).message || 'Failed to delete domain',
          });
        }
      },
    });
  };

  const handleRefreshDomain = async (domain: FormattedDomain) => {
    refreshDomainMutation.mutate(domain?.name ?? '');
  };

  const handleManageDnsZone = async (domain: FormattedDomain) => {
    if (domain.dnsZone) {
      navigate(
        getPathWithParams(paths.project.detail.dnsZones.detail.overview, {
          projectId,
          dnsZoneId: domain.dnsZone.name ?? '',
        })
      );
    } else {
      navigate(
        getPathWithParams(
          paths.project.detail.dnsZones.new,
          {
            projectId,
          },
          new URLSearchParams({
            domainName: domain.domainName,
          })
        )
      );
    }
  };

  const columns: ColumnDef<FormattedDomain>[] = useMemo(
    () => [
      {
        header: 'Domain',
        accessorKey: 'domainName',
        id: 'domainName',
        cell: ({ row }) => {
          return (
            <div data-e2e="domain-card">
              <span data-e2e="domain-name">{row.original.domainName}</span>
            </div>
          );
        },
        meta: {
          sortPath: 'domainName',
          sortType: 'text',
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
    ],
    []
  );

  const rowActions: DataTableRowActionsProps<FormattedDomain>[] = useMemo(
    () => [
      {
        key: 'refresh',
        label: 'Refresh',
        variant: 'default',
        action: (row) => handleRefreshDomain(row),
      },
      {
        key: 'dnsZone',
        label: 'Manage DNS Zone',
        variant: 'default',
        action: (row) => handleManageDnsZone(row),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => handleDeleteDomain(row),
      },
    ],
    [projectId]
  );

  const handleDeleteDomains = async (domains: FormattedDomain[]) => {
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

        tableRef.current?.clearSelection();
      },
    });
  };

  return (
    <>
      <DataTable
        ref={tableRef}
        pageSize={50}
        columns={columns}
        data={formattedDomains}
        enableMultiSelect
        getRowId={(row) => row.name}
        onRowClick={(row) => {
          navigate(
            getPathWithParams(paths.project.detail.domains.detail.overview, {
              projectId,
              domainId: row.name,
            })
          );
        }}
        emptyContent={{
          title: "let's add a domain to get you started",
          actions: [
            {
              type: 'button',
              label: 'Add domain',
              onClick: () => domainFormRef.current?.show(),
              variant: 'default',
              icon: <Icon icon={PlusIcon} className="size-3" />,
              iconPosition: 'start',
            },
          ],
        }}
        tableTitle={{
          title: 'Domains',
          actions: (
            <div className="flex items-center gap-3">
              <BulkAddDomainsAction projectId={projectId!} />
              <Button
                type="primary"
                theme="solid"
                size="small"
                onClick={() => domainFormRef.current?.show()}>
                <Icon icon={PlusIcon} className="size-4" />
                Add domain
              </Button>
            </div>
          ),
        }}
        toolbar={{
          layout: 'compact',
          includeSearch: {
            placeholder: 'Search domains',
          },
          filtersDisplay: 'dropdown',
          showRowCount: true,
        }}
        multiActions={[
          {
            key: 'delete',
            label: 'Delete Selected',
            size: 'small',
            icon: <Icon icon={TrashIcon} className="size-4" />,
            type: 'danger',
            theme: 'outline',
            action: (rows) => handleDeleteDomains(rows),
          },
        ]}
        rowActions={rowActions}
      />

      <DomainFormDialog ref={domainFormRef} projectId={projectId!} />
    </>
  );
}
