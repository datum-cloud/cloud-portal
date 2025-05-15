import { routes } from '@/constants/routes'
import { authenticator } from '@/modules/auth/auth.server'
import { destroyAuthSession } from '@/modules/cookie/auth.server'
import { destroyOrgSession } from '@/modules/cookie/org.server'
import { destroyUserSession } from '@/modules/cookie/user.server'
import { combineHeaders } from '@/utils/misc'
import type { ActionFunctionArgs, AppLoadContext } from 'react-router'
import { LoaderFunctionArgs, redirect } from 'react-router'

const signOut = async (request: Request) => {
  // Do OIDC Logout
  const res = await authenticator.get('oidc')
  console.log(res)

  const { headers: authHeaders } = await destroyAuthSession(request)
  const { headers: orgHeaders } = await destroyOrgSession(request)
  const { headers: userHeaders } = await destroyUserSession(request)

  // revoke oidc session

  return redirect(routes.auth.logIn, {
    headers: combineHeaders(authHeaders, orgHeaders, userHeaders),
  })
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
