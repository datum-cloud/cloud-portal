import { paths } from '@/config/paths';
import { isAuthenticated } from '@/modules/cookie/session.server';
import { mergeMeta, metaObject } from '@/utils/meta';
import { LoaderFunctionArgs, MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject(
    'Log in to Datum - A network cloud you can take anywhere',
    'Run network workloads anywhere and programmatically connect to your unique ecosystem.'
  );
});

export async function loader({ request }: LoaderFunctionArgs) {
  return isAuthenticated(request, paths.home);
}

/* export default function Login() {
  return <AuthCard mode="login" />
} */
