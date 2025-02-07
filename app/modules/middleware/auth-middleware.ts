import { redirect } from 'react-router'
import { isAuthenticated } from '@/modules/auth/auth.server'
import { routes } from '@/constants/routes'
import { commitSession, getSession } from '@/modules/auth/auth-session.server'
import { NextFunction } from './middleware'

export async function authMiddleware(
  request: Request,
  next: NextFunction,
): Promise<Response> {
  const creds = await isAuthenticated(request)

  if (!creds) {
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
