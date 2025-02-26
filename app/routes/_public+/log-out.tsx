import { routes } from '@/constants/routes'
import { destroySession, getSession } from '@/modules/auth/authSession.server'
import type { ActionFunctionArgs, AppLoadContext } from 'react-router'
import { LoaderFunctionArgs, redirect } from 'react-router'

const signOut = async (request: Request) => {
  const session = await getSession(request.headers.get('cookie'))
  return redirect(routes.auth.logIn, {
    headers: { 'Set-Cookie': await destroySession(session) },
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
