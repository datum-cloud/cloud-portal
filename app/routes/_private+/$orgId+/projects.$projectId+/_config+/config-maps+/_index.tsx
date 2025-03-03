import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { IConfigMapControlResponse } from '@/resources/interfaces/config-maps.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useParams,
  Link,
  useNavigate,
  useSubmit,
  ActionFunctionArgs,
} from 'react-router'
import { toast } from 'sonner'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params
  const { coreControl } = context as AppLoadContext

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const configMaps = await coreControl.getConfigMaps(projectId)
  return configMaps
}, authMiddleware)

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { coreControl } = context as AppLoadContext

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { configMapId, projectId } = formData

      return await coreControl.deleteConfigMap(projectId as string, configMapId as string)
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)

export default function ConfigMapsPage() {
  const data = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const submit = useSubmit()

  const { confirm } = useConfirmationDialog()
  const { orgId, projectId } = useParams()

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
          },
        )

        toast.success('Config map deleted successfully')
      },
    })
  }

  const columns: ColumnDef<IConfigMapControlResponse>[] = [
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
            className="font-semibold text-primary">
            {row.original.name}
          </Link>
        )
      },
    },
    {
      header: 'Created At',
      accessorKey: 'createdAt',
      cell: ({ row }) => {
        return row.original.createdAt && <DateFormat date={row.original.createdAt} />
      },
    },
  ]

  const rowActions: DataTableRowActionsProps<IConfigMapControlResponse>[] = [
    {
      key: 'edit',
      label: 'Edit',
      action: (row) => {
        navigate(
          getPathWithParams(routes.projects.config.configMaps.edit, {
            orgId,
            projectId,
            configMapId: row.name,
          }),
        )
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      variant: 'destructive',
      action: (row) => deleteConfigMap(row),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-screen-lg"
      loadingText="Loading..."
      emptyText="No config maps found."
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
              <PlusIcon className="h-4 w-4" />
              New Config Map
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  )
}
