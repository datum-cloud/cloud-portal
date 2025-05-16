import { getUserSession } from '@/modules/cookie/user.server'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { AppProvider } from '@/providers/app.provider'
import { ConfirmationDialogProvider } from '@/providers/confirmationDialog.provider'
import { LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router'

export const loader = withMiddleware(async ({ request }: LoaderFunctionArgs) => {
  const { user } = await getUserSession(request)
  return data(user)
}, authMiddleware)

export default function MainLayout() {
  const user = useLoaderData<typeof loader>()

  return (
    <AppProvider initialUser={user}>
      <ConfirmationDialogProvider>
        <Outlet />
      </ConfirmationDialogProvider>
    </AppProvider>
  )
}
