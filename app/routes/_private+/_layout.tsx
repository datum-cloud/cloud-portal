import { getAuthSession } from '@/modules/auth/authSession.server'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { AppProvider } from '@/providers/app.provider'
import { ConfirmationDialogProvider } from '@/providers/confirmationDialog.provider'
import { IOidcUser } from '@/resources/interfaces/auth.interface'
import { Outlet, data, useLoaderData } from 'react-router'

export const loader = withMiddleware(async ({ request }) => {
  const session = await getAuthSession(request.headers.get('Cookie'))
  const user: IOidcUser = session.get('user')
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
