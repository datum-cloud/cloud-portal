import { NextFunction } from './middleware'
import { isAuthenticated } from '@/modules/auth/auth.server'

export async function authMiddleware(
  request: Request,
  next: NextFunction,
): Promise<Response> {
  const creds = await isAuthenticated(request)

  if (creds) {
    return next()
  }

  return creds
}
