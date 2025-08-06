import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { ExportPolicyStatus } from '@/features/observe/export-policies/status';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { ROUTE_PATH as EXPORT_POLICIES_ACTIONS_ROUTE_PATH } from '@/routes/api/export-policies';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  data,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';
import { toast } from 'sonner';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  try {
    const { projectId } = params;
    const { controlPlaneClient } = context as AppLoadContext;
    const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

    if (!projectId) {
      throw new CustomError('Project ID is required', 400);
    }

    const policies = await exportPoliciesControl.list(projectId);
    return data(policies);
  } catch (error) {
    return dataWithToast([], {
      title: 'Something went wrong',
      description: (error as CustomError).message,
      type: 'error',
    });
  }
};

export default function ExportPoliciesPage() {
  const { projectId } = useParams();
  const data = useLoaderData<typeof loader>();

  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const deleteExportPolicy = async (exportPolicy: IExportPolicyControlResponse) => {
    await confirm({
      title: 'Delete Export Policy',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{exportPolicy.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: exportPolicy?.name ?? '',
            projectId: projectId ?? '',
          },
          {
            action: EXPORT_POLICIES_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  const columns: ColumnDef<IExportPolicyControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>;
        },
      },
      {
        header: '# of Sources',
        accessorKey: 'sources',
        cell: ({ row }) => {
          return row.original.sources?.length ?? 0;
        },
      },
      {
        header: '# of Sinks',
        accessorKey: 'sinks',
        cell: ({ row }) => {
          return row.original.sinks?.length ?? 0;
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <ExportPolicyStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                projectId={projectId}
                id={row.original.name}
                type="badge"
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

  const rowActions: DataTableRowActionsProps<IExportPolicyControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(paths.project.detail.metrics.exportPolicies.detail.edit, {
              projectId,
              exportPolicyId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteExportPolicy(row),
      },
    ],
    [projectId]
  );

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success('Export policy deleted successfully');
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
          getPathWithParams(paths.project.detail.metrics.exportPolicies.detail.overview, {
            projectId,
            exportPolicyId: row.name,
          })
        );
      }}
      emptyContent={{
        title: 'No export policies found.',
        subtitle: 'Create your first export policy to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Export Policy',
            to: getPathWithParams(paths.project.detail.metrics.exportPolicies.new, { projectId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Export Policies',
        description: 'Manage export policies for your project resources',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.metrics.exportPolicies.new, {
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Export Policy
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
