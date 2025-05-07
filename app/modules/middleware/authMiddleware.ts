import { NextFunction } from './middleware'
import { routes } from '@/constants/routes'
import { isAuthenticated } from '@/modules/auth/auth.server'
import { commitAuthSession, getAuthSession } from '@/modules/auth/authSession.server'
import { redirect } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'

export async function authMiddleware(
  request: Request,
  next: NextFunction,
): Promise<Response> {
  const creds = await isAuthenticated(request)

  if (!creds) {
    const session = await getAuthSession(request.headers.get('Cookie'))
    // const url = new URL(
    //   request.url,
    // )`${routes.auth.logIn}?redirectTo=${encodeURIComponent(url.pathname)}`
    return redirect(safeRedirect(`${routes.auth.logIn}`), {
      headers: {
        'Set-Cookie': await commitAuthSession(session),
      },
    })
  }

  return next()
}
