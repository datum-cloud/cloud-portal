import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { NameserverChips } from '@/components/nameserver-chips';
import { BulkAddDomainsAction } from '@/features/edge/domain/bulk-add';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { DataTableFilter } from '@/modules/datum-ui/components/data-table';
import {
  createDnsZoneService,
  useDnsZones,
  useDnsZonesWatch,
  useHydrateDnsZones,
  type DnsZone,
} from '@/resources/dns-zones';
import {
  createDomainService,
  type Domain,
  domainSchema,
  useCreateDomain,
  useDeleteDomain,
  useDomains,
  useDomainsWatch,
  useHydrateDomains,
  useRefreshDomainRegistration,
} from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge, Button, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  data,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';
import { z } from 'zod';

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

  // Services now use global axios client with AsyncLocalStorage
  const domainService = createDomainService();
  const domains = await domainService.list(projectId);

  const dnsZonesService = createDnsZoneService();
  const dnsZones = await dnsZonesService.list(projectId);
  return data({ domains, dnsZones });
};

export default function DomainsPage() {
  const { projectId } = useParams();
  const { domains: initialDomains, dnsZones: initialDnsZones } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

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
      dnsZone: dnsZones.find((dnsZone) => dnsZone.domainName === domain.domainName),
    }));
  }, [domains, dnsZones]);

  const { confirm } = useConfirmationDialog();

  const [openAddDialog, setOpenAddDialog] = useState(false);

  const createDomainMutation = useCreateDomain(projectId ?? '', {
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been added to your project',
      });
      setOpenAddDialog(false);
    },
    onError: (error) => {
      toast.error('Domain', {
        description: error.message || 'Failed to add domain',
      });
    },
  });

  const deleteDomainMutation = useDeleteDomain(projectId ?? '', {
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error('Domain', {
        description: error.message || 'Failed to delete domain',
      });
    },
  });

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

  const handleAddDomain = async (formData: z.infer<typeof domainSchema>) => {
    await createDomainMutation.mutateAsync({ domainName: formData.domain });
  };

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
        deleteDomainMutation.mutate(domain?.name ?? '');
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
          return row.original.domainName;
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
              <Tooltip message="Registrar information is being fetched and will appear shortly.">
                <span className="text-muted-foreground animate-pulse text-xs">Looking up...</span>
              </Tooltip>
            );
          }
          if (row.original.registrar) {
            return (
              <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
                {row.original.registrar}
              </Badge>
            );
          }
          if (row.original.status?.registration) {
            return (
              <Tooltip message="Registrar information is not publicly available. This is common when WHOIS privacy protection is enabled.">
                <Badge type="muted" theme="outline" className="rounded-xl text-xs font-normal">
                  Private
                </Badge>
              </Tooltip>
            );
          }
          return '-';
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
              <Tooltip message="DNS host information is being fetched and will appear shortly.">
                <span className="text-muted-foreground animate-pulse text-xs">Looking up...</span>
              </Tooltip>
            );
          }
          return <NameserverChips data={row.original?.nameservers} maxVisible={2} />;
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
          return <DomainExpiration expiresAt={row.original.expiresAt} />;
        },
        meta: {
          sortPath: 'expiresAt',
          sortType: 'date',
        },
      },
      /* {
        id: 'statusType',
        header: 'Status',
        accessorKey: 'statusType',
        cell: ({ row }) => {
          return row.original.status && <DomainStatus domainStatus={row.original.status} />;
        },
        meta: {
          sortable: false,
          searchable: false,
        },
      }, */
    ],
    [projectId]
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

  return (
    <>
      <DataTable
        pageSize={50}
        columns={columns}
        data={formattedDomains}
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
              onClick: () => setOpenAddDialog(true),
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
                onClick={() => setOpenAddDialog(true)}>
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
        }}
        filters={
          <>
            <DataTableFilter.Select
              label="Status"
              placeholder="Status"
              filterKey="statusType"
              options={[
                {
                  label: 'Verified',
                  value: 'verified',
                },
                {
                  label: 'Pending',
                  value: 'pending',
                },
              ]}
              triggerClassName="min-w-32"
            />
          </>
        }
        rowActions={rowActions}
      />

      <Form.Dialog
        open={openAddDialog}
        onOpenChange={setOpenAddDialog}
        title="Add a Domain"
        description="To use a custom domain for your services, you must first verify ownership. This form creates a domain resource that provides the necessary DNS records for verification. Once verified, you can securely use your domain in HTTPProxies and Gateways."
        schema={domainSchema}
        onSubmit={handleAddDomain}
        submitText="Add domain"
        submitTextLoading="Adding..."
        className="w-full sm:max-w-2xl">
        <Form.Field
          name="domain"
          label="Domain"
          description="Enter the domain where your service is running"
          required
          className="px-5">
          <Form.Input placeholder="e.g. example.com" autoFocus />
        </Form.Field>
      </Form.Dialog>
    </>
  );
}
