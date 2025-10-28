import { isAuthenticated } from '@/modules/cookie/session.server';
import { paths } from '@/utils/config/paths.config';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  return isAuthenticated(request, paths.home);
}
