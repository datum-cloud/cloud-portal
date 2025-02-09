import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { Outlet, useLoaderData, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { AxiosError } from 'axios'
import { userGql } from '@/resources/gql/user.gql'
import { getSession } from '@/modules/auth/auth-session.server'
import { UserModel } from '@/resources/gql/models/user.model'
import { AppProvider } from '@/providers/app.provider'
import { OrganizationModel } from '@/resources/gql/models/organization.model'

export const loader = withMiddleware(async ({ request }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    const userId = session.get('userId')

    // Get current organization
    const org: OrganizationModel = session.get('currentOrg')

    // Get user info
    const user: UserModel = await userGql.getUserProfile(userId, request)

    return { user, org }
  } catch (error) {
    // TODO: implement best practices for error handle
    if (error instanceof Error) {
      const errorMessage = error.message
      const isAuthError =
        errorMessage.includes('status 401') ||
        errorMessage.includes('status 403') ||
        (error instanceof AxiosError && error.response?.status === 401)

      if (isAuthError) {
        return redirect(routes.auth.signOut)
      }
    }

    throw new Response('Something went wrong', {
      status: 500,
      statusText: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}, authMiddleware)

export default function MainLayout() {
  const { user, org } = useLoaderData<typeof loader>()

  return (
    <AppProvider initialUser={user} initialOrganization={org}>
      <Outlet />
    </AppProvider>
  )
}
