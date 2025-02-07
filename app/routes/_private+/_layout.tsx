import { authMiddleware } from '@/modules/middleware/auth-middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { Outlet, useLoaderData, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { AxiosError } from 'axios'
import { userGql } from '@/resources/gql/user.gql'
import { getSession } from '@/modules/auth/auth-session.server'
import { organizationGql } from '@/resources/gql/organization.gql'
import { UserModel } from '@/resources/gql/models/user.model'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { AppProvider } from '@/providers/app.provider'
export const loader = withMiddleware(async ({ request }) => {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    const userId = session.get('userId')
    const defaultOrgId = session.get('defaultOrgId')

    // Get user info
    const user: UserModel = await userGql.getUserProfile(userId, request)
    const org: OrganizationModel = await organizationGql.getOrganizationDetail(
      defaultOrgId,
      request,
    )

    return { user, org }
  } catch (error) {
    // TODO: implement best practices for error handle
    if (
      error instanceof AxiosError &&
      error.response &&
      error.response.status >= 400 &&
      error.response.status < 500
    ) {
      return redirect(routes.auth.signOut)
    }
    throw error
  }
}, authMiddleware)

export default function PrivateLayout() {
  const { user, org } = useLoaderData<typeof loader>()

  return (
    <AppProvider initialUser={user} initialOrganization={org}>
      <Outlet />
    </AppProvider>
  )
}
