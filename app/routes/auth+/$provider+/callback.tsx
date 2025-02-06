import { authenticator } from '@/modules/auth/auth.server'
import { LoaderFunctionArgs, redirect } from '@remix-run/node'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const session = await getSession(request.headers.get('Cookie'))
    // check if the user is already authenticated
    const userSession = session.get('user')
    if (userSession) {
      throw redirect(routes.home, {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      })
    }

    if (typeof params.provider !== 'string') throw new Error('Invalid provider.')

    const user = await authenticator.authenticate(params.provider, request)

    if (!user) {
      throw new Error('Authentication failed')
    }

    session.set('user', user)

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
