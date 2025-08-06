import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { DomainStatus } from '@/features/edge/domain/status';
import { createDomainsControl } from '@/resources/control-plane/domains.control';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as DOMAINS_ACTIONS_PATH } from '@/routes/api/domains';
import { CustomError } from '@/utils/error';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
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
    throw new CustomError('Project ID is required', 400);
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
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>;
        },
      },
      {
        header: 'Domain',
        accessorKey: 'domainName',
        cell: ({ row }) => {
          return row.original.domainName;
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
                currentStatus={transformControlPlaneStatus(row.original.status)}
              />
            )
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
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
        toast.success('Domain deleted successfully');
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
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
