import { authenticator } from '@/modules/auth/auth.server'
import { LoaderFunctionArgs, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
import { authApi } from '@/resources/api/auth.api'
import { combineHeaders } from '@/utils/misc.server'
import { organizationGql } from '@/resources/gql/organization.gql'
import { getPathWithParams } from '@/utils/path'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  // Redirect if already authenticated
  if (userId) {
    return redirect(routes.home, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }

  // Validate provider param
  if (typeof params.provider !== 'string') {
    throw new Error('Invalid authentication provider')
  }

  // Authenticate user
  const credentials = await authenticator.authenticate(params.provider, request)
  if (!credentials) {
    throw new Error('Authentication failed')
  }

  // Get and store tokens
  const { access_token: controlPlaneToken } = await authApi.getExchangeToken(
    credentials.accessToken,
  )

  session.set('accessToken', credentials.accessToken)
  session.set('controlPlaneToken', controlPlaneToken)
  session.set('userId', credentials.userId)

  // Get organization details
  await organizationGql.setToken(request, credentials.accessToken)
  const org = await organizationGql.getOrganizationDetail(credentials.defaultOrgId)

  // Update the current organization in session
  session.set('currentOrgId', org.id)
  session.set('currentOrgEntityID', org.userEntityID)

  // TODO: change to the org root when the dashboard is ready
  // Redirect to the Projects root
  return redirect(getPathWithParams(routes.projects.root, { orgId: org.id }), {
    headers: combineHeaders({ 'Set-Cookie': await commitSession(session) }),
  })
}
