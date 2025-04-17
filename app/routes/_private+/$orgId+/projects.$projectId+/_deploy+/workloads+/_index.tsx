import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { WorkloadStatus } from '@/features/workload/status'
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { ROUTE_PATH as WORKLOADS_ACTIONS_ROUTE_PATH } from '@/routes/api+/workloads+/actions'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { deletedWorkloadIdsCookie } from '@/utils/workload.server'
import { Client } from '@hey-api/client-axios'
import { ColumnDef } from '@tanstack/react-table'
import { Loader2, PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useParams,
  Link,
  useNavigate,
  useSubmit,
  data,
} from 'react-router'

export const loader = withMiddleware(
  async ({ context, params, request }: LoaderFunctionArgs) => {
    const { projectId } = params
    const { controlPlaneClient } = context as AppLoadContext
    const workloadsControl = createWorkloadsControl(controlPlaneClient as Client)

    if (!projectId) {
      throw new CustomError('Project ID is required', 400)
    }

    const workloads = await workloadsControl.list(projectId)

    // Get deleted IDs from cookie
    const cookieValue = await deletedWorkloadIdsCookie.parse(
      request.headers.get('Cookie'),
    )

    // Check if cookie value is an array and has elements
    let deletedIds: string[] = []
    if (Array.isArray(cookieValue) && cookieValue.length > 0) {
      // Create a set of current workload names for efficient lookup
      const workloadNames = new Set(workloads.map((w) => w.name))

      // Filter out deleted IDs that don't exist in current workloads
      deletedIds = cookieValue.filter((id) => workloadNames.has(id))
    }

    return data(
      { workloads, deletedIds },
      {
        headers: {
          'Set-Cookie': await deletedWorkloadIdsCookie.serialize(deletedIds),
        },
      },
    )
  },
  authMiddleware,
)

export default function WorkloadsPage() {
  // revalidate every 5 seconds to keep workload list fresh
  useRevalidateOnInterval({ enabled: true, interval: 10000 })

  const { workloads, deletedIds } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const submit = useSubmit()
  const { confirm } = useConfirmationDialog()

  const { orgId, projectId } = useParams()

  const deleteWorkload = async (workload: IWorkloadControlResponse) => {
    await confirm({
      title: 'Delete Workload',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{workload.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${workload.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the workload name to confirm deletion',
      confirmValue: workload.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            workloadId: workload.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: WORKLOADS_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
            fetcherKey: 'workload-resources',
            navigate: false,
          },
        )
      },
    })
  }

  const columns: ColumnDef<IWorkloadControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          const isDeleted = Boolean(
            row.original.name && (deletedIds as string[]).includes(row.original.name),
          )

          return isDeleted ? (
            <span className="text-primary leading-none font-semibold">
              {row.original.name}
            </span>
          ) : (
            <Link
              to={getPathWithParams(routes.projects.deploy.workloads.detail.root, {
                orgId,
                projectId,
                workloadId: row.original.name,
              })}
              className="text-primary leading-none font-semibold">
              {row.original.name}
            </Link>
          )
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const isDeleted = Boolean(
            row.original.name && (deletedIds as string[]).includes(row.original.name),
          )
          return isDeleted ? (
            <Badge
              variant="outline"
              className="text-destructive flex items-center gap-1 border-none text-sm font-normal">
              <Loader2 className="size-3 animate-spin cursor-default" />
              Deleting
            </Badge>
          ) : (
            row.original.status && (
              <WorkloadStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                projectId={projectId}
                id={row.original.name}
                workloadType="workload"
                type="badge"
                badgeClassName="px-0"
              />
            )
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
    [orgId, projectId, deletedIds],
  )

  const rowActions: DataTableRowActionsProps<IWorkloadControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.deploy.workloads.detail.manage, {
              orgId,
              projectId,
              workloadId: row.name,
            }),
          )
        },
        isDisabled: (row) =>
          Boolean(row.name && (deletedIds as string[]).includes(row.name)),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteWorkload(row),
        isDisabled: (row) =>
          Boolean(row.name && (deletedIds as string[]).includes(row.name)),
      },
    ],
    [orgId, projectId, deletedIds],
  )

  return (
    <DataTable
      columns={columns}
      data={workloads ?? []}
      className="mx-auto max-w-(--breakpoint-lg)"
      loadingText="Loading..."
      emptyText="No workloads found."
      tableTitle={{
        title: 'Workloads',
        description: 'Manage workloads for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.deploy.workloads.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Workload
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  )
}
