import type { ActionFunctionArgs } from 'react-router'
import { destroySession, getSession } from '@/modules/auth/auth-session.server'
import { LoaderFunctionArgs, redirect } from 'react-router'
import { routes } from '@/constants/routes'

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('cookie'))
  return redirect(routes.auth.signIn, {
    headers: { 'Set-Cookie': await destroySession(session) },
  })
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('cookie'))
  return redirect(routes.auth.signIn, {
    headers: { 'Set-Cookie': await destroySession(session) },
  })
}
