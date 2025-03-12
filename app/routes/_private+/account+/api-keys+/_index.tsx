import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { PageTitle } from '@/components/page-title/page-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { PreviewKey } from '@/features/api-key/preview-key'
import { commitSession, getSession } from '@/modules/auth/authSession.server'
import { GraphqlClient } from '@/modules/graphql/graphql'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { UserApiKeyModel } from '@/resources/gql/models/user.model'
import { createUserGql } from '@/resources/gql/user.gql'
import { dataWithToast } from '@/utils/toast.server'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  ActionFunctionArgs,
  AppLoadContext,
  Link,
  data,
  useLoaderData,
  useSubmit,
} from 'react-router'

export const loader = withMiddleware(async ({ request, context }) => {
  const { gqlClient } = context as AppLoadContext
  const userGql = createUserGql(gqlClient as GraphqlClient)

  const apiKeys = await userGql.getUserApiKeys()

  const session = await getSession(request.headers.get('Cookie'))
  const apiKey = session.get('apiKey')

  // Remove the apiKey from the session
  session.unset('apiKey')

  return data(
    { apiKeys, apiKey },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    },
  )
}, authMiddleware)

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { gqlClient } = context as AppLoadContext
  const userGql = createUserGql(gqlClient as GraphqlClient)

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { apiKeyId } = formData

      await userGql.deleteUserApiKey(apiKeyId as string)
      return dataWithToast(null, {
        title: 'API key deleted successfully',
        description: 'The API key has been deleted successfully',
        type: 'success',
      })
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)

export default function AccountApiKeys() {
  const { apiKeys, apiKey } = useLoaderData<typeof loader>()
  const { confirm } = useConfirmationDialog()
  const submit = useSubmit()

  const deleteApiKey = async (apiKey: UserApiKeyModel) => {
    await confirm({
      title: 'Delete API Key',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{apiKey.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await submit(
          {
            apiKeyId: apiKey.id ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'api-key-resources',
            navigate: false,
          },
        )
      },
    })
  }

  const columns: ColumnDef<UserApiKeyModel>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>
        },
      },
      {
        header: 'Expires At',
        accessorKey: 'expiresAt',
        cell: ({ row }) => {
          return row.original.expiresAt ? (
            <DateFormat date={row.original.expiresAt} format="MMMM d, yyyy" omitAmPm />
          ) : (
            'Never'
          )
        },
      },
      {
        header: 'Last Used',
        accessorKey: 'lastUsedAt',
        cell: ({ row }) => {
          return row.original.lastUsedAt ? (
            <DateFormat date={row.original.lastUsedAt} />
          ) : (
            '-'
          )
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        enableSorting: false,
        cell: ({ row }) => {
          const expiresAt = new Date(row.original.expiresAt).getTime()
          const isActive = !row.original.expiresAt || expiresAt > Date.now()

          return (
            <Badge variant={isActive ? 'outline' : 'destructive'}>
              {isActive ? 'Active' : 'Expired'}
            </Badge>
          )
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return <DateFormat date={row.original.createdAt} />
        },
      },
    ],
    [],
  )

  const rowActions: DataTableRowActionsProps<UserApiKeyModel>[] = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteApiKey(row),
      },
    ],
    [],
  )

  return (
    <div className="container mx-auto flex max-w-(--breakpoint-xl) flex-col gap-4">
      <PageTitle
        title="API Keys"
        description="Generate and control API keys to securely access your account's resources"
        actions={
          <Link to={routes.account.apiKeys.new}>
            <Button>
              <PlusIcon className="size-4" /> New API Key
            </Button>
          </Link>
        }
      />

      {apiKey && <PreviewKey value={apiKey} />}

      <DataTable
        columns={columns}
        data={apiKeys ?? []}
        rowActions={rowActions}
        className=""
        loadingText="Loading API keys..."
        emptyText="No API keys found."
        defaultSorting={[{ id: 'createdAt', desc: true }]}
      />
    </div>
  )
}
