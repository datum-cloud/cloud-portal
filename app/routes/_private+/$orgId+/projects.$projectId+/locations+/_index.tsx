import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LOCATION_CLASSES, LOCATION_PROVIDERS } from '@/constants/location'
import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import {
  ILocationControlResponse,
  LocationClass,
} from '@/resources/interfaces/location.interface'
import { CustomError } from '@/utils/errorHandle'
import { toTitleCase } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import {
  ActionFunctionArgs,
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router'
import { toast } from 'sonner'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params
  const { locationsControl } = context as AppLoadContext

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const locations = await locationsControl.getLocations(projectId)
  return locations
}, authMiddleware)

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { locationsControl } = context as AppLoadContext

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { locationName, projectId } = formData

      return await locationsControl.deleteLocation(
        projectId as string,
        locationName as string,
      )
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)

export default function ProjectLocationsPage() {
  const data = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const submit = useSubmit()

  const { confirm } = useConfirmationDialog()

  const { orgId, projectId } = useParams()

  const deleteLocation = async (location: ILocationControlResponse) => {
    await confirm({
      title: 'Delete Location',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>
            {location.displayName} ({location.name})
          </strong>
          ?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${location.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the location name to confirm deletion',
      confirmValue: location.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            locationName: location.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'location-resources',
            navigate: false,
          },
        )

        toast.success('Location deleted successfully')
      },
    })
  }

  const columns: ColumnDef<ILocationControlResponse>[] = [
    {
      header: 'Display Name',
      accessorKey: 'displayName',
      cell: ({ row }) => {
        return (
          <Link
            to={getPathWithParams(routes.projects.locations.edit, {
              orgId,
              projectId,
              locationId: row.original.name,
            })}
            className="font-semibold text-primary">
            {row.original.displayName || row.original.name}
          </Link>
        )
      },
    },
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Class',
      accessorKey: 'class',
      cell: ({ row }) => {
        return (
          <Badge
            variant={
              row.original.class === LocationClass.SELF_MANAGED ? 'outline' : 'sunglow'
            }>
            {LOCATION_CLASSES[row.original.class as keyof typeof LOCATION_CLASSES]?.label}
          </Badge>
        )
      },
    },
    {
      header: 'Provider',
      accessorKey: 'provider',
      meta: {
        className: 'text-center',
      },
      cell: ({ row }) => {
        const provider =
          LOCATION_PROVIDERS[
            Object.keys(row.original.provider ?? {})[0] as keyof typeof LOCATION_PROVIDERS
          ]

        return Object.keys(row.original.provider ?? {}).length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <img
                src={provider.icon}
                alt={provider.label}
                className="mx-auto size-5 cursor-pointer"
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                {Object.entries(row.original.provider ?? {}).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <span className="mb-1 text-sm font-medium">{provider.label}</span>
                    {Object.entries(value as unknown as Record<string, string>).map(
                      ([k, v]) => (
                        <div key={k} className="flex items-center gap-1 text-xs">
                          <span className="capitalize">{toTitleCase(k)}:</span>
                          <span className="text-muted-foreground">{v}</span>
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="flex items-center justify-center">-</span>
        )
      },
    },
    {
      header: 'City Code',
      accessorKey: 'cityCode',
    },
    {
      header: 'Created At',
      accessorKey: 'createdAt',
      cell: ({ row }) => {
        return row.original.createdAt && <DateFormat date={row.original.createdAt} />
      },
    },
  ]

  const rowActions: DataTableRowActionsProps<ILocationControlResponse>[] = [
    {
      key: 'edit',
      label: 'Edit',
      action: (row) => {
        navigate(
          getPathWithParams(routes.projects.locations.edit, {
            orgId,
            projectId,
            locationId: row.name,
          }),
        )
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      variant: 'destructive',
      action: (row) => deleteLocation(row),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-screen-xl"
      loadingText="Loading locations..."
      emptyText="No locations found."
      tableTitle={{
        title: 'Locations',
        description: 'Manage deployment locations for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.locations.new, { orgId, projectId })}>
            <Button>
              <PlusIcon className="h-4 w-4" />
              New Location
            </Button>
          </Link>
        ),
      }}
      defaultSorting={[{ id: 'createdAt', desc: true }]}
      rowActions={rowActions}
    />
  )
}
