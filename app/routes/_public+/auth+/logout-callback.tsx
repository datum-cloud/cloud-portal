import { destroyLocalSessions } from '@/utils/session'
import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

export async function action({ request, context }: ActionFunctionArgs) {
  return destroyLocalSessions(request, context)
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  return destroyLocalSessions(request, context)
}
