import { authenticator } from '@/modules/auth/auth.server'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  return authenticator.authenticate('oidc', request)
}

export async function action({ request }: ActionFunctionArgs) {
  return authenticator.authenticate('oidc', request)
}
