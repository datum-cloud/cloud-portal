import { authenticator } from '@/modules/auth/auth.server'
import { LoaderFunctionArgs, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
import { authApi } from '@/resources/api/auth.api'
import { combineHeaders } from '@/utils/misc.server'
import { createToastHeaders } from '@/utils/toast.server'
import { organizationGql } from '@/resources/gql/organization.gql'
import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { getPathWithParams } from '@/utils/path'

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    // check if the user is already authenticated
    const credsSession = session.get('userId')
    if (credsSession) {
      throw redirect(routes.home, {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      })
    }

    if (typeof params.provider !== 'string') throw new Error('Invalid provider.')

    const credentials = await authenticator.authenticate(params.provider, request)

    if (!credentials) {
      throw new Error('Authentication failed')
    }

    // Get Control Plane Token from Exchange Token
    const exchangeToken = await authApi.getExchangeToken(credentials.accessToken)

    session.set('accessToken', credentials.accessToken)
    session.set('controlPlaneToken', exchangeToken.access_token)
    session.set('userId', credentials.userId)

    // Get the default organization id based on the user's default org id
    await organizationGql.setToken(request, credentials.accessToken)
    const org: OrganizationModel = await organizationGql.getOrganizationDetail(
      credentials.defaultOrgId,
    )
    // Set current organization in session
    session.set('currentOrgId', org.id)
    session.set('currentOrgEntityID', org.userEntityID)

    // Check if the organization has a project.
    // If not, redirect to the project creation page and hide the sidebar.
    // If yes, redirect to the home page.
    await projectsControl.setToken(request, exchangeToken.access_token)
    const projects: IProjectControlResponse[] = await projectsControl.getProjects(
      org.userEntityID,
    )
    const hasProject = projects.length > 0

    // Redirect to the home page if the organization has a project.
    // Otherwise, redirect to the project creation page and hide the sidebar.

    const redirectPath = hasProject
      ? getPathWithParams(routes.org.root, { orgId: org.id })
      : `${getPathWithParams(routes.projects.new, { orgId: org.id })}?sidebar=false`

    return redirect(redirectPath, {
      headers: combineHeaders(
        {
          'Set-Cookie': await commitSession(session),
        },
        await createToastHeaders({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        }),
      ),
    })
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      // here the error related to the authentication process
      throw new Error(error.message ?? 'Authentication Callback failed')
    }

    throw error // Re-throw other values or unhandled errors
  }
}
