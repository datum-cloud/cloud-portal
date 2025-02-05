import { authenticator } from '@/modules/auth/auth.server'
import { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
export async function loader({ request, params }: LoaderFunctionArgs) {
  if (typeof params.provider !== 'string') throw new Error('Invalid provider.')

  const user = await authenticator.authenticate(params.provider, request)
  return { ...user }
}
