import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SECRET_TYPES } from '@/features/secret/constants';
import { createSecretsControl } from '@/resources/control-plane';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
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
import { toast } from 'sonner';

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
          return <span className="text-primary font-semibold">{row.original.name}</span>;
        },
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ row }) => {
          return (
            <Badge variant="outline">
              {SECRET_TYPES[row.original.type as keyof typeof SECRET_TYPES].label}
            </Badge>
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
        title: 'No secrets found.',
        subtitle: 'Create your first secret to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Secret',
            to: getPathWithParams(paths.project.detail.config.secrets.new, { projectId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Secrets',
        description: 'Manage secrets for your project resources',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.config.secrets.new, {
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Secret
            </Button>
          </Link>
        ),
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
