import { paths } from '@/config/paths';
import { isAuthenticated } from '@/modules/cookie/session.server';
import { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  return isAuthenticated(request, paths.home);
}
