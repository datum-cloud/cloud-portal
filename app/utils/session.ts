import { routes } from '@/constants/routes'
import { destroyIdTokenSession } from '@/modules/cookie/id-token.server'
import { destroyOrgSession } from '@/modules/cookie/org.server'
import { destroySession } from '@/modules/cookie/session.server'
import { combineHeaders } from '@/utils/misc'
import { AppLoadContext, redirect } from 'react-router'

export const destroyLocalSessions = async (request: Request, context: AppLoadContext) => {
  const { cache } = context
  await cache.clear()

  const { headers: sessionHeaders } = await destroySession(request)
  const { headers: orgHeaders } = await destroyOrgSession(request)
  const { headers: idTokenHeaders } = await destroyIdTokenSession(request)

  return redirect(routes.auth.logIn, {
    headers: combineHeaders(sessionHeaders, orgHeaders, idTokenHeaders),
  })
}
