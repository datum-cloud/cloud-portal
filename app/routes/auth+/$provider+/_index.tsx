import { authenticator } from '@/modules/auth/auth.server'
import type { ActionFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { routes } from '@/constants/routes'

export async function loader() {
  return redirect(routes.auth.signIn)
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (typeof params.provider !== 'string') throw new Error('Invalid provider.')
  return authenticator.authenticate(params.provider, request)
}
