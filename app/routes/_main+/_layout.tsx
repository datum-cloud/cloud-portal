import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { AppLoadContext, data, Outlet, useLoaderData } from 'react-router'
import { getSession } from '@/modules/auth/authSession.server'
import { UserModel } from '@/resources/gql/models/user.model'
import { AppProvider } from '@/providers/app.provider'
import { ConfirmationDialogProvider } from '@/providers/confirmationDialog.provider'
export const loader = withMiddleware(async ({ request, context }) => {
  const { userGql } = context as AppLoadContext
  const session = await getSession(request.headers.get('Cookie'))

  const userId = session.get('userId')

  // Get user info
  const user: UserModel = await userGql.getUserProfile(userId)

  return data({ user })
}, authMiddleware)

export default function MainLayout() {
  const { user } = useLoaderData<typeof loader>()

  return (
    <AppProvider initialUser={user}>
      <ConfirmationDialogProvider>
        <Outlet />
      </ConfirmationDialogProvider>
    </AppProvider>
  )
}
