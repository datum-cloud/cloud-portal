import { destroyLocalSessions } from '@/utils/session';
import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

export async function action({ request }: ActionFunctionArgs) {
  return destroyLocalSessions(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return destroyLocalSessions(request);
}
