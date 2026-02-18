import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { SECRET_TYPES } from '@/features/secret/constants';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import {
  createSecretService,
  useDeleteSecret,
  useHydrateSecrets,
  useSecrets,
  useSecretsWatch,
  type Secret,
} from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-ui/components';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import { LoaderFunctionArgs, useLoaderData, useParams, Link, useNavigate } from 'react-router';

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
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();

  // Hydrate cache with SSR data (runs once on mount)
  useHydrateSecrets(projectId ?? '', initialData ?? []);

  // Subscribe to watch for real-time updates
  useSecretsWatch(projectId ?? '');

  // Read from React Query cache (gets updates from watch!)
  const { data: queryData } = useSecrets(projectId ?? '', {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const data = queryData ?? initialData ?? [];

  const deleteSecretMutation = useDeleteSecret(projectId ?? '', {
    onSuccess: () => {
      toast.success('Secret deleted successfully', {
        description: 'The secret has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteSecret = async (secret: Secret) => {
    await confirm({
      title: 'Delete Secret',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{secret.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmValue: secret.name,
      confirmInputLabel: `Type "${secret.name}" to confirm.`,
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

  const rowActions: DataTableRowActionsProps<Secret>[] = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteSecret(row),
      },
    ],
    [projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: "let's add a secret to get you started",
        actions: [
          {
            type: 'link',
            label: 'Add secret',
            to: getPathWithParams(paths.project.detail.config.secrets.new, { projectId }),
            variant: 'default',
            icon: <Icon icon={PlusIcon} className="size-3" />,
            iconPosition: 'start',
          },
        ],
      }}
      tableTitle={{
        title: 'Secrets',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.config.secrets.new, {
              projectId,
            })}>
            <Button type="primary" theme="solid" size="small">
              <Icon icon={PlusIcon} className="size-4" />
              Add secret
            </Button>
          </Link>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search secrets',
        },
      }}
      defaultSorting={[{ id: 'createdAt', desc: true }]}
      rowActions={rowActions}
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.config.secrets.detail.overview, {
            projectId,
            secretId: row.name,
          })
        );
      }}
    />
  );
}
