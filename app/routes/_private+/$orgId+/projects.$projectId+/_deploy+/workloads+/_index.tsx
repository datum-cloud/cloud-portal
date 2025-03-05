import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { WorkloadStatus } from '@/features/workload/status'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useParams,
  Link,
  useNavigate,
  ActionFunctionArgs,
  useSubmit,
} from 'react-router'
import { toast } from 'sonner'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params
  const { workloadsControl } = context as AppLoadContext

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const workloads = await workloadsControl.list(projectId)
  return workloads
}, authMiddleware)

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { workloadsControl } = context as AppLoadContext

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { workloadId, projectId } = formData

      return await workloadsControl.delete(projectId as string, workloadId as string)
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)

export default function WorkloadsPage() {
  const data = useLoaderData<typeof loader>()
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
          },
          {
            method: 'DELETE',
            fetcherKey: 'workload-resources',
            navigate: false,
          },
        )

        toast.success('Workload deleted successfully')
      },
    })
  }

  const columns: ColumnDef<IWorkloadControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(routes.projects.deploy.workloads.edit, {
                orgId,
                projectId,
                workloadId: row.original.name,
              })}
              className="font-semibold leading-none text-primary">
              {row.original.name}
            </Link>
          )
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <WorkloadStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                projectId={projectId}
                workloadId={row.original.name}
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
    [],
  )

  const rowActions: DataTableRowActionsProps<IWorkloadControlResponse>[] = [
    {
      key: 'edit',
      label: 'Edit',
      action: (row) => {
        navigate(
          getPathWithParams(routes.projects.deploy.workloads.edit, {
            orgId,
            projectId,
            workloadId: row.name,
          }),
        )
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      variant: 'destructive',
      action: (row) => deleteWorkload(row),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-screen-lg"
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
              <PlusIcon className="h-4 w-4" />
              New Workload
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  )
}
