import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { ExportPolicyStatus } from '@/features/metric/export-policies/status';
import { PermissionButton, useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import {
  createExportPolicyService,
  exportPolicyKeys,
  useDeleteExportPolicy,
  useExportPolicies,
  useExportPoliciesWatch,
  type ExportPolicy,
} from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { createProjectListClientLoaderFromQueryKey } from '@/utils/helpers/project-list-client-loader';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { LoaderFunctionArgs, useNavigate, useParams } from 'react-router';

const route = defineResourceRoute<ExportPolicy[]>({
  type: 'list',
  resource: 'exportpolicies',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view export policies.",
  metaTitle: 'Metrics',
  seedCache: ({ data, projectId }) => {
    const d = data as ExportPolicy[];
    return [[exportPolicyKeys.list(projectId), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<ExportPolicy[]>(args, {
    resource: 'exportpolicies',
    group: 'telemetry.miloapis.com',
    scope: 'project',
    fetch: ({ projectId }) => createExportPolicyService().list(projectId!),
  });

export const meta = route.meta;

export const shouldRevalidate = skipRevalidateWithinSameProject;

export const clientLoader = createProjectListClientLoaderFromQueryKey<ExportPolicy[]>((projectId) =>
  exportPolicyKeys.list(projectId)
);

export default route.Page(({ data: initialData }) => (
  <ExportPoliciesInner initialData={initialData} />
));

function ExportPoliciesInner({ initialData }: { initialData: ExportPolicy[] }) {
  const { projectId } = useParams();

  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  // Subscribe to live updates so the table reflects K8s state changes
  // (status flips, creates/deletes from elsewhere) without per-row watches.
  useExportPoliciesWatch(projectId ?? '');

  // Seed the query cache from the SSR loader so the watch has a list to patch.
  const { data: queryData } = useExportPolicies(projectId ?? '', {
    initialData: initialData ?? [],
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const policies = queryData ?? initialData ?? [];

  const { canCreate, canDelete } = useResourcePermissions({
    resource: 'exportpolicies',
    group: 'telemetry.miloapis.com',
    scope: 'project',
    verbs: ['create', 'delete'],
  });

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
          label: 'Settings',
          onClick: (row) => {
            navigate(
              getPathWithParams(paths.project.detail.metrics.detail.settings, {
                projectId,
                exportPolicyId: row.name,
              })
            );
          },
        },
        {
          label: 'Delete',
          variant: 'destructive',
          hidden: () => !canDelete,
          onClick: (row) => deleteExportPolicy(row),
        },
      ]),
    ],
    [projectId, navigate, deleteExportPolicy, canDelete]
  );

  return (
    <Table.Client
      columns={columns}
      data={policies ?? []}
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
        <PermissionButton
          key="create-policy"
          resource="exportpolicies"
          verb="create"
          group="telemetry.miloapis.com"
          scope="project"
          deniedReason="You don't have permission to create an export policy"
          type="primary"
          theme="solid"
          size="small"
          className="w-full sm:w-auto"
          onClick={() =>
            navigate(getPathWithParams(paths.project.detail.metrics.new, { projectId }))
          }>
          <Icon icon={PlusIcon} className="size-4" />
          Create an export policy
        </PermissionButton>,
      ]}
      empty={{
        // Title stays constant; the action is shown disabled with an RBAC
        // tooltip when canCreate is false so restricted users see why they
        // can't create rather than a bare empty state.
        title: "let's add an export policy to get you started",
        actions: [
          {
            type: 'button',
            label: 'Create an export policy',
            icon: <Icon icon={PlusIcon} className="size-3" />,
            onClick: () =>
              navigate(getPathWithParams(paths.project.detail.metrics.new, { projectId })),
            disabled: !canCreate,
            tooltip: !canCreate
              ? "You don't have permission to create an export policy"
              : undefined,
          },
        ],
      }}
    />
  );
}
