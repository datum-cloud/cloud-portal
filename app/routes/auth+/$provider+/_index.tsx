import { authenticator } from '@/modules/auth/auth.server'
import type { ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { routes } from '@/constants/routes'

export async function loader() {
  return redirect(routes.auth.signIn)
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (typeof params.provider !== 'string') throw new Error('Invalid provider.')
  return authenticator.authenticate(params.provider, request)
}
