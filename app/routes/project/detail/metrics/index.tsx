import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { ExportPolicyStatus } from '@/features/metric/export-policies/status';
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
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
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

export default function ExportPoliciesPage() {
  const { projectId } = useParams();
  const policies = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const deleteExportPolicyMutation = useDeleteExportPolicy(projectId ?? '', {
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteExportPolicy = useCallback(
    async (exportPolicy: ExportPolicy) => {
      const displayLabel =
        exportPolicy.annotations?.['app.kubernetes.io/name'] || exportPolicy.name;

      await confirm({
        title: 'Delete Export Policy',
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
          await deleteExportPolicyMutation.mutateAsync(exportPolicy.name);
        },
      });
    },
    [confirm, deleteExportPolicyMutation]
  );

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
      createActionsColumn<ExportPolicy>([
        {
          label: 'Edit',
          onClick: (row) => {
            navigate(
              getPathWithParams(paths.project.detail.metrics.detail.edit, {
                projectId,
                exportPolicyId: row.name,
              })
            );
          },
        },
        {
          label: 'Delete',
          variant: 'destructive',
          onClick: (row) => deleteExportPolicy(row),
        },
      ]),
    ],
    [projectId, navigate, deleteExportPolicy]
  );

  return (
    <Table.Client
      columns={columns}
      data={policies ?? []}
      title="Export Policies"
      description="Send telemetry data from your Datum infrastructure to external monitoring platforms like Grafana Cloud."
      search="Search"
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.metrics.detail.overview, {
            projectId,
            exportPolicyId: row.name,
          })
        );
      }}
      actions={[
        <Link
          key="create-policy"
          to={getPathWithParams(paths.project.detail.metrics.new, { projectId })}
          className="w-full sm:w-auto">
          <Button type="primary" theme="solid" size="small" className="w-full">
            <Icon icon={PlusIcon} className="size-4" />
            Create an export policy
          </Button>
        </Link>,
      ]}
      empty="let's add an export policy to get you started"
    />
  );
}
