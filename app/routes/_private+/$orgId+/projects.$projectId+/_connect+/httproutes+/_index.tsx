import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createHttpRoutesControl } from '@/resources/control-plane/httproutes.control'
import { IHttpRouteControlResponseLite } from '@/resources/interfaces/httproute.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router'

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params
  const { controlPlaneClient } = context as AppLoadContext
  const httpRoutesControl = createHttpRoutesControl(controlPlaneClient as Client)

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const httpRoutes = await httpRoutesControl.list(projectId)
  return httpRoutes
}

export default function ConnectHttpRoutesPage() {
  const { orgId, projectId } = useParams()
  const data = useLoaderData<typeof loader>()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const submit = useSubmit()
  const navigate = useNavigate()

  const { confirm } = useConfirmationDialog()

  const deleteHttpRoute = async (httpRoute: IHttpRouteControlResponseLite) => {
    await confirm({
      title: 'Delete HTTP Route',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{httpRoute.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${httpRoute.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the http route name to confirm deletion',
      confirmValue: httpRoute.name ?? 'delete',
      onSubmit: async () => {
        /* await submit(
          {
            id: httpRoute.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'http-route-resources',
            navigate: false,
            action: GATEWAYS_ACTIONS_PATH,
          },
        ) */
      },
    })
  }

  const columns: ColumnDef<IHttpRouteControlResponseLite>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(routes.projects.connect.httpRoutes.edit, {
                orgId,
                projectId,
                httpRouteId: row.original.name,
              })}
              className="text-primary font-semibold">
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
    ],
    [orgId, projectId],
  )

  const rowActions: DataTableRowActionsProps<IHttpRouteControlResponseLite>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.connect.gateways.edit, {
              orgId,
              projectId,
              gatewayId: row.name,
            }),
          )
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteHttpRoute(row),
      },
    ],
    [orgId, projectId],
  )

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-(--breakpoint-xl)"
      loadingText="Loading..."
      emptyText="No http routes found."
      tableTitle={{
        title: 'HTTP Routes',
        description: 'Manage http routes for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.connect.httpRoutes.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New HTTP Route
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  )
}
