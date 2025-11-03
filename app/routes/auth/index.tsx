import { paths } from '@/utils/config/paths.config';
import { isAuthenticated } from '@/utils/cookies';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  return isAuthenticated(request, paths.home);
}
