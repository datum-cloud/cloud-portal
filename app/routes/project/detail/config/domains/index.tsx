import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { NameserverChips } from '@/components/nameserver-chips';
import { BulkAddDomainsAction } from '@/features/edge/domain/bulk-add';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DomainStatus } from '@/features/edge/domain/status';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { DataTableFilter } from '@/modules/datum-ui/components/data-table';
import { createDomainsControl } from '@/resources/control-plane';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { domainSchema } from '@/resources/schemas/domain.schema';
import { ROUTE_PATH as DOMAINS_ACTIONS_PATH } from '@/routes/api/domains';
import { ROUTE_PATH as DOMAINS_REFRESH_PATH } from '@/routes/api/domains/refresh';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
import { z } from 'zod';

type FormattedDomain = {
  name: string;
  domainName: string;
  registrar: string;
  nameservers: NonNullable<IDomainControlResponse['status']>['nameservers'];
  expiresAt: string;
  status: IDomainControlResponse['status'];
  statusType: 'success' | 'pending';
};

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

  const formattedDomains = domains.map((domain) => {
    const controlledStatus = transformControlPlaneStatus(domain.status);

    return {
      name: domain.name,
      domainName: domain.domainName,
      registrar: domain.status?.registration?.registrar?.name,
      nameservers: domain.status?.nameservers,
      expiresAt: domain.status?.registration?.expiresAt,
      status: domain.status,
      statusType: controlledStatus.status === ControlPlaneStatus.Success ? 'verified' : 'pending',
    };
  });
  return formattedDomains;
};

export default function DomainsPage() {
  const { projectId } = useParams();
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const csrf = useAuthenticityToken();

  const revalidator = useRevalidateOnInterval({ enabled: false });
  const { confirm } = useConfirmationDialog();

  const deleteFetcher = useDatumFetcher({
    key: 'delete-domain',
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been deleted successfully',
      });
      revalidator.revalidate();
    },
    onError: (data) => {
      toast.error('Domain', {
        description: data.error || 'Failed to delete domain',
      });
    },
  });
  const refreshFetcher = useDatumFetcher({
    key: 'refresh-domain',
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been refreshed successfully',
      });
    },
    onError: (data) => {
      toast.error('Domain', {
        description: data.error || 'Failed to refresh domain',
      });
    },
  });
  const createFetcher = useDatumFetcher({
    key: 'create-domain',
    onSuccess: () => {
      toast.success('Domain', {
        description: 'The domain has been added to your project',
      });
      setOpenAddDialog(false);
      revalidator.revalidate();
    },
    onError: (data) => {
      toast.error('Domain', {
        description: data.error || 'Failed to add domain',
      });
    },
  });

  const [openAddDialog, setOpenAddDialog] = useState(false);

  const handleAddDomain = async (formData: z.infer<typeof domainSchema>) => {
    return createFetcher.submit(
      {
        domain: formData.domain,
        projectId: projectId ?? '',
        csrf,
      },
      {
        method: 'POST',
        action: DOMAINS_ACTIONS_PATH,
        encType: 'application/json',
      }
    );
  };

  const deleteDomain = async (domain: FormattedDomain) => {
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
        await deleteFetcher.submit(
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

  const refreshDomain = async (domain: FormattedDomain) => {
    await refreshFetcher.submit(
      {
        id: domain?.name ?? '',
        projectId: projectId ?? '',
      },
      {
        method: 'PATCH',
        action: DOMAINS_REFRESH_PATH,
      }
    );
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
        cell: ({ row }) => row.original?.registrar ?? '-',
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
      {
        id: 'statusType',
        header: 'Status',
        accessorKey: 'statusType',
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
          searchable: false,
        },
      },
    ],
    [projectId]
  );

  const rowActions: DataTableRowActionsProps<FormattedDomain>[] = useMemo(
    () => [
      {
        key: 'refresh',
        label: 'Refresh',
        variant: 'default',
        action: (row) => refreshDomain(row),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteDomain(row),
      },
    ],
    [projectId]
  );

  return (
    <>
      <DataTable
        pageSize={50}
        columns={columns}
        data={(data ?? []) as FormattedDomain[]}
        onRowClick={(row) => {
          navigate(
            getPathWithParams(paths.project.detail.domains.detail.overview, {
              projectId,
              domainId: row.name,
            })
          );
        }}
        emptyContent={{
          title: "Looks like you don't have any domains added yet",
          actions: [
            {
              type: 'button',
              label: 'Add a domain',
              onClick: () => setOpenAddDialog(true),
              variant: 'default',
              icon: <ArrowRightIcon className="size-4" />,
              iconPosition: 'end',
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
                <PlusIcon className="size-4" />
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
        closeOnSuccess={false}
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
