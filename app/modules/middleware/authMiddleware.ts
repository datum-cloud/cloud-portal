import { NextFunction } from './middleware'
import { routes } from '@/constants/routes'
import { isAuthenticated } from '@/modules/auth/auth.server'
import { getAuthSession } from '@/modules/cookie/auth.server'
import { redirect } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'

export async function authMiddleware(
  request: Request,
  next: NextFunction,
): Promise<Response> {
  const creds = await isAuthenticated(request)

  if (!creds) {
    const { headers } = await getAuthSession(request)
    return redirect(safeRedirect(`${routes.auth.logIn}`), {
      headers,
    })
  }

  return next()
}
