import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import type { ActionItem } from '@/components/table';
import { SECRET_TYPES } from '@/features/secret/constants';
import { SecretFormDialog, SecretFormDialogRef } from '@/features/secret/form/secret-form-dialog';
import {
  createSecretService,
  useDeleteSecret,
  useSecrets,
  useSecretsWatch,
  type Secret,
} from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { LoaderFunctionArgs, useLoaderData, useNavigate, useParams } from 'react-router';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const secretService = createSecretService();
  const secrets = await secretService.list(projectId);
  return secrets;
};

export default function SecretsPage() {
  const initialData = useLoaderData<typeof loader>();
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
        onClick: (row) => deleteSecret(row),
      },
    ],
    [deleteSecret]
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
          title: "let's add a secret to get you started",
          actions: [
            {
              type: 'button',
              label: 'Add secret',
              onClick: () => secretFormDialogRef.current?.show(),
              icon: <Icon icon={PlusIcon} className="size-3" />,
            },
          ],
        }}
        actions={[
          <Button
            key="add-secret"
            type="primary"
            theme="solid"
            size="small"
            className="w-full sm:w-auto"
            data-e2e="create-secret-button"
            onClick={() => secretFormDialogRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            Add secret
          </Button>,
        ]}
      />
      <SecretFormDialog ref={secretFormDialogRef} />
    </>
  );
}
