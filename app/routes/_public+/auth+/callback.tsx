import { routes } from '@/constants/routes'
import { authenticator } from '@/modules/auth/auth.server'
import { commitAuthSession, getAuthSession } from '@/modules/auth/authSession.server'
import { CustomError } from '@/utils/errorHandle'
import { redirectWithToast } from '@/utils/toast.server'
import { LoaderFunctionArgs, data, redirect } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getAuthSession(request.headers.get('Cookie'))
    const sessionData = session.get('session')

    // Redirect if already authenticated
    if (sessionData) {
      return redirect(routes.home, {
        headers: {
          'Set-Cookie': await commitAuthSession(session),
        },
      })
    }

    // Authenticate user
    const credentials = await authenticator.authenticate('oidc', request)
    if (!credentials) {
      throw new CustomError('Authentication failed', 401)
    }

    console.log(credentials)

    const { user, ...rest } = credentials

    session.set('user', user)
    session.set('session', rest)

    // TODO: Get Default Organization
    // session.set('currentOrgId', credentials.user.sub)

    return data(credentials)
    // return redirect(routes.home, {
    //   headers: combineHeaders({ 'Set-Cookie': await commitAuthSession(session) }),
    // })
  } catch (error) {
    return redirectWithToast(routes.auth.logIn, {
      title: 'Authentication failed',
      description:
        (error as Error).message || 'Something went wrong with callback from provider',
      type: 'error',
    })
  }
}
