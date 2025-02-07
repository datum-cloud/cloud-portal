import { redirect } from 'react-router';
import { getCredentials } from '@/modules/auth/auth.server'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
import { NextFunction } from './middleware'

export async function authenticateSession(
  request: Request,
  next: NextFunction,
): Promise<Response> {
  const credentials = await getCredentials(request)

  if (!credentials) {
    const session = await getSession(request.headers.get('Cookie'))
    const url = new URL(request.url)
    return redirect(
      `${routes.auth.signIn}?redirectTo=${encodeURIComponent(url.pathname)}`,
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      },
    )
  }

  return next()
}
