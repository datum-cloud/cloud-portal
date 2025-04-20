import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createSecretsControl } from '@/resources/control-plane/secrets.control'
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast } from '@/utils/toast.server'
import { Client } from '@hey-api/client-axios'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useParams,
  Link,
  useSubmit,
  ActionFunctionArgs,
} from 'react-router'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params
  const { controlPlaneClient } = context as AppLoadContext
  const secretControl = createSecretsControl(controlPlaneClient as Client)

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const secrets = await secretControl.list(projectId)
  return secrets
}, authMiddleware)

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const secretControl = createSecretsControl(controlPlaneClient as Client)

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { secretId, projectId } = formData

      await secretControl.delete(projectId as string, secretId as string)
      return dataWithToast(null, {
        title: 'Secret deleted successfully',
        description: 'The secret has been deleted successfully',
        type: 'success',
      })
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)

export default function SecretsPage() {
  const data = useLoaderData<typeof loader>()

  const submit = useSubmit()

  const { confirm } = useConfirmationDialog()
  const { orgId, projectId } = useParams()

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
      confirmInputLabel: `Type "${secret.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the secret name to confirm deletion',
      confirmValue: secret.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            secretId: secret.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'secret-resources',
            navigate: false,
          },
        )
      },
    })
  }

  const columns: ColumnDef<ISecretControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>
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

  const rowActions: DataTableRowActionsProps<ISecretControlResponse>[] = useMemo(
    () => [
      /* {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.config.secrets.edit, {
              orgId,
              projectId,
              secretId: row.name,
            }),
          )
        },
      }, */
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteSecret(row),
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
      emptyText="No secrets found."
      tableTitle={{
        title: 'Secrets',
        description: 'Manage secrets for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.config.secrets.new, {
              orgId,
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
    />
  )
}
