import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { destroySession, getSession } from '@/modules/auth/authSession.server'
import { redirect } from 'react-router'
import { routes } from '@/constants/routes'

export const ROUTE_PATH = '/api/sign-out'

const signOut = async (request: Request) => {
  const session = await getSession(request.headers.get('cookie'))
  return redirect(routes.auth.signIn, {
    headers: { 'Set-Cookie': await destroySession(session) },
  })
}

export async function action({ request }: ActionFunctionArgs) {
  return signOut(request)
}

export async function loader({ request }: LoaderFunctionArgs) {
  return signOut(request)
}
