import { authenticator } from '@/modules/auth/auth.server'
import { LoaderFunctionArgs, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
import { authApi } from '@/resources/api/auth'
import { combineHeaders } from '@/utils/misc.server'
import { createToastHeaders } from '@/utils/toast.server'

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
    session.set('defaultOrgId', credentials.defaultOrgId)

    // TODO: Check if the organization has a project.
    // If not, redirect to the project creation page and hide the sidebar.
    // If yes, redirect to the home page.
    const hasProject = false

    const redirectPath = hasProject ? routes.home : `${routes.projects.new}?sidebar=false`

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
    if (error instanceof Error) {
      // here the error related to the authentication process
      throw new Error(error.message ?? 'Authentication Callback failed')
    }

    throw error // Re-throw other values or unhandled errors
  }
}
