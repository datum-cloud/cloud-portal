import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { Outlet, useLoaderData } from 'react-router'
import { userGql } from '@/resources/gql/user.gql'
import { getSession } from '@/modules/auth/auth-session.server'
import { UserModel } from '@/resources/gql/models/user.model'
import { AppProvider } from '@/providers/app.provider'

export const loader = withMiddleware(async ({ request }) => {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  // Get user info
  const user: UserModel = await userGql.getUserProfile(userId, request)

  return user
}, authMiddleware)

export default function MainLayout() {
  const user = useLoaderData<typeof loader>()

  return (
    <AppProvider initialUser={user}>
      <Outlet />
    </AppProvider>
  )
}
