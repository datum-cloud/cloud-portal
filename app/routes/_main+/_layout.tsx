import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { Outlet, useLoaderData } from 'react-router'
import { routes } from '@/constants/routes'
import { userGql } from '@/resources/gql/user.gql'
import { getSession } from '@/modules/auth/auth-session.server'
import { UserModel } from '@/resources/gql/models/user.model'
import { AppProvider } from '@/providers/app.provider'

import { redirectWithToast } from '@/utils/toast.server'

export const loader = withMiddleware(async ({ request }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    const userId = session.get('userId')

    // Get user info
    const user: UserModel = await userGql.getUserProfile(userId, request)

    return { user }
  } catch (error) {
    // TODO: implement best practices for error handle
    if (error instanceof Response && error.status === 401) {
      return redirectWithToast(routes.auth.signOut, {
        title: 'Session Expired!',
        description: 'Please sign in again to continue.',
      })
    }

    throw new Response('Something went wrong', {
      status: 500,
      statusText: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}, authMiddleware)

export default function MainLayout() {
  const { user } = useLoaderData<typeof loader>()

  return (
    <AppProvider initialUser={user}>
      <Outlet />
    </AppProvider>
  )
}
