import { routes } from '@/constants/routes';
import { isAuthenticated } from '@/modules/cookie/session.server';
import { mergeMeta, metaObject } from '@/utils/meta';
import { LoaderFunctionArgs, MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject(
    'Signup for Datum - A network cloud you can take anywhere',
    'We help developers run network workloads anywhere and programmatically connect their ecosystem.'
  );
});

export async function loader({ request }: LoaderFunctionArgs) {
  return isAuthenticated(request, routes.home);
}

/* export default function Signup() {
  return <AuthCard mode="signup" />
}
 */
