import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { ExportPolicyStatus } from '@/features/metric/export-policies/status';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import {
  createExportPolicyService,
  useDeleteExportPolicy,
  type ExportPolicy,
} from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast } from '@/utils/cookies';
import { AppError, BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  Link,
  LoaderFunctionArgs,
  data,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const { projectId } = params;

    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }

    // Services now use global axios client with AsyncLocalStorage
    const exportPolicyService = createExportPolicyService();
    const policies = await exportPolicyService.list(projectId);
    return data(policies);
  } catch (error) {
    return dataWithToast([], {
      title: 'Something went wrong',
      description: (error as AppError).message,
      type: 'error',
    });
  }
};

export const handle = {
  breadcrumb: () => <span>Your Export Policies</span>,
};

export default function ExportPoliciesPage() {
  const { projectId } = useParams();
  const data = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const deleteExportPolicyMutation = useDeleteExportPolicy(projectId ?? '', {
    onSuccess: () => {
      toast.success('Export policy deleted successfully', {
        description: 'The export policy has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteExportPolicy = async (exportPolicy: ExportPolicy) => {
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
      confirmValue: exportPolicy.name,
      confirmInputLabel: `Type "${exportPolicy.name}" to confirm.`,
      onSubmit: async () => {
        await deleteExportPolicyMutation.mutateAsync(exportPolicy.name);
      },
    });
  };

  const columns: ColumnDef<ExportPolicy>[] = useMemo(
    () => [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
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
            <ExportPolicyStatus
              currentStatus={transformControlPlaneStatus(row.original.status)}
              projectId={projectId}
              id={row.original.name}
              showTooltip={false}
            />
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
      },
    ],
    [projectId]
  );

  const rowActions: DataTableRowActionsProps<ExportPolicy>[] = useMemo(
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
        title: "let's add an export policy to get you started",
        actions: [
          {
            type: 'link',
            label: 'Create an export policy',
            to: getPathWithParams(paths.project.detail.metrics.exportPolicies.new, { projectId }),
            variant: 'default',
            icon: <Icon icon={PlusIcon} className="size-3" />,
            iconPosition: 'start',
          },
        ],
      }}
      tableTitle={{
        title: 'Export Policies',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.metrics.exportPolicies.new, {
              projectId,
            })}>
            <Button type="primary" theme="solid" size="small">
              <Icon icon={PlusIcon} className="size-4" />
              Create an export policy
            </Button>
          </Link>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search export policies',
        },
      }}
      rowActions={rowActions}
    />
  );
}
