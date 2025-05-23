import { routes } from '@/constants/routes'
import { OAuth2Strategy } from '@/modules/auth/oauth'
import { destroyAuthSession, getAuthSession } from '@/modules/cookie/auth.server'
import { destroyOrgSession } from '@/modules/cookie/org.server'
import { destroyUserSession } from '@/modules/cookie/user.server'
import { combineHeaders } from '@/utils/misc'
import type { ActionFunctionArgs, AppLoadContext } from 'react-router'
import { LoaderFunctionArgs, redirect } from 'react-router'

const destroySessions = async (request: Request) => {
  const { headers: authHeaders } = await destroyAuthSession(request)
  const { headers: orgHeaders } = await destroyOrgSession(request)
  const { headers: userHeaders } = await destroyUserSession(request)

  return redirect(routes.auth.logIn, {
    headers: combineHeaders(authHeaders, orgHeaders, userHeaders),
  })
}

const signOut = async (request: Request) => {
  try {
    const { session } = await getAuthSession(request)

    if (session?.accessToken) {
      await OAuth2Strategy.revokeToken(session.accessToken)
    }

    return destroySessions(request)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return destroySessions(request)
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { cache } = context as AppLoadContext
  await cache.clear()

  return signOut(request)
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { cache } = context as AppLoadContext
  await cache.clear()

  return signOut(request)
}
