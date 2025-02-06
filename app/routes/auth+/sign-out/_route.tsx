import type { ActionFunctionArgs } from '@remix-run/node'
import { destroySession, getSession } from '@/modules/auth/auth-session.server'
import { redirect } from '@remix-run/router'
import { routes } from '@/constants/routes'

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('cookie'))
  return redirect(routes.auth.signIn, {
    headers: { 'Set-Cookie': await destroySession(session) },
  })
}

export async function loader() {
  return redirect(routes.auth.signIn)
}
