import { authenticator } from '@/modules/auth/auth.server'
import { LoaderFunctionArgs, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
import { authApi } from '@/resources/api/auth.api'
import { combineHeaders } from '@/utils/misc.server'
import { createToastHeaders } from '@/utils/toast.server'
import { organizationGql } from '@/resources/gql/organization.gql'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { getPathWithParams } from '@/utils/path'
import { differenceInMinutes } from 'date-fns'

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

  session.set('currentOrgId', org.id)
  session.set('currentOrgEntityID', org.userEntityID)

  try {
    // Check for existing projects
    await projectsControl.setToken(request, controlPlaneToken)
    const projects = await projectsControl.getProjects(org.userEntityID)

    // Determine redirect path based on project existence
    const redirectPath =
      projects.length > 0
        ? getPathWithParams(routes.projects.root, { orgId: org.id })
        : `${getPathWithParams(routes.projects.new, { orgId: org.id })}?sidebar=false`

    // Redirect with success toast
    return redirect(redirectPath, {
      headers: combineHeaders(
        { 'Set-Cookie': await commitSession(session) },
        await createToastHeaders({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        }),
      ),
    })
  } catch (error) {
    // Handle new account setup
    // TODO: this is temporary solution for handle delay when create a account for the first time
    // https://github.com/datum-cloud/cloud-portal/issues/43
    // Check if the organization created at is under 2 minute

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).response?.status === 403) {
      const isNewAccount = differenceInMinutes(new Date(), new Date(org.createdAt)) < 2

      if (isNewAccount) {
        return redirect(getPathWithParams(routes.auth.setup), {
          headers: {
            'Set-Cookie': await commitSession(session),
          },
        })
      }
    }

    throw error
  }
}

export default function CallbackPage() {
  return <div>Callback</div>
}
