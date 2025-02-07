import { authenticator } from '@/modules/auth/auth.server'
import { LoaderFunctionArgs, redirect } from 'react-router';
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    // check if the user is already authenticated
    const credsSession = session.get('credentials')
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

    session.set('credentials', credentials)

    return redirect(routes.home, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      // here the error related to the authentication process
      throw new Error(error.message ?? 'Authentication Callback failed')
    }

    throw error // Re-throw other values or unhandled errors
  }
}
