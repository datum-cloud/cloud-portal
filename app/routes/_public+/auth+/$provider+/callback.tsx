import { authenticator } from '@/modules/auth/auth.server'
import { AppLoadContext, LoaderFunctionArgs, redirect } from 'react-router'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/authSession.server'
import { combineHeaders } from '@/utils/misc.server'
import { redirectWithToast } from '@/utils/toast.server'
import { CustomError } from '@/utils/errorHandle'

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { authApi } = context as AppLoadContext

  try {
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
      throw new CustomError('Invalid authentication provider', 400)
    }

    // Authenticate user
    const credentials = await authenticator.authenticate(params.provider, request)
    if (!credentials) {
      throw new CustomError('Authentication failed', 401)
    }

    // Get and store tokens
    const { access_token: controlPlaneToken } = await authApi.getExchangeToken(
      credentials.accessToken,
    )

    session.set('accessToken', credentials.accessToken)
    session.set('controlPlaneToken', controlPlaneToken)
    session.set('userId', credentials.userId)
    session.set('currentOrgId', credentials.defaultOrgId)

    return redirect(routes.home, {
      headers: combineHeaders({ 'Set-Cookie': await commitSession(session) }),
    })
  } catch (error) {
    return redirectWithToast(routes.auth.logIn, {
      title: 'Authentication failed',
      description:
        (error as Error).message || 'Something went wrong with callback from provider',
      type: 'error',
    })
  }
}
