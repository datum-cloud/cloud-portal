import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import type { ActionItem } from '@/components/table';
import { SECRET_TYPES } from '@/features/secret/constants';
import { SecretFormDialog, SecretFormDialogRef } from '@/features/secret/form/secret-form-dialog';
import { PermissionButton, useResourcePermissions } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import {
  createSecretService,
  secretKeys,
  useDeleteSecret,
  useSecrets,
  useSecretsWatch,
  type Secret,
} from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { createProjectListClientLoaderFromQueryKey } from '@/utils/helpers/project-list-client-loader';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { LoaderFunctionArgs, useNavigate, useParams } from 'react-router';

const route = defineResourceRoute<Secret[]>({
  type: 'list',
  resource: 'secrets',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view secrets.",
  metaTitle: 'Secrets',
  seedCache: ({ data, projectId }) => {
    const d = data as Secret[];
    return [[secretKeys.list(projectId), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<Secret[]>(args, {
    resource: 'secrets',
    group: '',
    scope: 'project',
    fetch: ({ projectId }) => createSecretService().list(projectId!),
  });

export const meta = route.meta;

export const shouldRevalidate = skipRevalidateWithinSameProject;

export const clientLoader = createProjectListClientLoaderFromQueryKey<Secret[]>((projectId) =>
  secretKeys.list(projectId)
);

export default route.Page(({ data: initialData }) => <SecretsInner initialData={initialData} />);

function SecretsInner({ initialData }: { initialData: Secret[] }) {
  const { confirm } = useConfirmationDialog();
  const secretFormDialogRef = useRef<SecretFormDialogRef>(null);
  const { projectId } = useParams();
  const navigate = useNavigate();

  // Subscribe to watch for real-time updates
  useSecretsWatch(projectId ?? '');

  // Read from React Query cache (seeded synchronously from SSR loader data)
  const { data: queryData } = useSecrets(projectId ?? '', {
    initialData: initialData ?? [],
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  // Use React Query data, fallback to SSR data
  const data = queryData ?? initialData ?? [];

  const { canCreate, canDelete } = useResourcePermissions({
    resource: 'secrets',
    group: '',
    scope: 'project',
    verbs: ['create', 'delete'],
  });

  const deleteSecretMutation = useDeleteSecret(projectId ?? '', {
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteSecret = async (secret: Secret) => {
    const displayLabel = secret.annotations?.['app.kubernetes.io/name'] || secret.name;

    await confirm({
      title: 'Delete Secret',
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
        await deleteSecretMutation.mutateAsync(secret.name);
      },
    });
  };

  const columns: ColumnDef<Secret>[] = useMemo(
    () => [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <div data-e2e="secret-card">
              <span className="font-medium" data-e2e="secret-name">
                {row.original.name}
              </span>
            </div>
          );
        },
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ row }) => {
          return (
            <span data-e2e="secret-type">
              <Badge>{SECRET_TYPES[row.original.type as keyof typeof SECRET_TYPES].label}</Badge>
            </span>
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return (
            row.original.createdAt && (
              <span data-e2e="secret-created-at">
                <DateTime date={row.original.createdAt} />
              </span>
            )
          );
        },
      },
    ],
    [projectId]
  );

  const rowActions: ActionItem<Secret>[] = useMemo(
    () => [
      {
        label: 'Delete',
        variant: 'destructive',
        hidden: () => !canDelete,
        onClick: (row) => deleteSecret(row),
      },
    ],
    [deleteSecret, canDelete]
  );

  const columnsWithActions = useMemo(
    () => [...columns, createActionsColumn<Secret>(rowActions)],
    [columns, rowActions]
  );

  return (
    <>
      <Table.Client
        columns={columnsWithActions}
        data={data ?? []}
        title="Secrets"
        search="Search"
        onRowClick={(row) => {
          navigate(
            getPathWithParams(paths.project.detail.secrets.detail.overview, {
              projectId,
              secretId: row.name,
            })
          );
        }}
        empty={{
          // Title stays constant; the action is shown disabled with an RBAC
          // tooltip when canCreate is false so restricted users see why they
          // can't add a secret rather than a bare empty state.
          title: "let's add a secret to get you started",
          actions: [
            {
              type: 'button',
              label: 'Add secret',
              onClick: () => secretFormDialogRef.current?.show(),
              icon: <Icon icon={PlusIcon} className="size-3" />,
              disabled: !canCreate,
              tooltip: !canCreate ? "You don't have permission to create a secret" : undefined,
            },
          ],
        }}
        actions={[
          <PermissionButton
            key="add-secret"
            resource="secrets"
            verb="create"
            group=""
            scope="project"
            deniedReason="You don't have permission to create a secret"
            type="primary"
            theme="solid"
            size="small"
            className="w-full sm:w-auto"
            data-e2e="create-secret-button"
            onClick={() => secretFormDialogRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            Add secret
          </PermissionButton>,
        ]}
      />
      <SecretFormDialog ref={secretFormDialogRef} />
    </>
  );
}
