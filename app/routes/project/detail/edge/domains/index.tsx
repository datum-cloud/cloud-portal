import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { Button } from '@/components/ui/button';
import { DomainDnsProviders } from '@/features/edge/domain/dns-providers';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DomainStatus } from '@/features/edge/domain/status';
import { createDomainsControl } from '@/resources/control-plane';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as DOMAINS_ACTIONS_PATH } from '@/routes/api/domains';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
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
  return metaObject('Domains');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const domainsControl = createDomainsControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const domains = await domainsControl.list(projectId);
  return domains;
};

export default function DomainsPage() {
  const { projectId } = useParams();
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher({ key: 'delete-domain' });
  const navigate = useNavigate();

  const { confirm } = useConfirmationDialog();

  const deleteDomain = async (domain: IDomainControlResponse) => {
    await confirm({
      title: 'Delete Domain',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{domain.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: domain?.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            action: DOMAINS_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const columns: ColumnDef<IDomainControlResponse>[] = useMemo(
    () => [
      {
        header: 'Domain',
        accessorKey: 'domainName',
        cell: ({ row }) => {
          return row.original.domainName;
        },
        meta: {
          sortPath: 'domainName',
          sortType: 'text',
        },
      },
      {
        header: 'Registrar',
        accessorKey: 'status.registration.registrar.name',
        cell: ({ row }) => row.original?.status?.registration?.registrar?.name ?? '-',
        meta: {
          sortPath: 'status.registration.registrar.name',
          sortType: 'text',
        },
      },
      {
        header: 'DNS Providers',
        accessorKey: 'status.nameservers',
        cell: ({ row }) => {
          return (
            <DomainDnsProviders nameservers={row.original?.status?.nameservers} maxVisible={2} />
          );
        },
        meta: {
          sortPath: 'status.nameservers',
          sortType: 'array',
          sortArrayBy: 'ips.registrantName',
        },
      },
      {
        header: 'Expiration Date',
        accessorKey: 'status.registration.expiresAt',
        cell: ({ row }) => {
          return <DomainExpiration expiresAt={row.original.status?.registration?.expiresAt} />;
        },
        meta: {
          sortPath: 'status.registration.expiresAt',
          sortType: 'date',
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <DomainStatus
                domainId={row.original.name}
                projectId={projectId}
                domainStatus={row.original.status}
              />
            )
          );
        },
        meta: {
          sortable: false,
        },
      },
    ],
    [projectId]
  );

  const rowActions: DataTableRowActionsProps<IDomainControlResponse>[] = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteDomain(row),
      },
    ],
    [projectId]
  );

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success('Domain deleted successfully', {
          description: 'The domain has been deleted successfully',
        });
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
      className="max-w-(--breakpoint-2xl)"
      pageSize={50}
      columns={columns}
      data={data ?? []}
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.domains.detail.overview, {
            projectId,
            domainId: row.name,
          })
        );
      }}
      emptyContent={{
        title: 'No Domain found.',
        subtitle: 'Create your first domain to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Domain',
            to: getPathWithParams(paths.project.detail.domains.new, {
              projectId,
            }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Domains',
        description: 'Manage Domains for your project resources',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.domains.new, {
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Domain
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
