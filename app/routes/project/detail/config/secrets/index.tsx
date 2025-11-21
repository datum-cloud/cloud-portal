import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { SECRET_TYPES } from '@/features/secret/constants';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { createSecretsControl } from '@/resources/control-plane';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-ui/components';
import { Button, toast } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useParams,
  Link,
  useFetcher,
  useNavigate,
} from 'react-router';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const secretControl = createSecretsControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const secrets = await secretControl.list(projectId);
  return secrets;
};

export default function SecretsPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();

  const deleteSecret = async (secret: ISecretControlResponse) => {
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
      onSubmit: async () => {
        await fetcher.submit(
          {
            secretId: secret.name ?? '',
            projectId: projectId ?? '',
          },
          {
            action: SECRET_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  const columns: ColumnDef<ISecretControlResponse>[] = useMemo(
    () => [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ row }) => {
          return (
            <Badge>{SECRET_TYPES[row.original.type as keyof typeof SECRET_TYPES].label}</Badge>
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

  const rowActions: DataTableRowActionsProps<ISecretControlResponse>[] = useMemo(
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

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success('Secret deleted successfully', {
          description: 'The secret has been deleted successfully',
        });
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: "Looks like you don't have any secrets added yet",
        actions: [
          {
            type: 'link',
            label: 'Add a secret',
            to: getPathWithParams(paths.project.detail.config.secrets.new, { projectId }),
            variant: 'default',
            icon: <ArrowRightIcon className="size-4" />,
            iconPosition: 'end',
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
              <PlusIcon className="size-4" />
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
          getPathWithParams(paths.project.detail.config.secrets.detail.edit, {
            projectId,
            secretId: row.name,
          })
        );
      }}
    />
  );
}
