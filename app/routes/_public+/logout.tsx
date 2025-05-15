import { routes } from '@/constants/routes'
import { authenticator } from '@/modules/auth/auth.server'
import { destroyAuthSession, getAuthSession } from '@/modules/cookie/auth.server'
import { destroyOrgSession } from '@/modules/cookie/org.server'
import { redirectWithToast } from '@/modules/cookie/toast.server'
import { destroyUserSession } from '@/modules/cookie/user.server'
import { combineHeaders } from '@/utils/misc'
import type { ActionFunctionArgs, AppLoadContext } from 'react-router'
import { LoaderFunctionArgs, redirect } from 'react-router'
import { OIDCStrategy } from 'remix-auth-openid'

const signOut = async (request: Request) => {
  try {
    const res = await authenticator.get('oidc')
    const { session } = await getAuthSession(request)

    // OIDC Logout
    if (session?.idToken) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oidcLogout = await (res as OIDCStrategy<any>).postLogoutUrl(session?.idToken)

      if (oidcLogout.ok) {
        // Destroy sessions
        const { headers: authHeaders } = await destroyAuthSession(request)
        const { headers: orgHeaders } = await destroyOrgSession(request)
        const { headers: userHeaders } = await destroyUserSession(request)

        return redirect(routes.auth.logIn, {
          headers: combineHeaders(authHeaders, orgHeaders, userHeaders),
        })
      }
    }

    return redirectWithToast(routes.home, {
      title: 'Logout',
      description: 'Logout failed',
      type: 'error',
    })
  } catch (error) {
    return redirectWithToast(routes.home, {
      title: 'Logout failed',
      description: (error as Error).message,
      type: 'error',
    })
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
