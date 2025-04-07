import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { ExporterStatus } from '@/features/observe/exporter/status'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control'
import { IExportPolicyControlResponse } from '@/resources/interfaces/policy.interface'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast } from '@/utils/toast.server'
import { Client } from '@hey-api/client-axios'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  ActionFunctionArgs,
  AppLoadContext,
  Link,
  useLoaderData,
  useParams,
  useSubmit,
} from 'react-router'

export const loader = withMiddleware(async ({ context, params }) => {
  const { projectId } = params
  const { controlPlaneClient } = context as AppLoadContext
  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client)

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const policies = await exportPoliciesControl.list(projectId)
  return policies
}, authMiddleware)

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client)

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { id, projectId } = formData

      await exportPoliciesControl.delete(projectId as string, id as string)
      return dataWithToast(null, {
        title: 'Exporter deleted successfully',
        description: 'The exporter has been deleted successfully',
        type: 'success',
      })
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)

export default function ObserveExportersPage() {
  const { orgId, projectId } = useParams()
  const data = useLoaderData<typeof loader>()
  const submit = useSubmit()

  const { confirm } = useConfirmationDialog()

  const deleteExporter = async (exporter: IExportPolicyControlResponse) => {
    await confirm({
      title: 'Delete Exporter',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{exporter.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${exporter.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the exporter name to confirm deletion',
      confirmValue: exporter.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            id: exporter.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'exporter-resources',
            navigate: false,
          },
        )
      },
    })
  }

  const columns: ColumnDef<IExportPolicyControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>
        },
      },
      {
        header: '# of Sources',
        accessorKey: 'numberOfSources',
      },
      {
        header: '# of Sinks',
        accessorKey: 'numberOfSinks',
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <ExporterStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                projectId={projectId}
                id={row.original.name}
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
    [orgId, projectId],
  )

  const rowActions: DataTableRowActionsProps<IExportPolicyControlResponse>[] = useMemo(
    () => [
      /* {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.observe.exporters.edit, {
              orgId,
              projectId,
              exporterId: row.name,
            }),
          )
        },
      }, */
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteExporter(row),
      },
    ],
    [orgId, projectId],
  )

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-(--breakpoint-lg)"
      loadingText="Loading..."
      emptyText="No exporters found."
      tableTitle={{
        title: 'Exporters',
        description: 'Manage exporters for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.observe.exporters.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Exporter
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  )
}
