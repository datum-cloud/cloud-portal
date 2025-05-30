import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/routes';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { useApp } from '@/providers/app.provider';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createConfigMapsControl } from '@/resources/control-plane/config-maps.control';
import { IConfigMapControlResponse } from '@/resources/interfaces/config-map.interface';
import { CustomError } from '@/utils/errorHandle';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useParams,
  Link,
  useNavigate,
  useSubmit,
  ActionFunctionArgs,
} from 'react-router';

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const configMapControl = createConfigMapsControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const configMaps = await configMapControl.list(projectId);
  return configMaps;
}, authMiddleware);

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const configMapControl = createConfigMapsControl(controlPlaneClient as Client);

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData());
      const { configMapId, projectId } = formData;

      await configMapControl.delete(projectId as string, configMapId as string);
      return dataWithToast(null, {
        title: 'Config map deleted successfully',
        description: 'The config map has been deleted successfully',
        type: 'success',
      });
    }
    default:
      throw new Error('Method not allowed');
  }
}, authMiddleware);

export default function ConfigMapsPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();

  const { confirm } = useConfirmationDialog();
  const { projectId } = useParams();
  const { orgId } = useApp();

  const deleteConfigMap = async (configMap: IConfigMapControlResponse) => {
    await confirm({
      title: 'Delete Config Map',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{configMap.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${configMap.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the config map name to confirm deletion',
      confirmValue: configMap.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            configMapId: configMap.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'config-resources',
            navigate: false,
          }
        );
      },
    });
  };

  const columns: ColumnDef<IConfigMapControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(routes.projects.config.configMaps.edit, {
                orgId,
                projectId,
                configMapId: row.original.name,
              })}
              className="text-primary font-semibold">
              {row.original.name}
            </Link>
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
    [orgId, projectId]
  );

  const rowActions: DataTableRowActionsProps<IConfigMapControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.config.configMaps.edit, {
              orgId,
              projectId,
              configMapId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteConfigMap(row),
      },
    ],
    [orgId, projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: 'No config maps found.',
        subtitle: 'Create your first config map to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Config Map',
            to: getPathWithParams(routes.projects.config.configMaps.new, { orgId, projectId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Config Maps',
        description: 'Manage config maps for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.config.configMaps.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Config Map
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
